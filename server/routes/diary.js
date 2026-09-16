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

const DIARY_SECRET = process.env.DIARY_JWT_SECRET || 'fallback-super-secret-diary-key-2026';
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

// PIN SETUP
router.post('/security/setup', async (req, res) => {
  let adminSb;
  try {
    adminSb = getAdminSupabase();
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
  
  const { pin } = req.body;
  if (!pin || typeof pin !== 'string' || pin.length < 4 || pin.length > 6 || !/^\d+$/.test(pin)) {
    return res.status(400).json({ error: 'PIN must be 4 to 6 digits.' });
  }
  
  const invalidPins = ['0000', '000000', '1111', '111111', '1234', '123456'];
  if (invalidPins.includes(pin)) {
    return res.status(400).json({ error: 'Please choose a stronger PIN.' });
  }

  const sb = getSupabase(req);
  if (!sb) return res.status(401).json({ error: 'Auth required' });

  const { data: existing } = await sb.from('diary_security').select('id').eq('user_id', req.user.id).maybeSingle();
  if (existing) {
    return res.status(400).json({ error: 'PIN is already set up.' });
  }

  try {
    const pin_hash = await bcrypt.hash(pin, 10);
    const { error } = await sb.from('diary_security').insert([{
      user_id: req.user.id,
      pin_hash
    }]);
    
    if (error) throw error;
    const token = signDiaryToken(req.user.id);
    res.json({ success: true, diaryToken: token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PIN LOGIN
router.post('/security/login', async (req, res) => {
  let adminSb;
  try {
    adminSb = getAdminSupabase();
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
  
  const { pin } = req.body;
  
  // Need admin client to bypass RLS and read the hash, because we need to check locked_until and failed_attempts.
  // Wait, if RLS allows users to read their own diary_security, sb works too. Let's use sb for safety but adminSb if necessary.
  const sb = getSupabase(req);
  
  const { data: securityRow, error } = await sb.from('diary_security').select('*').eq('user_id', req.user.id).maybeSingle();
  
  if (error) {
    console.error("Diary security fetch error:", error);
    return res.status(500).json({ error: "Failed to verify security status." });
  }
  
  if (!securityRow) {
    return res.status(404).json({ error: 'No PIN setup found.' });
  }

  // Check brute force
  if (securityRow.locked_until && new Date(securityRow.locked_until) > new Date()) {
    const diff = Math.ceil((new Date(securityRow.locked_until) - new Date()) / 1000);
    return res.status(429).json({ error: `Too many attempts. Try again in ${diff} seconds.`, locked: true });
  }

  const isMatch = await bcrypt.compare(pin, securityRow.pin_hash);

  if (!isMatch) {
    const fails = (securityRow.failed_attempts || 0) + 1;
    let locked_until = null;
    if (fails >= 5) {
      locked_until = new Date(Date.now() + 30000).toISOString(); // 30 seconds lock
    }
    await adminSb.from('diary_security').update({ failed_attempts: fails, locked_until }).eq('user_id', req.user.id);
    
    if (locked_until) {
      return res.status(429).json({ error: `Too many incorrect attempts. Try again in 30 seconds.`, locked: true });
    } else {
      return res.status(401).json({ error: 'Incorrect PIN.' });
    }
  }

  // Success
  await adminSb.from('diary_security').update({ 
    failed_attempts: 0, 
    locked_until: null,
    last_unlocked_at: new Date().toISOString()
  }).eq('user_id', req.user.id);

  const token = signDiaryToken(req.user.id);
  res.json({ success: true, diaryToken: token });
});

// PIN CHANGE
router.post('/security/change-pin', async (req, res) => {
  let adminSb;
  try {
    adminSb = getAdminSupabase();
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
  const sb = getSupabase(req);
  if (!sb || !adminSb) return res.status(401).json({ error: 'Auth required' });
  
  const { currentPin, newPin } = req.body;
  
  const { data: securityRow, error } = await sb.from('diary_security').select('*').eq('user_id', req.user.id).maybeSingle();
  if (error) return res.status(500).json({ error: "Failed to verify security status." });
  if (!securityRow) return res.status(404).json({ error: 'No PIN setup found.' });
  
  if (securityRow.locked_until && new Date(securityRow.locked_until) > new Date()) {
    return res.status(429).json({ error: 'Account temporarily locked.' });
  }

  const isMatch = await bcrypt.compare(currentPin, securityRow.pin_hash);
  if (!isMatch) {
    return res.status(401).json({ error: 'Current PIN is incorrect.' });
  }

  if (!newPin || typeof newPin !== 'string' || newPin.length < 4 || newPin.length > 6 || !/^\d+$/.test(newPin)) {
    return res.status(400).json({ error: 'New PIN must be 4 to 6 digits.' });
  }

  const pin_hash = await bcrypt.hash(newPin, 10);
  await adminSb.from('diary_security').update({ pin_hash }).eq('user_id', req.user.id);
  
  res.json({ success: true });
});

// PIN RESET (Forgot PIN)
router.post('/security/reset', async (req, res) => {
  let adminSb;
  try {
    adminSb = getAdminSupabase();
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
  
  // This endpoint requires standard Supabase authentication (which is handled globally).
  // The user just provides a new PIN. This essentially acts as a "hard reset" 
  // since they are logged into the Supabase account.
  const { newPin } = req.body;
  
  if (!newPin || typeof newPin !== 'string' || newPin.length < 4 || newPin.length > 6 || !/^\d+$/.test(newPin)) {
    return res.status(400).json({ error: 'New PIN must be 4 to 6 digits.' });
  }

  const pin_hash = await bcrypt.hash(newPin, 10);
  const { data, error } = await adminSb.from('diary_security')
    .update({ 
      pin_hash,
      failed_attempts: 0,
      locked_until: null,
      last_unlocked_at: new Date().toISOString()
    })
    .eq('user_id', req.user.id)
    .select();

  if (error) return res.status(500).json({ error: "Failed to reset PIN." });
  if (!data || data.length === 0) {
    return res.status(404).json({ error: 'No PIN setup found.' });
  }

  const token = signDiaryToken(req.user.id);
  res.json({ success: true, diaryToken: token });
});

// CHECK PIN STATUS (for UI)
router.get('/security/status', async (req, res) => {
  const sb = getSupabase(req);
  if (!sb) return res.status(401).json({ error: 'Auth required' });
  
  const { data, error } = await sb.from('diary_security').select('id').eq('user_id', req.user.id).maybeSingle();
  if (error) {
    console.error("Diary security fetch error:", error);
    return res.status(500).json({ error: "Security status check failed." });
  }
  res.json({ hasPin: !!data });
});

// LOGOUT (Clear server-side session concepts if any)
router.post('/security/logout', async (req, res) => {
  // Since we use stateless JWT, we can't inherently destroy it on the server 
  // without a blacklist, but the client will drop it. We just return success.
  res.json({ success: true });
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
