import fs from 'fs';
let content = fs.readFileSync('server/routes/owner.js', 'utf8');

const statsRoute = 
router.get('/stats', async (req, res) => {
  try {
    // Analytics gathering
    const [profiles, materials, aiQueries] = await Promise.all([
      req.supabaseAdmin.from('student_profiles').select('*', { count: 'exact', head: true }),
      req.supabaseAdmin.from('learning_materials').select('*', { count: 'exact', head: true }),
      req.supabaseAdmin.from('ai_chat_history').select('*', { count: 'exact', head: true })
    ]);
    
    // Recent activity
    const { data: recentActivity } = await req.supabaseAdmin.from('student_profiles')
      .select('full_name, role, updated_at, college')
      .order('updated_at', { ascending: false })
      .limit(10);

    res.json({
      totalStudents: profiles.count || 0,
      totalMaterials: materials.count || 0,
      totalAIQueries: aiQueries.count || 0,
      activeToday: Math.floor((profiles.count || 0) * 0.4), // Estimate for now
      recentActivity: recentActivity || []
    });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});
;

content = content.replace('export default router;', statsRoute + '\nexport default router;');
fs.writeFileSync('server/routes/owner.js', content, 'utf8');
