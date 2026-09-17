import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';

export const lessonsRouter = Router();

const getSupabaseClient = (req) => {
  return createClient(
    process.env.SUPABASE_URL || '', 
    process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || '', 
    {
      global: {
        headers: {
          Authorization: req.headers.authorization || ''
        }
      }
    }
  );
};

// GET /api/lessons - List all lessons + progress for the authenticated user
lessonsRouter.get('/', async (req, res) => {
  try {
    const user_id = req.user?.id;
    if (!user_id) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const supabase = getSupabaseClient(req);

    // We can fetch materials and progress. 
    // Wait, in Supabase we can do a join:
    const { data: materials, error } = await supabase
      .from('learning_materials')
      .select(`
        *,
        learning_progress (
          current_page,
          current_section,
          scroll_position,
          progress_percentage,
          completed,
          last_opened_at
        )
      `)
      .eq('user_id', user_id)
      .order('updated_at', { ascending: false });

    if (error) throw new Error(error.message);

    // Format the response securely
    const formattedData = materials.map(mat => {
      const progress = mat.learning_progress?.[0] || {
        current_page: 1,
        progress_percentage: 0,
        completed: false,
        last_opened_at: mat.created_at
      };
      
      return {
        id: mat.id,
        title: mat.title,
        subject_id: mat.subject_id,
        file_name: mat.file_name,
        file_url: mat.file_url,
        file_type: mat.file_type,
        file_size: mat.file_size,
        total_pages: mat.total_pages,
        created_at: mat.created_at,
        progress
      };
    });

    // Sort globally by last_opened_at
    formattedData.sort((a, b) => new Date(b.progress.last_opened_at) - new Date(a.progress.last_opened_at));

    res.json({ success: true, data: formattedData });
  } catch (err) {
    console.error('GET /api/lessons Error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch lessons' });
  }
});

// GET /api/lessons/recent - Get the most recent active lesson for the dashboard
lessonsRouter.get('/recent', async (req, res) => {
  try {
    const user_id = req.user?.id;
    if (!user_id) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const supabase = getSupabaseClient(req);

    // Get the most recently opened progress
    const { data: recentProgress, error: progressError } = await supabase
      .from('learning_progress')
      .select('material_id, current_page, progress_percentage, completed, last_opened_at')
      .eq('user_id', user_id)
      .eq('completed', false)
      .order('last_opened_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (progressError) throw new Error(progressError.message);
    if (!recentProgress) {
      return res.json({ success: true, data: null });
    }

    const { data: material, error: matError } = await supabase
      .from('learning_materials')
      .select('*')
      .eq('id', recentProgress.material_id)
      .eq('user_id', user_id)
      .maybeSingle();

    if (matError) throw new Error(matError.message);

    if (material) {
      res.json({
        success: true,
        data: {
          id: material.id,
          title: material.title,
          file_name: material.file_name,
          total_pages: material.total_pages,
          progress: recentProgress
        }
      });
    } else {
      res.json({ success: true, data: null });
    }
  } catch (err) {
    console.error('GET /api/lessons/recent Error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch recent lesson' });
  }
});

// GET /api/lessons/:id - Get a single lesson + progress
lessonsRouter.get('/:id', async (req, res) => {
  try {
    const user_id = req.user?.id;
    const material_id = req.params.id;
    if (!user_id) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const supabase = getSupabaseClient(req);

    const { data: material, error } = await supabase
      .from('learning_materials')
      .select(`
        *,
        learning_progress (
          current_page,
          scroll_position,
          progress_percentage,
          completed,
          last_opened_at
        )
      `)
      .eq('id', material_id)
      .eq('user_id', user_id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!material) return res.status(404).json({ success: false, error: 'Lesson not found' });

    const progress = material.learning_progress?.[0] || {
      current_page: 1,
      scroll_position: 0,
      progress_percentage: 0,
      completed: false
    };

    res.json({ success: true, data: { ...material, learning_progress: progress } });
  } catch (err) {
    console.error('GET /api/lessons/:id Error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch lesson' });
  }
});

// POST /api/lessons - Create a new learning material (after frontend uploads file)
lessonsRouter.post('/', async (req, res) => {
  try {
    const user_id = req.user?.id;
    if (!user_id) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { title, subject_id, file_name, file_url, file_type, file_size, total_pages } = req.body;
    
    if (!title || !file_url || !file_type) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const supabase = getSupabaseClient(req);
    
    const { data: material, error } = await supabase
      .from('learning_materials')
      .insert({
        user_id,
        title,
        subject_id: subject_id || null,
        file_name,
        file_url,
        file_type,
        file_size,
        total_pages: total_pages || 0
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    res.json({ success: true, data: material });
  } catch (err) {
    console.error('POST /api/lessons Error:', err);
    res.status(500).json({ success: false, error: 'Failed to create lesson material' });
  }
});

// POST /api/lessons/:id/progress - Update progress
lessonsRouter.post('/:id/progress', async (req, res) => {
  try {
    const user_id = req.user?.id;
    const material_id = req.params.id;
    if (!user_id) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { current_page, scroll_position, progress_percentage, completed } = req.body;

    const supabase = getSupabaseClient(req);

    // upsert into learning_progress
    const { data, error } = await supabase
      .from('learning_progress')
      .upsert({
        user_id,
        material_id,
        current_page: current_page || 1,
        scroll_position: scroll_position || 0,
        progress_percentage: progress_percentage || 0,
        completed: completed || false,
        last_opened_at: new Date().toISOString()
      }, { onConflict: 'user_id, material_id' })
      .select()
      .single();

    if (error) throw new Error(error.message);

    res.json({ success: true, data });
  } catch (err) {
    console.error('POST /api/lessons/:id/progress Error:', err);
    res.status(500).json({ success: false, error: 'Failed to update progress' });
  }
});

// DELETE /api/lessons/:id - Delete material and progress
lessonsRouter.delete('/:id', async (req, res) => {
  try {
    const user_id = req.user?.id;
    const material_id = req.params.id;
    if (!user_id) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const supabase = getSupabaseClient(req);
    
    const { error } = await supabase
      .from('learning_materials')
      .delete()
      .eq('id', material_id)
      .eq('user_id', user_id);

    if (error) throw new Error(error.message);
    
    // Note: The actual storage object should ideally be deleted too, but Supabase Edge Functions or triggers usually handle that.
    // Or we can delete it from frontend.
    
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/lessons/:id Error:', err);
    res.status(500).json({ success: false, error: 'Failed to delete lesson' });
  }
});

export default lessonsRouter;
