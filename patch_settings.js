import fs from 'fs';
const f = 'frontend/js/settings-service.js';
let content = fs.readFileSync(f, 'utf8');
content = content.replace("default_provider: 'demo'", "default_provider: 'gemini'");
fs.writeFileSync(f, content);
console.log("Patched settings-service.js");
