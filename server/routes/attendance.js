import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || '';

const getSupabase = (req) => {
  const token = req.headers.authorization?.split(' ')[1];
  return createClient(supabaseUrl, supabaseKey, {
    global: { headers: token ? { Authorization: `Bearer ${token}` } : {} }
  });
};

// Check if user is staff (Admin/Owner/Lecturer)
async function isStaff(supabase) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    
    // We check the role from student_profiles
    const { data: profile } = await supabase
      .from('student_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();
      
    return profile && ['admin', 'owner', 'lecturer'].includes(profile.role);
  } catch(e) {
    return false;
  }
}

// ==========================================
// ADMIN ENDPOINTS
// ==========================================

// Upload bulk attendance (Excel/CSV parsed locally on frontend)
router.post('/upload', async (req, res) => {
  const supabase = getSupabase(req);
  
  if (!(await isStaff(supabase))) {
    return res.status(403).json({ error: 'Unauthorized. Admin access required.' });
  }

  const { records, fileName } = req.body;
  
  if (!records || !Array.isArray(records)) {
    return res.status(400).json({ error: 'Invalid payload.' });
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    // 1. Fetch all student_profiles mapping student_id -> user_id
    // This allows us to map the uploaded '25CS001' to the actual UUID.
    const { data: profiles, error: profileErr } = await supabase
      .from('student_profiles')
      .select('user_id, student_id');
      
    if (profileErr) throw profileErr;
    
    // Create lookup map
    const studentMap = {};
    profiles.forEach(p => {
      if (p.student_id) studentMap[p.student_id.toLowerCase()] = p.user_id;
    });

    let successful = 0;
    let failed = 0;
    
    // Process valid records locally
    const validRows = [];
    records.forEach(row => {
      const sId = (row.student_id || '').toString().toLowerCase().trim();
      const uuid = studentMap[sId];
      if (uuid && row.subject && row.date && row.status) {
        validRows.push({
          student_user_id: uuid,
          subject_name: row.subject,
          attendance_date: row.date,
          status: row.status,
          created_by: user.id
        });
      } else {
        failed++;
      }
    });

    // 2. Create Upload Audit Log
    const { data: uploadLog, error: uploadErr } = await supabase
      .from('attendance_uploads')
      .insert({
        uploaded_by: user.id,
        file_name: fileName || 'Manual Entry',
        total_records: records.length,
        successful_records: validRows.length,
        failed_records: failed
      })
      .select()
      .single();

    if (uploadErr) throw uploadErr;

    // 3. Insert Attendance Records
    if (validRows.length > 0) {
      // attach upload_id
      const finalRows = validRows.map(r => ({ ...r, upload_id: uploadLog.id }));
      
      const { error: insertErr } = await supabase
        .from('attendance_records')
        .upsert(finalRows, { onConflict: 'student_user_id, subject_name, attendance_date' });
        
      if (insertErr) {
        // Rollback log if failure
        await supabase.from('attendance_uploads').delete().eq('id', uploadLog.id);
        throw insertErr;
      }
      
      successful = finalRows.length;
    }

    res.json({
      message: 'Upload completed',
      total: records.length,
      successful,
      failed
    });
    
  } catch (err) {
    console.error('Upload Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Admin Stats
router.get('/admin/stats', async (req, res) => {
  const supabase = getSupabase(req);
  if (!(await isStaff(supabase))) {
    return res.status(403).json({ error: 'Unauthorized.' });
  }

  try {
    // Admins can see all records
    const { data: records, error } = await supabase
      .from('attendance_records')
      .select('status, subject_name');
      
    if (error) throw error;
    
    const stats = {
      total: records.length,
      present: records.filter(r => r.status === 'Present').length,
      absent: records.filter(r => r.status === 'Absent').length,
      late: records.filter(r => r.status === 'Late').length
    };
    
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// STUDENT ENDPOINTS
// ==========================================

// Get my attendance
router.get('/my-attendance', async (req, res) => {
  const supabase = getSupabase(req);
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    // Since RLS is enabled, we can just select all
    const { data, error } = await supabase
      .from('attendance_records')
      .select('*')
      .order('attendance_date', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
