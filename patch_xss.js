import fs from 'fs';
import path from 'path';

const escapeFn = `
function escapeHtml(unsafe) {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
`;

function processFile(file) {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('escapeHtml(') && !content.includes('function escapeHtml')) {
      content = escapeFn + content;
  }
  
  // Replace ${sub.name} with ${escapeHtml(sub.name)}
  // This is a bit manual, but safer
  const replacements = [
    { from: /\$\{sub\.name\}/g, to: '${escapeHtml(sub.name)}' },
    { from: /\$\{sub\.category\}/g, to: '${escapeHtml(sub.category)}' },
    { from: /\$\{t\.name\}/g, to: '${escapeHtml(t.name)}' },
    { from: /\$\{plan\.title\}/g, to: '${escapeHtml(plan.title)}' },
    { from: /\$\{grp\.name\}/g, to: '${escapeHtml(grp.name)}' },
    { from: /\$\{grp\.description\}/g, to: '${escapeHtml(grp.description)}' },
    { from: /\$\{n\.title\}/g, to: '${escapeHtml(n.title)}' }
  ];

  let modified = false;
  replacements.forEach(r => {
    if (content.match(r.from)) {
      content = content.replace(r.from, r.to);
      modified = true;
    }
  });

  if (modified) {
    if (!content.includes('function escapeHtml')) {
      content = escapeFn + content;
    }
    fs.writeFileSync(file, content, 'utf8');
    console.log("Patched XSS in", file);
  }
}

const dir = 'frontend/js';
fs.readdirSync(dir).forEach(file => {
  if (file.endsWith('.js')) {
    processFile(path.join(dir, file));
  }
});
