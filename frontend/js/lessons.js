import { supabase, getHeaders } from './supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
  const uploadZone = document.getElementById('upload-zone');
  const fileInput = document.getElementById('file-input');
  const lessonsGrid = document.getElementById('lessons-grid');
  const loading = document.getElementById('lessons-loading');
  const toast = document.getElementById('toast');

  let currentUser = null;

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
    
    await loadLessons();
  };

  const loadLessons = async () => {
    try {
      const response = await fetch('/api/lessons', { headers: getHeaders() });
      const { success, data } = await response.json();
      
      loading.style.display = 'none';

      if (!success) {
        showToast('Failed to load lessons', true);
        return;
      }

      renderLessons(data || []);
    } catch (err) {
      console.error(err);
      loading.style.display = 'none';
      showToast('Connection error', true);
    }
  };

  const renderLessons = (lessons) => {
    if (lessons.length === 0) {
      lessonsGrid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 40px; background: var(--bg-card); border-radius: 12px; border: 1px solid var(--border-color);">
          <h3 style="margin-bottom: 8px;">No lessons yet</h3>
          <p class="muted">Upload your first PDF or document above to start learning.</p>
        </div>
      `;
      return;
    }

    lessonsGrid.innerHTML = lessons.map(lesson => {
      const progress = lesson.progress;
      const pct = Math.round(progress.progress_percentage || 0);
      const isCompleted = progress.completed;
      const statusText = isCompleted ? 'Completed' : (pct > 0 ? `Page ${progress.current_page}` : 'Not started');
      
      return `
        <article class="lesson-card">
          <div class="lesson-tag">${lesson.file_type || 'DOCUMENT'}</div>
          <h3>${lesson.title}</h3>
          <p>${lesson.file_name}</p>
          <div class="lesson-progress">
            <div class="progress-meta">
              <span>${statusText}</span>
              <span>${pct}%</span>
            </div>
            <div class="progress-bar-bg">
              <div class="progress-bar-fill" style="width: ${pct}%; background: ${isCompleted ? 'var(--success, #4caf50)' : 'var(--accent)'}"></div>
            </div>
            <a href="/reader.html?id=${lesson.id}" class="primary-btn" style="width: 100%; text-align: center; margin-top: 16px; text-decoration: none; display: block; box-sizing: border-box;">
              ${pct > 0 && !isCompleted ? 'Continue Learning' : (isCompleted ? 'Review' : 'Start Learning')}
            </a>
          </div>
        </article>
      `;
    }).join('');
  };

  // Upload handling
  uploadZone.addEventListener('click', () => fileInput.click());
  
  uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('dragover');
  });
  
  uploadZone.addEventListener('dragleave', () => {
    uploadZone.classList.remove('dragover');
  });
  
  uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleUpload(e.target.files[0]);
    }
  });

  const handleUpload = async (file) => {
    if (!file) return;
    
    // Only PDF for now in MVP reader, though backend accepts others
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      showToast('Currently only PDF files are supported for reading.', true);
      return;
    }

    try {
      uploadZone.innerHTML = `<i class="fas fa-spinner fa-spin"></i><h3>Uploading ${file.name}...</h3><p class="muted">Please wait</p>`;
      
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `${currentUser.id}/${fileName}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('learning_materials')
        .upload(filePath, file);

      if (uploadError) {
        // If bucket doesn't exist, this fails. We should handle it gracefully.
        throw new Error(`Storage error: ${uploadError.message}`);
      }

      const { data: { publicUrl } } = supabase.storage
        .from('learning_materials')
        .getPublicUrl(filePath);

      // Create Database Record
      const response = await fetch('/api/lessons', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          title: file.name.replace(/\.[^/.]+$/, ""), // remove extension
          file_name: file.name,
          file_url: publicUrl,
          file_type: 'pdf',
          file_size: file.size,
          total_pages: 0 // Will be updated by reader later
        })
      });

      const { success, error } = await response.json();
      if (!success) throw new Error(error || 'Failed to save record');

      showToast('Uploaded successfully!');
      setTimeout(() => window.location.reload(), 1000);

    } catch (err) {
      console.error(err);
      showToast(err.message, true);
      uploadZone.innerHTML = `<i class="fas fa-cloud-upload-alt"></i><h3>Upload Failed</h3><p class="muted">Click to try again</p>`;
    }
  };

  init();
});
