const apiKey = "API KEY HERE"; // Replace with OpenAI API key

const form = document.getElementById("chat-form");
const fileInput = document.getElementById("file-input");
const folderInput = document.getElementById("folder-input");
const outputElem = document.getElementById("output");
const modeRadios = document.getElementsByName("upload-mode");
const employeeSearch = document.getElementById("employee-search");

function updateFileLabel() {
  const isFileMode = document.querySelector('input[name="upload-mode"]:checked').value === "file";

  document.getElementById("file-label").classList.toggle("hidden", !isFileMode);
  document.getElementById("file-input").classList.toggle("hidden", !isFileMode);
  document.getElementById("file-input").required = isFileMode;

  document.getElementById("folder-label").classList.toggle("hidden", isFileMode);
  document.getElementById("folder-input").classList.toggle("hidden", isFileMode);
  document.getElementById("folder-input").required = !isFileMode;

  employeeSearch.classList.toggle("hidden", isFileMode);
}

modeRadios.forEach((radio) => {
  radio.addEventListener("change", updateFileLabel);
});
updateFileLabel();

fileInput.addEventListener("change", function () {
  document.getElementById("file-label").textContent = this.files[0] ? this.files[0].name : "Choose File";
});
folderInput.addEventListener("change", function () {
  document.getElementById("folder-label").textContent = this.files.length ? "Folder Selected" : "Choose Folder";
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  outputElem.textContent = "";

  const mode = Array.from(modeRadios).find((r) => r.checked)?.value || "file";

  if (mode === "file") {
    const file = fileInput?.files?.[0];
    if (!file) {
      outputElem.textContent = "Please select a file.";
      return;
    }
    await handleSingleFile(file);
  } else if (mode === "folder") {
    const files = Array.from(folderInput.files || []);
    if (!files.length) {
      outputElem.textContent = "Please select a folder.";
      return;
    }
    await handleFolder(files);
  }
});

async function processDocument(documentText) {
  console.log("Sending request to OpenAI...");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "Extract a list of employees and their roles (e.g., project manager, civil engineer, etc) from a project document. Return the list like:\n\nName - Role. If there are multiple projects, group each employee and list their project-role pairs under their name.",
        },
        {
          role: "user",
          content: documentText,
        },
      ],
      stream: true,
      max_tokens: 2048,
      temperature: 0.2,
    }),
  });

  console.log("OpenAI response status:", res.status, res.statusText);

  if (!res.ok) {
    outputElem.textContent = `Error: ${res.status} ${res.statusText}`;
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let outputBuffer = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const jsonData = line.replace("data:", "").trim();
        if (!jsonData || jsonData === "[DONE]") {
          outputElem.textContent = outputBuffer.trim();
          return;
        }
        try {
          const parsed = JSON.parse(jsonData);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            outputBuffer += delta;
            outputElem.textContent = outputBuffer;
          }
        } catch (err) {
          outputBuffer += `\n[Parse error: ${err.message}]\nRaw: ${jsonData}`;
          outputElem.textContent = outputBuffer;
        }
      }
    }
    outputElem.textContent = outputBuffer.trim();
  } catch (err) {
    outputElem.textContent = "Error: " + err.message;
  }
}

async function handleSingleFile(file) {
  outputElem.textContent = "";

  try {
    if (file.type === "text/plain" || file.name.endsWith(".txt")) {
      const text = await file.text();
      await processDocument(text);
    } else if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";

      const typedarray = new Uint8Array(await file.arrayBuffer());
      const pdf = await window.pdfjsLib.getDocument({ data: typedarray }).promise;

      let text = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map((item) => item.str).join(" ") + "\n";
      }

      if (!text || text.trim().length < 100) {
        outputElem.textContent = "Could not extract meaningful text from this file. It may be scanned, empty, or unreadable.";
        return;
      }

      await processDocument(text);
    } else if (
      file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      file.name.endsWith(".docx")
    ) {
      if (!window.mammoth) {
        outputElem.textContent = "Mammoth.js is not loaded. Please add it to your HTML.";
        return;
      }
      const arrayBuffer = await file.arrayBuffer();
      const result = await window.mammoth.extractRawText({ arrayBuffer });
      const text = result.value;
      if (!text || text.trim().length < 50) {
        outputElem.textContent = "Could not extract meaningful text from this DOCX file. It may be empty or unreadable.";
        return;
      }
      await processDocument(text);
    } else {
      outputElem.textContent = "Only TXT, PDF, and DOCX files are supported.";
    }
  } catch (err) {
    outputElem.textContent = "Error reading file: " + err.message;
  }
}

async function extractTextFromFile(file) {
  try {
    if (file.type === "text/plain" || file.name.endsWith(".txt")) {
      return await file.text();
    } else if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";
      const typedarray = new Uint8Array(await file.arrayBuffer());
      const pdf = await window.pdfjsLib.getDocument({ data: typedarray }).promise;
      let text = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map((item) => item.str).join(" ") + "\n";
      }
      return text;
    } else if (
      file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      file.name.endsWith(".docx")
    ) {
      if (!window.mammoth) return null;
      const arrayBuffer = await file.arrayBuffer();
      const result = await window.mammoth.extractRawText({ arrayBuffer });
      return result.value;
    }
  } catch (err) {
    return null;
  }
  return null;
}

