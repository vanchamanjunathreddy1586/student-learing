import fs from 'fs';
const htmlFile = 'frontend/diary.html';
let htmlContent = fs.readFileSync(htmlFile, 'utf8');

if (!htmlContent.includes('dompurify')) {
  htmlContent = htmlContent.replace(
    `</head>`,
    `  <script src="https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.0.8/purify.min.js"></script>\n</head>`
  );
  fs.writeFileSync(htmlFile, htmlContent);
}

const jsFile = 'frontend/js/diary.js';
let jsContent = fs.readFileSync(jsFile, 'utf8');
if (jsContent.includes(`contentEditor.textContent = entry.content || '';`)) {
    jsContent = jsContent.replace(
      `contentEditor.textContent = entry.content || '';`,
      `contentEditor.innerHTML = DOMPurify.sanitize(entry.content || '');`
    );
} else if (jsContent.includes(`contentEditor.innerHTML = entry.content || '';`)) {
    jsContent = jsContent.replace(
      `contentEditor.innerHTML = entry.content || '';`,
      `contentEditor.innerHTML = DOMPurify.sanitize(entry.content || '');`
    );
}

fs.writeFileSync(jsFile, jsContent);
console.log("Patched DOMPurify");
