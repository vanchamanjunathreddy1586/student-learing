import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
  const grid = document.getElementById('subjects-grid');
  const loading = document.getElementById('subjects-loading');
  const toast = document.getElementById('toast');
  const addBtn = document.getElementById('add-subject-btn');
  const modal = document.getElementById('add-subject-modal');
  const cancelBtn = document.getElementById('cancel-subject');
  const saveBtn = document.getElementById('save-subject');
  const nameInput = document.getElementById('subject-name');

  const showToast = (msg, isError = false) => {
    toast.textContent = msg;
    toast.style.background = isError ? 'var(--danger)' : 'var(--accent)';
    toast.style.color = isError ? '#fff' : '#000';
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
  };

  const getIconForSubject = (name) => {
    name = name.toLowerCase();
    if (name.includes('math')) return 'fa-calculator';
    if (name.includes('science') || name.includes('physics') || name.includes('chemistry')) return 'fa-flask';
    if (name.includes('computer') || name.includes('data') || name.includes('cyber')) return 'fa-laptop-code';
    if (name.includes('english') || name.includes('language')) return 'fa-language';
    if (name.includes('history')) return 'fa-landmark';
    if (name.includes('art')) return 'fa-palette';
    return 'fa-book';
  };

  const loadSubjects = async () => {
    loading.style.display = 'block';
    grid.style.display = 'none';
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    loading.style.display = 'none';
    grid.style.display = 'grid';

    if (error) {
      showToast('Error loading subjects', true);
      return;
    }

    if (!data || data.length === 0) {
      grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 40px;">No subjects yet. Click "+ Add Subject" to get started.</div>';
      return;
    }

    grid.innerHTML = data.map(subject => `
      <a href="/lessons.html?subject=${encodeURIComponent(subject.name)}" style="text-decoration: none;">
        <article class="stat-card" style="cursor: pointer; transition: transform 0.2s; height: 100%;">
          <div class="stat-icon" style="background: var(--bg-card); color: var(--accent);">
            <i class="fas ${getIconForSubject(subject.name)}"></i>
          </div>
          <div>
            <strong style="display: block; font-size: 20px; margin-bottom: 8px;">${subject.name}</strong>
            <small>Mastery: ${subject.mastery_percentage || 0}%</small>
            <div style="margin-top: 16px; display: flex; gap: 8px; flex-wrap: wrap;">
              <span style="font-size: 12px; background: #ffffff0a; padding: 4px 8px; border-radius: 4px; color: var(--text-secondary);">View Lessons →</span>
              <span style="font-size: 12px; background: #ffffff0a; padding: 4px 8px; border-radius: 4px; color: var(--text-secondary);" onclick="event.preventDefault(); window.location.href='/groups.html?subject=${encodeURIComponent(subject.name)}'">View Groups</span>
            </div>
          </div>
        </article>
      </a>
    `).join('');
  };

  addBtn.addEventListener('click', () => {
    modal.style.display = 'flex';
    nameInput.value = '';
    nameInput.focus();
  });

  cancelBtn.addEventListener('click', () => {
    modal.style.display = 'none';
  });

  saveBtn.addEventListener('click', async () => {
    const name = nameInput.value.trim();
    if (!name) return;

    saveBtn.textContent = 'Saving...';
    saveBtn.disabled = true;

    const { data: { session } } = await supabase.auth.getSession();
    const { error } = await supabase.from('subjects').insert({
      user_id: session.user.id,
      name: name,
      category: 'General'
    });

    saveBtn.textContent = 'Add Subject';
    saveBtn.disabled = false;

    if (error) {
      showToast('Error saving subject', true);
    } else {
      modal.style.display = 'none';
      showToast('Subject added!');
      loadSubjects();
    }
  });

  loadSubjects();
});
