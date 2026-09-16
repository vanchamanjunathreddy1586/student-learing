import fs from 'fs';
const file = 'server/routes/diary.js';
let content = fs.readFileSync(file, 'utf8');

const target = `// AUTH LOGIN`;

const verifyPinRoute = `
// AUTH VERIFY PIN (For unlocking when session expires or manual lock)
router.post('/auth/verify-pin', async (req, res) => {
  const { pin } = req.body;
  if (!pin) return res.status(400).json({ error: 'PIN is required.' });

  const sb = getSupabase(req);
  if (!sb) return res.status(401).json({ error: 'Auth required' });

  const { data: acc, error } = await sb.from('diary_accounts').select('*').eq('user_id', req.user.id).maybeSingle();
  if (error || !acc) return res.status(404).json({ error: 'Diary Account not found.' });

  if (acc.locked_until && new Date(acc.locked_until) > new Date()) {
    const diff = Math.ceil((new Date(acc.locked_until) - new Date()) / 1000);
    return res.status(429).json({ error: \`Too many attempts. Try again in \${diff} seconds.\`, locked: true });
  }

  const isPinMatch = await bcrypt.compare(pin, acc.pin_hash);

  let adminSb;
  try { adminSb = getAdminSupabase(); } catch (e) { return res.status(500).json({ error: e.message }); }

  if (!isPinMatch) {
    const fails = (acc.failed_attempts || 0) + 1;
    let locked_until = null;
    if (fails >= 5) locked_until = new Date(Date.now() + 30000).toISOString();
    await adminSb.from('diary_accounts').update({ failed_attempts: fails, locked_until }).eq('user_id', req.user.id);
    
    if (locked_until) {
      return res.status(429).json({ error: 'Too many incorrect attempts. Try again in 30 seconds.', locked: true });
    } else {
      return res.status(401).json({ error: 'Incorrect Diary PIN.' });
    }
  }

  await adminSb.from('diary_accounts').update({ 
    failed_attempts: 0, 
    locked_until: null,
    last_login: new Date().toISOString()
  }).eq('user_id', req.user.id);

  const token = signDiaryToken(req.user.id);
  res.json({ success: true, diaryToken: token });
});
`;

if (content.includes(target) && !content.includes('/auth/verify-pin')) {
  content = content.replace(target, verifyPinRoute + '\n' + target);
  fs.writeFileSync(file, content);
  console.log("Patched server for verify-pin");
}
