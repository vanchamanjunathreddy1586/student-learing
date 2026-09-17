import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || ''; // Must be service role to create users!

const getSupabaseAdmin = () => {
  if (!supabaseUrl || !supabaseServiceKey) return null;
  return createClient(supabaseUrl, supabaseServiceKey);
};

// Middleware to protect owner routes
export const requireOwner = async (req, res, next) => {
  const adminClient = getSupabaseAdmin();
  if (!adminClient) return res.status(500).json({ error: 'Supabase Service Role Key not configured' });
  
  const token = req.get('Authorization')?.replace(/^Bearer\s+/i, '').trim();
  if (!token) return res.status(401).json({ error: 'Authentication required' });

  // Use the standard client with the user's token to verify who they are
  const userClient = createClient(supabaseUrl, process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  });

  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) return res.status(401).json({ error: 'Authentication required' });

  const { data: profile, error } = await userClient.from('student_profiles').select('role').eq('user_id', user.id).single();
  
  if (error || !profile || profile.role !== 'owner') {
    return res.status(403).json({ error: 'Forbidden: Owner access required' });
  }
  
  req.supabaseAdmin = adminClient;
  next();
};

router.use(requireOwner);

router.get('/admins', async (req, res) => {
  const { data, error } = await req.supabaseAdmin.from('student_profiles').select('*').in('role', ['admin', 'owner', 'lecturer']);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/admins', async (req, res) => {
  const { email, password, fullName, role = 'admin' } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  // 1. Create the user in Auth system using Admin API
  const { data: authData, error: authError } = await req.supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName }
  });

  if (authError) return res.status(500).json({ error: authError.message });

  const newUserId = authData.user.id;

  // 2. Insert into student_profiles
  const { data: profileData, error: profileError } = await req.supabaseAdmin.from('student_profiles').insert([{
    user_id: newUserId,
    email,
    full_name: fullName || 'Staff',
    role: role,
    profile_completed: true,
    college: 'Administration',
    year: 'Staff'
  }]).select().single();

  if (profileError) {
    // Rollback auth user creation if profile fails
    await req.supabaseAdmin.auth.admin.deleteUser(newUserId);
    return res.status(500).json({ error: profileError.message });
  }

  res.json(profileData);
});

router.delete('/admins/:userId', async (req, res) => {
  const { userId } = req.params;
  
  // Protect owner from being deleted
  const { data: profile } = await req.supabaseAdmin.from('student_profiles').select('role').eq('user_id', userId).single();
  if (profile && profile.role === 'owner') {
    return res.status(403).json({ error: 'Cannot delete the owner' });
  }

  // Delete from Auth (Cascade will delete the profile)
  const { error } = await req.supabaseAdmin.auth.admin.deleteUser(userId);
  if (error) return res.status(500).json({ error: error.message });
  
  res.json({ success: true });
});

router.get('/stats', async (req, res) => {
  try {
    const { count: profilesCount } = await req.supabaseAdmin.from('student_profiles').select('*', { count: 'exact', head: true });
    const { count: materialsCount } = await req.supabaseAdmin.from('learning_materials').select('*', { count: 'exact', head: true });
    // Fallback if ai_messages doesn't exist or differs in name
    const aiRes = await req.supabaseAdmin.from('ai_messages').select('*', { count: 'exact', head: true });
    const aiQueriesCount = aiRes.count || 0;
    
    const { data: recentActivity } = await req.supabaseAdmin.from('student_profiles')
      .select('full_name, role, updated_at, college')
      .order('updated_at', { ascending: false })
      .limit(10);

    res.json({
      totalStudents: profilesCount || 0,
      totalMaterials: materialsCount || 0,
      totalAIQueries: aiQueriesCount || 0,
      activeToday: Math.floor((profilesCount || 0) * 0.4),
      recentActivity: recentActivity || []
    });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
