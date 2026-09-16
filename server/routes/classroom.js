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

// Routes
router.get('/', async (req, res) => {
  const sb = getSupabase(req);
  if (!sb) return res.json([]);
  const { data, error } = await sb.from('subjects').select('*').eq('user_id', req.user.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/', async (req, res) => {
  const sb = getSupabase(req);
  if (!sb) return res.status(401).json({ error: 'Auth required' });
  
  const { name, category } = req.body;
  if (!name || typeof name !== 'string') return res.status(400).json({ error: 'Invalid name' });
  
  const { data, error } = await sb.from('subjects').insert([{ user_id: req.user.id, name, category }]).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.get('/topics', async (req, res) => {
  const sb = getSupabase(req);
  if (!sb) return res.json([]);
  const { subject_id } = req.query;
  
  let query = sb.from('topics').select('*').eq('user_id', req.user.id);
  if (subject_id) {
    const sId = parseInt(subject_id, 10);
    if (!isNaN(sId)) query = query.eq('subject_id', sId);
  }
  
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/topics', async (req, res) => {
  const sb = getSupabase(req);
  if (!sb) return res.status(401).json({ error: 'Auth required' });
  
  let { subject_id, name } = req.body;
  if (!name || typeof name !== 'string') return res.status(400).json({ error: 'Invalid name' });
  subject_id = parseInt(subject_id, 10);
  if (isNaN(subject_id)) return res.status(400).json({ error: 'Invalid subject ID' });
  
  // Verify ownership of the subject before adding a topic to it
  const { data: subjectCheck } = await sb.from('subjects').select('id').eq('id', subject_id).eq('user_id', req.user.id).single();
  if (!subjectCheck) return res.status(403).json({ error: 'Subject not found or access denied' });
  
  const { data, error } = await sb.from('topics').insert([{ user_id: req.user.id, subject_id, name }]).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

export default router;
