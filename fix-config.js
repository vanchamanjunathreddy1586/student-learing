import fs from 'fs';
let content = fs.readFileSync('server/index.js', 'utf8');
content = content.replace(
  /app\.get\('\/api\/config', \(_request, response\) => {/g,
  "app.get(['/api/config', '/config'], (_request, response) => {"
);
fs.writeFileSync('server/index.js', content, 'utf8');
