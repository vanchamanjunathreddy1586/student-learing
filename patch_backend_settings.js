import fs from 'fs';
const file = 'server/routes/diary.js';
let content = fs.readFileSync(file, 'utf8');

const target = `// AUTH LOGOUT`;

const settingsRoutes = `
// CHANGE PASSWORD
router.post('/auth/change-password', requireDiaryToken, async (req, res) => {
  let adminSb;
  try { adminSb = getAdminSupabase(); } catch (e) { return res.status(500).json({ error: e.message }); }
  
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  
  const password_hash = await bcrypt.hash(newPassword, 10);
  const { error } = await adminSb.from('diary_accounts')
    .update({ password_hash, updated_at: new Date().toISOString() })
    .eq('user_id', req.user.id);

  if (error) return res.status(500).json({ error: "Failed to update password." });
  res.json({ success: true });
});

// CHANGE PIN
router.post('/auth/change-pin', requireDiaryToken, async (req, res) => {
  let adminSb;
  try { adminSb = getAdminSupabase(); } catch (e) { return res.status(500).json({ error: e.message }); }
  
  const { newPin } = req.body;
  if (!/^\\d+$/.test(newPin) || newPin.length < 4 || newPin.length > 6) return res.status(400).json({ error: 'PIN must be 4 to 6 digits.' });
  
  const pin_hash = await bcrypt.hash(newPin, 10);
  const { error } = await adminSb.from('diary_accounts')
    .update({ pin_hash, updated_at: new Date().toISOString() })
    .eq('user_id', req.user.id);

  if (error) return res.status(500).json({ error: "Failed to update PIN." });
  res.json({ success: true });
});
`;

if (content.includes(target) && !content.includes('/auth/change-pin')) {
  content = content.replace(target, settingsRoutes + '\n' + target);
  fs.writeFileSync(file, content);
  console.log("Patched server for change-pin and change-password");
} else {
  console.log("Could not find target or already patched");
}
