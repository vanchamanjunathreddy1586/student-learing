import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || '';

// Admin client requires bypass RLS or service role to perform admin actions safely if RLS doesn't allow everything
// But since we added RLS rules for admins, standard client with user context might work.
// To be safe, we'll instantiate a client per request using the user's token, so RLS applies as Admin.
const getSupabase = (req) => {
  const token = req.get('Authorization')?.replace(/^Bearer\s+/i, '').trim();
  if (!supabaseUrl || !supabaseServiceKey || !token) return null;
  return createClient(supabaseUrl, supabaseServiceKey, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  });
};

// Middleware to protect admin routes
export const requireAdmin = async (req, res, next) => {
  const sb = getSupabase(req);
  if (!sb) return res.status(401).json({ error: 'Supabase not configured or missing token' });
  
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });

  const { data: profile, error } = await sb.from('student_profiles').select('role').eq('user_id', req.user.id).single();
  
  if (error || !profile || profile.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }
  
  req.supabase = sb; // pass the client down
  next();
};

router.use(requireAdmin);

// === USERS / STUDENTS ===
router.get('/students', async (req, res) => {
  const { data, error } = await req.supabase.from('admin_user_overview').select('*');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/students/:userId/ban', async (req, res) => {
  const { is_banned } = req.body;
  const { userId } = req.params;
  
  const { error } = await req.supabase
    .from('student_profiles')
    .update({ is_banned: Boolean(is_banned) })
    .eq('user_id', userId);
    
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, is_banned });
});

// === COLLEGES ===
router.get('/colleges', async (req, res) => {
  const { data, error } = await req.supabase.from('colleges').select('*').order('name');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/colleges', async (req, res) => {
  const { name } = req.body;
  const { data, error } = await req.supabase.from('colleges').insert([{ name }]).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.delete('/colleges/:id', async (req, res) => {
  const { error } = await req.supabase.from('colleges').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// === SUBJECTS ===
router.get('/subjects', async (req, res) => {
  const { data, error } = await req.supabase
    .from('master_subjects')
    .select('*, colleges(name)')
    .order('name');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/subjects', async (req, res) => {
  const { name, category, college_id } = req.body;
  const { data, error } = await req.supabase
    .from('master_subjects')
    .insert([{ name, category, college_id }])
    .select('*, colleges(name)')
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.delete('/subjects/:id', async (req, res) => {
  const { error } = await req.supabase.from('master_subjects').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

export default router;
