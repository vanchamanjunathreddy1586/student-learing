import fs from 'fs';
let content = fs.readFileSync('frontend/js/app.js', 'utf8');
const searchString = "const toast = document.querySelector('#toast');";
const index = content.indexOf(searchString);
if (index === -1) throw new Error('Not found');

const replacement = fs.readFileSync('replacement.js', 'utf8');
const newContent = replacement + '\n\n' + content.substring(index);
fs.writeFileSync('frontend/js/app.js', newContent, 'utf8');
