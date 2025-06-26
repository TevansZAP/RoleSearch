# Project Role Search

A modern web app for extracting and analyzing employee names and roles from uploaded TXT, PDF, and DOCX files using OpenAI’s GPT-4o API. Supports single file and folder uploads, employee search, and robust streaming output.

## Features

- Upload and analyze TXT, PDF, or DOCX files
- Upload entire folders (including subfolders)
- Extracts and groups employees and their project roles
- Search/filter by employee names in folder mode
- Modern, responsive UI
- Uses OpenAI GPT-4o for analysis (API key required)
- Supports streaming output for fast feedback

## Getting Started

1. **Clone or download this repository.**
2. **Set your OpenAI API key:**  
   Replace the `apiKey` value at the top of `script.js` with your own OpenAI API key.
3. **Open `index.html` in your browser.**

## Usage

- Select “Upload one file” or “Upload a folder.”
- Choose your file(s) or folder.
- (Optional) Enter employee names to filter results (folder mode).
- Click “Analyze.”
- View extracted employee/project/role data in the output area.

## Requirements

- Modern web browser (Chrome, Edge, Firefox, Safari)
- OpenAI API key with access to GPT-4o

## File Structure

- `index.html` – Main UI
- `styles.css` – App styling
- `script.js` – App logic and OpenAI API integration

## Security

**Do not share your OpenAI API key publicly.**  
This app runs entirely in your browser; your key is never sent to a server.