import fs from 'fs';
let content = fs.readFileSync('frontend/owner.html', 'utf8');

content = content.replace(
  'body {',
  'html[data-theme] body, body {'
).replace(
  'background-color: var(--occ-bg);',
  'background-color: var(--occ-bg) !important;\n      background: var(--occ-bg) !important;'
);

fs.writeFileSync('frontend/owner.html', content, 'utf8');
