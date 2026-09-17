import fs from 'fs';
let content = fs.readFileSync('server/index.js', 'utf8');
content = content.replace(
  /app\.get\('\/api\/health', \(_request, response\) => {/g,
  "app.get(['/api/health', '/health'], (_request, response) => {"
);
fs.writeFileSync('server/index.js', content, 'utf8');
