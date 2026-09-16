import express from 'express';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcrypt';

const router = express.Router();
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || '';
const serviceRoleKey = process.env.SUPABASE_SECRET_KEY;

const getSupabase = (req) => {
  const token = req.get('Authorization')?.replace(/^Bearer\s+/i, '').trim();
  if (!supabaseUrl || !supabaseAnonKey || !token) return null;
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  });
};

const getAdminSupabase = () => {
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("CRITICAL ERROR: SUPABASE_SECRET_KEY is missing. Admin bypass failed.");
    throw new Error("Server misconfiguration: missing secret key.");
  }
  return createClient(supabaseUrl, serviceRoleKey);
};

import jwt from 'jsonwebtoken';

const DIARY_SECRET = process.env.DIARY_JWT_SECRET;
if (!DIARY_SECRET) {
  console.error('CRITICAL ERROR: DIARY_JWT_SECRET is missing from environment variables.');
  // Do not throw at startup to avoid crashing the whole app, but API routes will fail when trying to sign/verify.
}
const DIARY_EXPIRATION = '15m';

function signDiaryToken(userId) {
  return jwt.sign({ userId, diaryUnlocked: true }, DIARY_SECRET, { expiresIn: DIARY_EXPIRATION });
}

function requireDiaryToken(req, res, next) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  const token = req.headers['x-diary-token'];
  if (!token) {
    return res.status(403).json({ error: 'Diary is locked. PIN verification required.' });
  }
  try {
    const decoded = jwt.verify(token, DIARY_SECRET);
    if (decoded.userId !== req.user.id) {
      throw new Error('User mismatch');
    }
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Diary session expired or invalid. Please unlock again.' });
  }
}


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
  if (!/^\d+$/.test(pin) || pin.length < 4 || pin.length > 6) return res.status(400).json({ error: 'PIN must be 4 to 6 digits.' });

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
    return res.status(429).json({ error: `Too many attempts. Try again in ${diff} seconds.`, locked: true });
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

// AUTH LOGIN
router.post('/auth/login', async (req, res) => {
  let adminSb;
  try {
    adminSb = getAdminSupabase();
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
  
  const { email, password } = req.body;
  const { pin } = req.body;
  
  const sb = getSupabase(req);
  const { data: acc, error } = await sb.from('diary_accounts').select('*').eq('user_id', req.user.id).maybeSingle();
  
  if (error) return res.status(500).json({ error: "Failed to verify security status." });
  if (!acc) return res.status(404).json({ error: 'No Diary Account found.' });
  if (acc.email !== email) return res.status(401).json({ error: 'Invalid Diary credentials.' });

  if (acc.locked_until && new Date(acc.locked_until) > new Date()) {
    const diff = Math.ceil((new Date(acc.locked_until) - new Date()) / 1000);
    return res.status(429).json({ error: `Too many attempts. Try again in ${diff} seconds.`, locked: true });
  }

  
  const isPinMatch = await bcrypt.compare(pin, acc.pin_hash);
  const isMatch = (await bcrypt.compare(password, acc.password_hash)) && isPinMatch;
  

  if (!isMatch) {
    const fails = (acc.failed_attempts || 0) + 1;
    let locked_until = null;
    if (fails >= 5) locked_until = new Date(Date.now() + 30000).toISOString();
    await adminSb.from('diary_accounts').update({ failed_attempts: fails, locked_until }).eq('user_id', req.user.id);
    
    if (locked_until) {
      return res.status(429).json({ error: 'Too many incorrect attempts. Try again in 30 seconds.', locked: true });
    } else {
      return res.status(401).json({ error: 'Invalid Diary credentials.' });
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
  if (!/^\d+$/.test(newPin) || newPin.length < 4 || newPin.length > 6) return res.status(400).json({ error: 'PIN must be 4 to 6 digits.' });
  
  const pin_hash = await bcrypt.hash(newPin, 10);
  const { error } = await adminSb.from('diary_accounts')
    .update({ pin_hash, updated_at: new Date().toISOString() })
    .eq('user_id', req.user.id);

  if (error) return res.status(500).json({ error: "Failed to update PIN." });
  res.json({ success: true });
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

// GET all diaries (with optional search and date filters)
router.get('/', requireDiaryToken, async (req, res) => {
  const sb = getSupabase(req);
  if (!sb) return res.status(401).json({ error: 'Auth required' });
  
  const { search, date } = req.query;
  let query = sb.from('student_diaries').select('*').eq('user_id', req.user.id).order('created_at', { ascending: false });

  if (date) {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);
    query = query.gte('created_at', startDate.toISOString()).lte('created_at', endDate.toISOString());
  }

  if (search) {
    query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%,mood.ilike.%${search}%`);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET insights/stats
router.get('/insights', requireDiaryToken, async (req, res) => {
  const sb = getSupabase(req);
  if (!sb) return res.status(401).json({ error: 'Auth required' });
  
  const { data, error } = await sb.from('student_diaries').select('created_at, mood, tags').eq('user_id', req.user.id);
  if (error) return res.status(500).json({ error: error.message });
  
  // Basic processing for insights
  const total = data.length;
  const moodCounts = {};
  data.forEach(entry => {
    if (entry.mood) moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
  });
  
  res.json({ total, moodCounts });
});

// GET calendar markers (lightweight fetch just for dates)
router.get('/calendar', requireDiaryToken, async (req, res) => {
  const sb = getSupabase(req);
  if (!sb) return res.status(401).json({ error: 'Auth required' });
  
  const { data, error } = await sb.from('student_diaries').select('id, created_at, title').eq('user_id', req.user.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET single diary
router.get('/:id', requireDiaryToken, async (req, res) => {
  const sb = getSupabase(req);
  if (!sb) return res.status(401).json({ error: 'Auth required' });
  
  const { data, error } = await sb.from('student_diaries').select('*').eq('id', req.params.id).eq('user_id', req.user.id).single();
  if (error) return res.status(404).json({ error: 'Entry not found' });
  res.json(data);
});

// POST new diary
router.post('/', requireDiaryToken, async (req, res) => {
  const sb = getSupabase(req);
  if (!sb) return res.status(401).json({ error: 'Auth required' });
  
  const { title, content, mood, tags } = req.body;
  
  const payload = {
    user_id: req.user.id,
    title: title || 'Untitled',
    content: content || '',
    mood: mood || null,
    tags: Array.isArray(tags) ? tags : []
  };

  const { data, error } = await sb.from('student_diaries').insert([payload]).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// PATCH (update) existing diary (auto-save)
router.patch('/:id', requireDiaryToken, async (req, res) => {
  const sb = getSupabase(req);
  if (!sb) return res.status(401).json({ error: 'Auth required' });
  
  const { title, content, mood, tags, is_favorite } = req.body;
  const payload = {};
  if (title !== undefined) payload.title = title;
  if (content !== undefined) payload.content = content;
  if (mood !== undefined) payload.mood = mood;
  if (tags !== undefined) payload.tags = tags;
  if (is_favorite !== undefined) payload.is_favorite = is_favorite;

  const { data, error } = await sb.from('student_diaries').update(payload).eq('id', req.params.id).eq('user_id', req.user.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// DELETE diary
router.delete('/:id', requireDiaryToken, async (req, res) => {
  const sb = getSupabase(req);
  if (!sb) return res.status(401).json({ error: 'Auth required' });
  
  const { error } = await sb.from('student_diaries').delete().eq('id', req.params.id).eq('user_id', req.user.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

export default router;
