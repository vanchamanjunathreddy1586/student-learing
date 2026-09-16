import fs from 'fs';
const file = 'server/routes/diary.js';
let content = fs.readFileSync(file, 'utf8');

const securityStart = content.indexOf('// PIN SETUP');
const securityEnd = content.indexOf('// GET all diaries');

if (securityStart !== -1 && securityEnd !== -1) {
  const newAuthBlock = `
// AUTH REGISTER
router.post('/auth/register', async (req, res) => {
  let adminSb;
  try {
    adminSb = getAdminSupabase();
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
  
  const { email, password, pin } = req.body;
  if (!email || !password || !pin) return res.status(400).json({ error: 'Missing fields.' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  if (!/^\\d+$/.test(pin) || pin.length < 4 || pin.length > 6) return res.status(400).json({ error: 'PIN must be 4 to 6 digits.' });

  const sb = getSupabase(req);
  if (!sb) return res.status(401).json({ error: 'Auth required' });

  const { data: existing } = await sb.from('diary_accounts').select('id').eq('user_id', req.user.id).maybeSingle();
  if (existing) {
    return res.status(400).json({ error: 'Diary account already exists.' });
  }

  try {
    const password_hash = await bcrypt.hash(password, 10);
    const pin_hash = await bcrypt.hash(pin, 10);
    const { error } = await sb.from('diary_accounts').insert([{
      user_id: req.user.id,
      email,
      password_hash,
      pin_hash
    }]);
    
    if (error) throw error;
    const token = signDiaryToken(req.user.id);
    res.json({ success: true, diaryToken: token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AUTH LOGIN
router.post('/auth/login', async (req, res) => {
  let adminSb;
  try {
    adminSb = getAdminSupabase();
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
  
  const { email, password } = req.body;
  
  const sb = getSupabase(req);
  const { data: acc, error } = await sb.from('diary_accounts').select('*').eq('user_id', req.user.id).maybeSingle();
  
  if (error) return res.status(500).json({ error: "Failed to verify security status." });
  if (!acc) return res.status(404).json({ error: 'No Diary Account found.' });
  if (acc.email !== email) return res.status(401).json({ error: 'Incorrect Diary email.' });

  if (acc.locked_until && new Date(acc.locked_until) > new Date()) {
    const diff = Math.ceil((new Date(acc.locked_until) - new Date()) / 1000);
    return res.status(429).json({ error: \`Too many attempts. Try again in \${diff} seconds.\`, locked: true });
  }

  const isMatch = await bcrypt.compare(password, acc.password_hash);

  if (!isMatch) {
    const fails = (acc.failed_attempts || 0) + 1;
    let locked_until = null;
    if (fails >= 5) locked_until = new Date(Date.now() + 30000).toISOString();
    await adminSb.from('diary_accounts').update({ failed_attempts: fails, locked_until }).eq('user_id', req.user.id);
    
    if (locked_until) {
      return res.status(429).json({ error: 'Too many incorrect attempts. Try again in 30 seconds.', locked: true });
    } else {
      return res.status(401).json({ error: 'Incorrect Diary password.' });
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

// AUTH STATUS
router.get('/auth/status', async (req, res) => {
  const sb = getSupabase(req);
  if (!sb) return res.status(401).json({ error: 'Auth required' });
  
  const { data, error } = await sb.from('diary_accounts').select('id, email').eq('user_id', req.user.id).maybeSingle();
  if (error) return res.status(500).json({ error: "Security status check failed." });
  res.json({ hasAccount: !!data, email: data ? data.email : null });
});

// AUTH LOGOUT
router.post('/auth/logout', async (req, res) => {
  res.json({ success: true });
});

// FORGOT PASSWORD
router.post('/auth/forgot-password', async (req, res) => {
  let adminSb;
  try { adminSb = getAdminSupabase(); } catch (e) { return res.status(500).json({ error: e.message }); }
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  
  const password_hash = await bcrypt.hash(newPassword, 10);
  const { data, error } = await adminSb.from('diary_accounts')
    .update({ password_hash, failed_attempts: 0, locked_until: null })
    .eq('user_id', req.user.id).select();

  if (error) return res.status(500).json({ error: "Failed to reset password." });
  if (!data || data.length === 0) return res.status(404).json({ error: 'No Diary Account found.' });
  
  const token = signDiaryToken(req.user.id);
  res.json({ success: true, diaryToken: token });
});

`;
  
  content = content.substring(0, securityStart) + newAuthBlock + content.substring(securityEnd);
  fs.writeFileSync(file, content);
  console.log("Updated routes.");
} else {
  console.log("Could not find blocks.");
}