async function handleFolder(files) {
  const supported = [".txt", ".pdf", ".docx"];
  const projectFiles = {};

  files.forEach((f) => {
    const ext = f.name.slice(f.name.lastIndexOf(".")).toLowerCase();
    if (!supported.includes(ext)) return;
    let project = "Unknown Project";
    if (f.webkitRelativePath) {
      const parts = f.webkitRelativePath.split("/");
      if (parts.length > 1) project = parts[1];
      else project = f.name;
    } else {
      project = f.name;
    }
    if (!projectFiles[project]) projectFiles[project] = [];
    projectFiles[project].push(f);
  });

  outputElem.textContent = "Analyzing all files, please wait...";

  const fileList = [];
  for (const [project, filesArr] of Object.entries(projectFiles)) {
    for (const file of filesArr) {
      fileList.push({ file });
    }
  }

  const extractedTexts = await Promise.all(
    fileList.map(async ({ file }) => {
      const content = await extractTextFromFile(file);
      return content && content.trim().length > 100 ? content : "";
    })
  );

  const filteredTexts = extractedTexts.filter(Boolean);
  if (!filteredTexts.length) {
    outputElem.textContent = "No meaningful data found in any files.";
    return;
  }

  const MAX_CHARS = 12000;
  const chunks = [];
  let current = "";
  for (const t of filteredTexts) {
    if (current.length + t.length > MAX_CHARS && current.length > 0) {
      chunks.push(current);
      current = "";
    }
    current += t + "\n\n";
  }
  if (current.length > 0) chunks.push(current);

  const totalChunks = chunks.length;
  let processedChunks = 0;

  let partialResults = [];
  for (let i = 0; i < chunks.length; i++) {
    const jsonArr = await extractPeopleProjectsRolesJSON(chunks[i]);
    if (Array.isArray(jsonArr) && jsonArr.length) partialResults.push(...jsonArr);
    processedChunks++;
    const percent = Math.round((processedChunks / totalChunks) * 100);
    outputElem.textContent = `Analyzing all files: ${percent}% complete`;
  }

  outputElem.textContent = "";

  const employeeNames = employeeSearch.value.trim();
  const employeeList = employeeNames
    ? employeeNames.split(",").map((n) => n.trim()).filter(Boolean)
    : [];

  const allJson = JSON.stringify(partialResults);
  await streamFinalGroupedSummary(allJson, employeeList);
}

async function extractPeopleProjectsRolesJSON(chunkText) {
  const prompt = `Extract all people, the projects they worked on, and their roles from the following project files. Respond ONLY with a JSON array of objects in the format: [{\"name\": \"Name\", \"project\": \"Project Name\", \"role\": \"Role\"}]. Do not include any explanation, notes, or extra text. If nothing is found, return an empty array [].\n\nINPUT:\n${chunkText}`;
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      stream: false,
      max_tokens: 2048,
      temperature: 0.2,
    }),
  });
  if (!res.ok) return [];
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || '';
  try {
    const match = text.match(/\[.*\]/s);
    if (match) return JSON.parse(match[0]);
  } catch (e) {}
  return [];
}

async function streamFinalGroupedSummary(allJson, employeeList) {
  let prompt = `Given the following extracted data from multiple project files (as a JSON array), produce a single summary grouped by person, listing all projects and roles for each person. Only include real people, not generic roles or teams. Format as:\n\nName\nProject 1 - role(s)\nProject 2 - role(s)\n...\n\nHere is the data:\n${allJson}`;
  if (employeeList.length > 0) {
    prompt = `Given the following extracted data from multiple project files (as a JSON array), produce a single summary grouped by person, listing all projects and roles for each person. Only include real people, not generic roles or teams. Only include the following employees (case-insensitive match): ${employeeList.join(", ")}. Format as:\n\nName\nProject 1 - role(s)\nProject 2 - role(s)\n...\n\nHere is the data:\n${allJson}`;
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      stream: true,
      max_tokens: 2048,
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    outputElem.textContent = `Error: ${res.status} ${res.statusText}`;
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let outputBuffer = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop();
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const jsonData = line.replace("data:", "").trim();
        if (!jsonData || jsonData === "[DONE]") {
          outputElem.textContent = outputBuffer.trim();
          return;
        }
        try {
          const parsed = JSON.parse(jsonData);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            outputBuffer += delta;
            outputElem.textContent = outputBuffer;
          }
        } catch (err) {
          outputElem.textContent += `\n[Parse error: ${err.message}]\nRaw: ${jsonData}`;
        }
      }
    }
    outputElem.textContent = outputBuffer.trim();
  } catch (err) {
    outputElem.textContent = "Error: " + err.message;
  }
}