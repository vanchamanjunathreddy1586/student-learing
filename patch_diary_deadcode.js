import fs from 'fs';

const filePath = 'frontend/js/diary.js';
let content = fs.readFileSync(filePath, 'utf8');

// The block we want to remove starts near "let pinMode = 'verify';" and goes all the way through the giant "if (unlockBtn)" block.
// Instead of complex regex, let's just find and replace the known blocks or replace them with empty strings.

// 1. Remove the DOM elements that don't exist
content = content.replace(/const lockTitle = document\.getElementById\('lock-title'\);\s*const lockSubtitle = document\.getElementById\('lock-subtitle'\);\s*const unlockBtn = document\.getElementById\('unlock-btn'\);\s*const cancelPinBtn = document\.getElementById\('cancel-pin-btn'\);\s*const forgotPinBtn = document\.getElementById\('forgot-pin-btn'\);/g, '');

// 2. Remove the showLockScreen function
content = content.replace(/function showLockScreen\(title, subtitle, canCancel = false\) \{[\s\S]*?\}/g, '');

// 3. Remove pinMode variable
content = content.replace(/let pinMode = 'verify';\s*let tempNewPin = '';/g, '');

// 4. Remove the unlockBtn event listener block. This block is large. It starts with `if\(unlockBtn\) \{` and ends with `\}\); \}`
// We'll use a regex that matches `if\s*\(unlockBtn\)\s*\{\s*unlockBtn\.addEventListener\([\s\S]*?\}\);\s*\}`.
content = content.replace(/if\s*\(unlockBtn\)\s*\{\s*unlockBtn\.addEventListener\('click'[\s\S]*?\}\);\s*\}/g, '');

// 5. Remove cancelPinBtn, forgotPinBtn, changePinBtn blocks
content = content.replace(/if\s*\(cancelPinBtn\)[\s\S]*?\}\);\s*\}/g, '');
content = content.replace(/if\s*\(forgotPinBtn\)[\s\S]*?\}\);\s*\}/g, '');
content = content.replace(/if\s*\(changePinBtn\)[\s\S]*?\}\);\s*\}/g, '');

// 6. Fix lockDiary() to not use lockOverlay since it's already using diaryLockOverlay
content = content.replace(/if\(diaryLockOverlay\)\s*\{\s*diaryLockOverlay\.style\.display = 'flex';/g, "if(diaryLockOverlay) diaryLockOverlay.style.display = 'flex';");

// 7. Remove any references to lockTitle, lockSubtitle etc in unlockDiary
content = content.replace(/if\(lockTitle\).*?\n/g, '');
content = content.replace(/if\(lockSubtitle\).*?\n/g, '');
content = content.replace(/if\(cancelPinBtn\).*?\n/g, '');
content = content.replace(/if\(forgotPinBtn\).*?\n/g, '');
content = content.replace(/if\(unlockBtn\).*?\n/g, '');
content = content.replace(/if\(pinErrorMsg\).*?\n/g, '');

fs.writeFileSync(filePath, content, 'utf8');
console.log("Cleaned up dead code in diary.js");
