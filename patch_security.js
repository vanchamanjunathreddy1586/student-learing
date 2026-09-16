import fs from 'fs';
const file = 'server/routes/diary.js';
let content = fs.readFileSync(file, 'utf8');

// Fix generic login error messages
content = content.replace(
  `if (acc.email !== email) return res.status(401).json({ error: 'Incorrect Diary email.' });`,
  `if (acc.email !== email) return res.status(401).json({ error: 'Invalid Diary credentials.' });`
);

content = content.replace(
  `return res.status(401).json({ error: 'Incorrect Diary password.' });`,
  `return res.status(401).json({ error: 'Invalid Diary credentials.' });`
);

// Prevent innerHTML XSS in frontend/js/diary.js
const jsFile = 'frontend/js/diary.js';
let jsContent = fs.readFileSync(jsFile, 'utf8');
if (jsContent.includes(`contentEditor.innerHTML = entry.content || '';`)) {
  jsContent = jsContent.replace(
    `contentEditor.innerHTML = entry.content || '';`,
    `contentEditor.textContent = entry.content || '';`
  );
  fs.writeFileSync(jsFile, jsContent);
}

fs.writeFileSync(file, content);
console.log("Patched security flaws.");
