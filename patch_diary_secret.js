import fs from 'fs';
const file = 'server/routes/diary.js';
let content = fs.readFileSync(file, 'utf8');

const oldSecretLine = `const DIARY_SECRET = process.env.DIARY_JWT_SECRET || 'fallback-super-secret-diary-key-2026';`;

const newSecretLine = `const DIARY_SECRET = process.env.DIARY_JWT_SECRET;
if (!DIARY_SECRET) {
  console.error('CRITICAL ERROR: DIARY_JWT_SECRET is missing from environment variables.');
  // Do not throw at startup to avoid crashing the whole app, but API routes will fail when trying to sign/verify.
}`;

const oldSignToken = `function signDiaryToken(userId) {
  return jwt.sign({ userId, diaryUnlocked: true }, DIARY_SECRET, { expiresIn: DIARY_EXPIRATION });
}`;

const newSignToken = `function signDiaryToken(userId) {
  if (!DIARY_SECRET) throw new Error("Server misconfiguration: DIARY_JWT_SECRET is missing.");
  return jwt.sign({ userId, diaryUnlocked: true }, DIARY_SECRET, { expiresIn: DIARY_EXPIRATION });
}`;

const oldRequireToken = `  if (!token) {
    return res.status(403).json({ error: 'Diary is locked. PIN verification required.' });
  }`;

const newRequireToken = `  if (!DIARY_SECRET) {
    return res.status(500).json({ error: 'Server misconfiguration: DIARY_JWT_SECRET is missing.' });
  }
  if (!token) {
    return res.status(403).json({ error: 'Diary is locked. PIN verification required.' });
  }`;

content = content.replace(oldSecretLine, newSecretLine);
content = content.replace(oldSignToken, newSignToken);
content = content.replace(oldRequireToken, newRequireToken);

fs.writeFileSync(file, content);
console.log("Patched server/routes/diary.js for missing DIARY_SECRET");
