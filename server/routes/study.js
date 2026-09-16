import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { callAI } from '../services/ai-service.js';

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

router.get('/summary', async (req, res) => {
  const sb = getSupabase(req);
  if (!sb) return res.json({ weekly_minutes: [0, 0, 0, 0, 0, 0, 0], mastery: 0, streak: 0, sessions: 0 });
  
  try {
    const { data, error } = await sb.from('gamification_profiles').select('*').eq('user_id', req.user.id).maybeSingle();
    
    // Also fetch weekly minutes from student_daily_activity
    const { data: activity } = await sb.from('student_daily_activity')
      .select('activity_date, study_minutes')
      .eq('user_id', req.user.id)
      .order('activity_date', { ascending: false })
      .limit(7);

    const weekly_minutes = new Array(7).fill(0);
    if (activity) {
      activity.forEach((act, idx) => {
        if (idx < 7) weekly_minutes[6 - idx] = act.study_minutes;
      });
    }

    res.json({
      weekly_minutes,
      mastery: data?.mastery || 0,
      streak: data?.current_streak || 0,
      xp: data?.xp || 0,
      level: data?.level || 1
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/session', async (req, res) => {
  const sb = getSupabase(req);
  if (!sb) return res.json({ success: true });
  
  let { duration } = req.body;
  duration = parseInt(duration, 10);
  if (isNaN(duration) || duration < 0 || duration > 1440) return res.status(400).json({ error: 'Invalid duration' });

  const date = new Date().toISOString().split('T')[0];

  // Increment daily gamification stats
  const { data, error } = await sb.rpc('increment_daily_activity', {
    target_date: date,
    study_minutes_delta: duration
  });
  
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || { success: true });
});

// Assignments
router.get('/assignments', async (req, res) => {
  const sb = getSupabase(req);
  if (!sb) return res.json([]);
  const { data, error } = await sb.from('assignments').select('*').eq('user_id', req.user.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/assignments', async (req, res) => {
  const sb = getSupabase(req);
  if (!sb) return res.json({ success: true });
  
  const { title, description, due_date, priority } = req.body;
  if (!title || typeof title !== 'string') return res.status(400).json({ error: 'Invalid title' });
  if (description && typeof description !== 'string') return res.status(400).json({ error: 'Invalid description' });
  if (priority && !['high', 'medium', 'low'].includes(priority)) return res.status(400).json({ error: 'Invalid priority' });
  
  // Ask AI for time estimate
  let estimated_time_minutes = 60;
  try {
    const prompt = `Estimate how many minutes it would take a student to complete this assignment. Output ONLY a number. Title: ${title}. Description: ${description}`;
    const aiRes = await callAI(prompt, 'estimate');
    const match = aiRes.text.match(/\d+/);
    if (match) estimated_time_minutes = parseInt(match[0], 10);
  } catch (e) {
    console.error('AI estimate failed', e);
  }

  const { data, error } = await sb.from('assignments').insert([{ 
    user_id: req.user.id, title, description, due_date, priority, estimated_time_minutes 
  }]).select().single();
  
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Timetables
router.get('/timetable', async (req, res) => {
  const sb = getSupabase(req);
  if (!sb) return res.json([]);
  const { data, error } = await sb.from('timetables').select('*').eq('user_id', req.user.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/timetable', async (req, res) => {
  const sb = getSupabase(req);
  if (!sb) return res.json({ success: true });
  
  const { subject_name, day_of_week, start_time, end_time } = req.body;
  if (!subject_name || typeof subject_name !== 'string') return res.status(400).json({ error: 'Invalid subject name' });
  if (!day_of_week || typeof day_of_week !== 'string') return res.status(400).json({ error: 'Invalid day of week' });
  
  const { data, error } = await sb.from('timetables').insert([{ 
    user_id: req.user.id, subject_name, day_of_week, start_time, end_time 
  }]).select().single();
  
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

export default router;
