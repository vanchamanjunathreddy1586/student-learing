import fs from 'fs';
const file = 'frontend/js/diary-login.js';
let content = fs.readFileSync(file, 'utf8');

const target = `const password = document.getElementById('login-password').value;`;
const addition = `\n      const pin = document.getElementById('login-pin').value;`;

if (content.includes(target) && !content.includes('login-pin')) {
  content = content.replace(target, target + addition);
  
  // Replace the fetch call to include pin
  content = content.replace(
    `body: JSON.stringify({ email, password })`,
    `body: JSON.stringify({ email, password, pin })`
  );
  
  fs.writeFileSync(file, content);
  console.log("Patched diary-login.js");
} else {
  console.log("Could not find target in JS or already patched.");
}
