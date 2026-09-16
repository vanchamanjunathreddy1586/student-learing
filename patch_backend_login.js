import fs from 'fs';
const file = 'server/routes/diary.js';
let content = fs.readFileSync(file, 'utf8');

const target = `const { email, password } = req.body;`;
const addition = `\n  const { pin } = req.body;`;

if (content.includes(target) && !content.includes('const { pin } = req.body;')) {
  // First, add pin extraction
  content = content.replace(target, target + addition);
  
  // Now add PIN verification logic
  const isMatchTarget = `const isMatch = await bcrypt.compare(password, acc.password_hash);`;
  const pinVerification = `
  const isPinMatch = await bcrypt.compare(pin, acc.pin_hash);
  const isMatch = (await bcrypt.compare(password, acc.password_hash)) && isPinMatch;
  `;
  
  content = content.replace(isMatchTarget, pinVerification);
  
  fs.writeFileSync(file, content);
  console.log("Patched server/routes/diary.js");
} else {
  console.log("Could not find target or already patched.");
}
