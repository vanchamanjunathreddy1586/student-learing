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

// Get all notes
router.get('/', async (req, res) => {
  const sb = getSupabase(req);
  if (!sb) return res.status(401).json({ error: 'Auth required' });
  
  const { search, folder, subject, tag } = req.query;
  let query = sb.from('knowledge_notes').select('id, title, folder, subject, tags, created_at, updated_at').eq('user_id', req.user.id).order('updated_at', { ascending: false });

  if (search) query = query.ilike('title', `%${search}%`);
  if (folder) query = query.eq('folder', folder);
  if (subject) query = query.eq('subject', subject);
  if (tag) query = query.contains('tags', [tag]);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Get note by ID including links/backlinks
router.get('/:id', async (req, res) => {
  if (req.params.id === 'graph') return res.status(400).json({ error: 'Invalid route' });
  
  const sb = getSupabase(req);
  if (!sb) return res.status(401).json({ error: 'Auth required' });
  
  const { data: note, error } = await sb.from('knowledge_notes').select('*').eq('id', req.params.id).eq('user_id', req.user.id).single();
  if (error) return res.status(404).json({ error: 'Note not found' });
  
  // Get links and backlinks
  const { data: links } = await sb.from('knowledge_links')
    .select('target_note_id, target:knowledge_notes!target_note_id(title)')
    .eq('source_note_id', req.params.id);
    
  const { data: backlinks } = await sb.from('knowledge_links')
    .select('source_note_id, source:knowledge_notes!source_note_id(title)')
    .eq('target_note_id', req.params.id);
    
  note.links = links?.map(l => ({ id: l.target_note_id, title: l.target?.title })) || [];
  note.backlinks = backlinks?.map(b => ({ id: b.source_note_id, title: b.source?.title })) || [];
  
  res.json(note);
});

// Create note
router.post('/', async (req, res) => {
  const sb = getSupabase(req);
  if (!sb) return res.status(401).json({ error: 'Auth required' });
  
  const { title, content, subject, folder, tags } = req.body;
  
  const payload = {
    user_id: req.user.id,
    title: title || 'Untitled Note',
    content: content || '',
    subject: subject || null,
    folder: folder || null,
    tags: tags || []
  };
  
  const { data, error } = await sb.from('knowledge_notes').insert([payload]).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// Update note
router.patch('/:id', async (req, res) => {
  const sb = getSupabase(req);
  if (!sb) return res.status(401).json({ error: 'Auth required' });
  
  const { title, content, subject, folder, tags } = req.body;
  const payload = { updated_at: new Date().toISOString() };
  if (title !== undefined) payload.title = title;
  if (content !== undefined) payload.content = content;
  if (subject !== undefined) payload.subject = subject;
  if (folder !== undefined) payload.folder = folder;
  if (tags !== undefined) payload.tags = tags;
  
  const { data, error } = await sb.from('knowledge_notes').update(payload).eq('id', req.params.id).eq('user_id', req.user.id).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// Delete note
router.delete('/:id', async (req, res) => {
  const sb = getSupabase(req);
  if (!sb) return res.status(401).json({ error: 'Auth required' });
  
  const { error } = await sb.from('knowledge_notes').delete().eq('id', req.params.id).eq('user_id', req.user.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// Sync links (called by frontend when detecting [[links]])
router.post('/:id/links', async (req, res) => {
  const sb = getSupabase(req);
  if (!sb) return res.status(401).json({ error: 'Auth required' });
  
  const sourceId = req.params.id;
  const { targetIds } = req.body; // array of UUIDs
  
  if (!Array.isArray(targetIds)) return res.status(400).json({ error: 'targetIds must be array' });
  
  // Delete old links
  await sb.from('knowledge_links').delete().eq('source_note_id', sourceId).eq('user_id', req.user.id);
  
  // Insert new links
  if (targetIds.length > 0) {
    const payload = targetIds.map(targetId => ({
      source_note_id: sourceId,
      target_note_id: targetId,
      user_id: req.user.id
    }));
    await sb.from('knowledge_links').insert(payload);
  }
  
  res.json({ success: true });
});

// Knowledge Graph Data
router.get('/graph/data', async (req, res) => {
  const sb = getSupabase(req);
  if (!sb) return res.status(401).json({ error: 'Auth required' });
  
  const { data: notes, error: notesError } = await sb.from('knowledge_notes').select('id, title, folder, subject, tags').eq('user_id', req.user.id);
  const { data: links, error: linksError } = await sb.from('knowledge_links').select('source_note_id, target_note_id').eq('user_id', req.user.id);
  
  if (notesError || linksError) return res.status(500).json({ error: 'Failed to load graph data' });
  
  res.json({ notes, links });
});

export default router;
