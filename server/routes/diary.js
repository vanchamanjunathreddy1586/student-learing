import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || '';

const getSupabase = (req) => {
  const token = req.get('Authorization')?.replace(/^Bearer\s+/i, '').trim();
  if (!supabaseUrl || !supabaseAnonKey || !token) return null;
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  });
};

// GET all diaries (with optional search and date filters)
router.get('/', async (req, res) => {
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
router.get('/insights', async (req, res) => {
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
router.get('/calendar', async (req, res) => {
  const sb = getSupabase(req);
  if (!sb) return res.status(401).json({ error: 'Auth required' });
  
  const { data, error } = await sb.from('student_diaries').select('id, created_at, title').eq('user_id', req.user.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET single diary
router.get('/:id', async (req, res) => {
  const sb = getSupabase(req);
  if (!sb) return res.status(401).json({ error: 'Auth required' });
  
  const { data, error } = await sb.from('student_diaries').select('*').eq('id', req.params.id).eq('user_id', req.user.id).single();
  if (error) return res.status(404).json({ error: 'Entry not found' });
  res.json(data);
});

// POST new diary
router.post('/', async (req, res) => {
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
router.patch('/:id', async (req, res) => {
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
router.delete('/:id', async (req, res) => {
  const sb = getSupabase(req);
  if (!sb) return res.status(401).json({ error: 'Auth required' });
  
  const { error } = await sb.from('student_diaries').delete().eq('id', req.params.id).eq('user_id', req.user.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

export default router;
