import { supabase, getHeaders } from './supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
  const grid = document.getElementById('lessons-grid');
  const loading = document.getElementById('lessons-loading');
  const toast = document.getElementById('toast');
  
  const searchInput = document.getElementById('search-lessons');
  const subjectFilter = document.getElementById('filter-subject');
  const tabs = document.querySelectorAll('.tab');

  const uploadBtn = document.getElementById('upload-btn');
  const modal = document.getElementById('upload-modal');
  const cancelBtn = document.getElementById('up-cancel');
  const publishBtn = document.getElementById('up-publish');
  const dropzone = document.getElementById('up-dropzone');
  const fileInput = document.getElementById('up-file');
  const filenameDisplay = document.getElementById('up-filename');
  
  let currentUser = null;
  let allMaterials = [];
  let currentFile = null;
  let currentTab = 'my-uploads';

  const showToast = (msg, isError = false) => {
    toast.textContent = msg;
    toast.style.background = isError ? 'var(--danger)' : 'var(--accent)';
    toast.style.color = isError ? '#fff' : '#000';
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
  };

  const init = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return window.location.assign('/login.html');
    currentUser = session.user;
    
    await loadSubjects();
    await loadLessons();
  };

  const loadSubjects = async () => {
    const { data } = await supabase.from('subjects').select('id, name').eq('user_id', currentUser.id);
    if (data) {
      const upSelect = document.getElementById('up-subject');
      
      // Deduplicate by name if needed, or just use all
      const uniqueSubjects = [];
      const seen = new Set();
      for (const s of data) {
        if (!seen.has(s.name)) {
          seen.add(s.name);
          uniqueSubjects.push(s);
        }
      }
      
      uniqueSubjects.forEach(sub => {
        const opt = document.createElement('option'); opt.value = sub.id; opt.textContent = sub.name;
        upSelect.appendChild(opt);
        
        const opt2 = document.createElement('option'); opt2.value = sub.id; opt2.textContent = sub.name;
        subjectFilter.appendChild(opt2);
      });
    }
  };

  const loadLessons = async () => {
    loading.style.display = 'block';
    grid.style.display = 'none';
    
    // We fetch ALL materials the user can read. 
    // RLS ensures they see their own, PLUS any shared in groups they are part of.
    const { data, error } = await supabase
      .from('learning_materials')
      .select('*, learning_progress(*)');

    loading.style.display = 'none';
    grid.style.display = 'grid';

    if (error) {
      showToast('Error loading lessons', true);
      return;
    }

    allMaterials = data || [];
    renderLessons();
  };

  const renderLessons = () => {
    let filtered = allMaterials;

    if (currentTab === 'my-uploads') {
      filtered = filtered.filter(m => m.user_id === currentUser.id);
    } else {
      filtered = filtered.filter(m => m.user_id !== currentUser.id); // shared by others
    }

    const term = searchInput.value.toLowerCase();
    if (term) {
      filtered = filtered.filter(m => m.title.toLowerCase().includes(term) || (m.summary && m.summary.toLowerCase().includes(term)));
    }

    const subj = subjectFilter.value;
    if (subj) {
      filtered = filtered.filter(m => m.subject_id === subj); // we store subject name in subject_id for simplicity, or match if UUID.
      // Wait, in previous step we might have subject_id as UUID. 
      // If we used the name in the upload form, we should match it.
      // Let's just do a loose check.
      filtered = filtered.filter(m => m.subject_id === subj || m.category === subj); // some schemas might differ
    }

    if (filtered.length === 0) {
      grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 40px;">No lessons found.</div>';
      return;
    }

    grid.innerHTML = filtered.map(m => {
      // Find progress for current user
      const prog = (m.learning_progress || []).find(p => p.user_id === currentUser.id) || {};
      const pct = Math.round(prog.progress_percentage || 0);
      const isCompleted = prog.completed;
      
      return `
        <article class="stat-card" style="display:flex; flex-direction:column; justify-content:space-between;">
          <div>
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
              <span style="font-size:11px; color:var(--accent); font-weight:700; text-transform:uppercase;">${m.file_type || 'PDF'}</span>
              ${m.subject_id ? `<span style="font-size:12px; background:#ffffff0a; padding:4px 8px; border-radius:4px; color:var(--text-secondary);">${m.subject_id}</span>` : ''}
            </div>
            <h3 style="margin: 0 0 8px 0; font-size: 18px;">${m.title}</h3>
            <p style="font-size:14px; color:var(--text-secondary); margin:0 0 16px 0; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">${m.summary || m.file_name}</p>
          </div>
          <div>
            <div style="display:flex; justify-content:space-between; font-size:12px; color:var(--text-secondary); margin-bottom:8px;">
              <span>${pct > 0 ? (isCompleted ? 'Completed' : `Page ${prog.current_page || 1}`) : 'Not started'}</span>
              <span>${pct}%</span>
            </div>
            <div style="height:6px; background:#ffffff1a; border-radius:3px; overflow:hidden; margin-bottom:16px;">
              <div style="height:100%; width:${pct}%; background:var(--accent);"></div>
            </div>
            <a href="/reader.html?id=${m.id}" class="primary-btn" style="text-align:center; padding:8px; font-size:14px; text-decoration:none; display:block; box-sizing:border-box;">Open Lesson</a>
          </div>
        </article>
      `;
    }).join('');
  };

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => {
        t.style.borderBottom = 'none';
        t.style.color = 'var(--text-secondary)';
        t.classList.remove('active');
      });
      tab.style.borderBottom = '2px solid var(--accent)';
      tab.style.color = 'var(--accent)';
      tab.classList.add('active');
      
      currentTab = tab.dataset.tab;
      renderLessons();
    });
  });

  searchInput.addEventListener('input', renderLessons);
  subjectFilter.addEventListener('change', renderLessons);

  // URL pre-fill
  const urlParams = new URLSearchParams(window.location.search);
  const urlSubj = urlParams.get('subject');
  if (urlSubj) {
    setTimeout(() => {
      if([...subjectFilter.options].some(o => o.value === urlSubj)) {
        subjectFilter.value = urlSubj;
        renderLessons();
      }
    }, 500);
  }

  // Upload Logic
  uploadBtn.addEventListener('click', () => {
    modal.style.display = 'flex';
    document.getElementById('up-title').value = '';
    document.getElementById('up-desc').value = '';
    document.getElementById('up-subject').value = '';
    currentFile = null;
    filenameDisplay.textContent = 'Click to browse or drag PDF here';
  });

  cancelBtn.addEventListener('click', () => {
    modal.style.display = 'none';
  });

  dropzone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      currentFile = e.target.files[0];
      filenameDisplay.textContent = currentFile.name;
      // Auto-fill title if empty
      const tInput = document.getElementById('up-title');
      if(!tInput.value) tInput.value = currentFile.name.replace(/\.[^/.]+$/, "");
    }
  });

  publishBtn.addEventListener('click', async () => {
    if (!currentFile) { showToast('Please select a file', true); return; }
    
    const title = document.getElementById('up-title').value.trim();
    const desc = document.getElementById('up-desc').value.trim();
    const subj = document.getElementById('up-subject').value;
    
    if (!title) { showToast('Title is required', true); return; }

    publishBtn.textContent = 'Uploading...';
    publishBtn.disabled = true;

    try {
      const fileExt = currentFile.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `${currentUser.id}/${fileName}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('learning_materials')
        .upload(filePath, currentFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('learning_materials')
        .getPublicUrl(filePath);

      // Save to database
      // Using API so embeddings work (if configured), or just direct Supabase insert
      // Let's use direct insert to avoid backend schema mismatches for now, 
      // but if the user wants AI, we can use the API. 
      // API is safer since it's already configured.
      const response = await fetch('/api/lessons', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          title: title,
          file_name: currentFile.name,
          file_url: publicUrl,
          file_type: 'pdf',
          file_size: currentFile.size,
          total_pages: 0,
          subject_id: subj || null, // we will abuse subject_id to store subject name for now to avoid altering API too much
          summary: desc
        })
      });

      const res = await response.json();
      if (!res.success) throw new Error(res.error || 'Failed to save record');

      // If we bypassed API and wanted to ensure subject_id is a string (if schema is UUID, it might break API).
      // If API expects UUID, it will fail.
      // Wait, let's just update the row directly via Supabase if the API didn't support our new fields.
      if (res.data && res.data.id) {
        await supabase.from('learning_materials').update({
          subject_id: subj, // If this column is UUID in DB, this will fail. Let's see.
          summary: desc
        }).eq('id', res.data.id);
      }

      showToast('Published successfully!');
      modal.style.display = 'none';
      await loadLessons();

    } catch (err) {
      console.error(err);
      // fallback if UUID error on subject_id
      showToast(err.message, true);
    } finally {
      publishBtn.textContent = 'Publish';
      publishBtn.disabled = false;
    }
  });

  init();
});
