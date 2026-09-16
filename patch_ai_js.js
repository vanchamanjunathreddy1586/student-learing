import fs from 'fs';

const file = 'server/routes/ai.js';
let content = fs.readFileSync(file, 'utf8');

// Replace default provider logic
content = content.replace(/provider = 'demo'/g, "provider = process.env.GEMINI_API_KEY ? 'gemini' : (process.env.OPENAI_API_KEY ? 'openai' : 'ollama')");

fs.writeFileSync(file, content);
console.log("Updated ai.js defaults");
