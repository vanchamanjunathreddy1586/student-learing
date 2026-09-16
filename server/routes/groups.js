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

// Get all study groups
router.get('/', async (req, res) => {
  const sb = getSupabase(req);
  if (!sb) return res.json([]);
  const { data, error } = await sb.from('study_groups').select('*, group_members(count)');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Join group
router.post('/:groupId/join', async (req, res) => {
  const sb = getSupabase(req);
  if (!sb) return res.status(401).json({ error: 'Auth required' });
  
  const groupId = parseInt(req.params.groupId, 10);
  if (isNaN(groupId)) return res.status(400).json({ error: 'Invalid group ID' });

  const { data, error } = await sb.from('group_members').insert([{ group_id: groupId, user_id: req.user.id }]);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// Get public notes for a group
router.get('/:groupId/notes', async (req, res) => {
  const sb = getSupabase(req);
  if (!sb) return res.json([]);
  
  const groupId = parseInt(req.params.groupId, 10);
  if (isNaN(groupId)) return res.status(400).json({ error: 'Invalid group ID' });

  const { data, error } = await sb.from('public_notes').select('*, auth_users:user_id(email)').eq('group_id', groupId).order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Post a public note
router.post('/:groupId/notes', async (req, res) => {
  const sb = getSupabase(req);
  if (!sb) return res.status(401).json({ error: 'Auth required' });
  
  const groupId = parseInt(req.params.groupId, 10);
  if (isNaN(groupId)) return res.status(400).json({ error: 'Invalid group ID' });

  const { title, content } = req.body;
  if (!title || typeof title !== 'string') return res.status(400).json({ error: 'Invalid title' });
  if (!content || typeof content !== 'string') return res.status(400).json({ error: 'Invalid content' });

  // Verify that the user is a member of the group before posting
  const { data: memberCheck } = await sb.from('group_members').select('user_id').eq('group_id', groupId).eq('user_id', req.user.id).single();
  if (!memberCheck) return res.status(403).json({ error: 'Must join the group to post notes' });

  const { data, error } = await sb.from('public_notes').insert([{ group_id: groupId, user_id: req.user.id, title, content }]).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

export default router;
