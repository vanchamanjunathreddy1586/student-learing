import fs from 'fs';
const f = 'frontend/diary.html';
let content = fs.readFileSync(f, 'utf8');
content = content.replace(/height:100vh;/g, 'height:100dvh;');
fs.writeFileSync(f, content);
console.log("Patched 100vh -> 100dvh");
