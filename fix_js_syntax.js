import fs from 'fs';
const file = 'frontend/js/ai-teacher.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace("typingWrapper.innerHTML = \\`", "typingWrapper.innerHTML = `");
content = content.replace("</div>\\`", "</div>`");
content = content.replace("</div>\n  \\`;", "</div>\n  `;");
// Catch any remaining \`
content = content.replace(/\\`/g, "`");

fs.writeFileSync(file, content);
console.log("Fixed syntax error");
