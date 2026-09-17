import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
  const grid = document.getElementById('groups-grid');
  const loading = document.getElementById('groups-loading');
  const toast = document.getElementById('toast');
  const tabs = document.querySelectorAll('.tab');
  
  const createBtn = document.getElementById('create-group-btn');
  const modal = document.getElementById('create-group-modal');
  const cancelBtn = document.getElementById('cancel-create');
  const saveBtn = document.getElementById('save-create');
  
  const searchInput = document.getElementById('search-groups');
  const subjectFilter = document.getElementById('filter-subject');
  const privacyFilter = document.getElementById('filter-privacy');
  
  let currentTab = 'discover';
  let currentUser = null;
  let allGroups = [];
  let userMemberships = {}; // group_id -> role

  const showToast = (msg, isError = false) => {
    toast.textContent = msg;
    toast.style.background = isError ? 'var(--danger)' : 'var(--accent)';
    toast.style.color = isError ? '#fff' : '#000';
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
  };

  const init = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    currentUser = session.user;

    await loadSubjects();
    await loadMemberships();
    await loadGroups();
  };

  const loadSubjects = async () => {
    const { data } = await supabase.from('subjects').select('name').eq('user_id', currentUser.id);
    if (data) {
      const select = document.getElementById('group-subject');
      const uniqueSubjects = [...new Set(data.map(s => s.name))];
      
      uniqueSubjects.forEach(sub => {
        // Populate modal select
        const opt = document.createElement('option');
        opt.value = sub; opt.textContent = sub;
        select.appendChild(opt);
        
        // Populate filter select
        const opt2 = document.createElement('option');
        opt2.value = sub; opt2.textContent = sub;
        subjectFilter.appendChild(opt2);
      });
    }
  };

  const loadMemberships = async () => {
    const { data } = await supabase.from('group_members').select('group_id, role').eq('user_id', currentUser.id);
    userMemberships = {};
    if (data) {
      data.forEach(m => userMemberships[m.group_id] = m.role);
    }
  };

  const loadGroups = async () => {
    loading.style.display = 'block';
    grid.style.display = 'none';

    let query = supabase.from('study_groups').select(`
      *,
      group_members(count)
    `);

    const { data, error } = await query.order('created_at', { ascending: false });

    loading.style.display = 'none';
    grid.style.display = 'grid';

    if (error) {
      showToast('Error loading groups', true);
      return;
    }

    allGroups = data || [];
    renderGroups();
  };

  const renderGroups = () => {
    let filtered = allGroups;

    // Filter by tab
    if (currentTab === 'my-groups') {
      filtered = filtered.filter(g => userMemberships[g.id] || g.created_by === currentUser.id);
    }

    // Filter by search
    const term = searchInput.value.toLowerCase();
    if (term) {
      filtered = filtered.filter(g => g.name.toLowerCase().includes(term) || (g.description && g.description.toLowerCase().includes(term)));
    }

    // Filter by subject
    const subj = subjectFilter.value;
    if (subj) {
      filtered = filtered.filter(g => g.subject === subj);
    }

    // Filter by privacy
    const priv = privacyFilter.value;
    if (priv === 'public') filtered = filtered.filter(g => g.is_public);
    if (priv === 'private') filtered = filtered.filter(g => !g.is_public);

    if (filtered.length === 0) {
      grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 40px;">No groups found matching your criteria.</div>';
      return;
    }

    grid.innerHTML = filtered.map(g => {
      const memberCount = g.group_members[0]?.count || 0;
      const isMember = userMemberships[g.id];
      const isCreator = g.created_by === currentUser.id;
      
      let actionBtn = '';
      if (isCreator || isMember) {
        actionBtn = `<a href="/group-details.html?id=${g.id}" class="primary-btn" style="text-align:center; padding:8px; font-size:14px; text-decoration:none; display:block; box-sizing:border-box;">Open Group</a>`;
      } else if (g.is_public) {
        actionBtn = `<button class="primary-btn join-btn" data-id="${g.id}" data-type="public" style="width:100%; padding:8px; font-size:14px;">Join Group</button>`;
      } else {
        actionBtn = `<button class="primary-btn join-btn" data-id="${g.id}" data-type="private" style="width:100%; padding:8px; font-size:14px; background:transparent; border:1px solid var(--accent); color:var(--accent);">Request to Join</button>`;
      }

      return `
        <article class="stat-card" style="display:flex; flex-direction:column; justify-content:space-between;">
          <div>
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
              <div class="stat-icon" style="background: var(--bg-card); color: var(--accent); margin:0;">
                <i class="fas ${g.is_public ? 'fa-globe' : 'fa-lock'}"></i>
              </div>
              <span style="font-size:12px; background:#ffffff0a; padding:4px 8px; border-radius:4px; color:var(--text-secondary);">${g.subject || 'General'}</span>
            </div>
            <strong style="display: block; font-size: 18px; margin-bottom: 8px;">${g.name}</strong>
            <p style="font-size:14px; color:var(--text-secondary); margin:0 0 16px 0; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">${g.description || 'No description'}</p>
          </div>
          <div>
            <div style="display:flex; justify-content:space-between; font-size:12px; color:var(--text-secondary); margin-bottom:16px;">
              <span><i class="fas fa-users"></i> ${memberCount} Members</span>
              <span>${g.is_public ? 'Public' : 'Private'}</span>
            </div>
            ${actionBtn}
          </div>
        </article>
      `;
    }).join('');

    // Attach join listeners
    document.querySelectorAll('.join-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.dataset.id;
        const type = e.target.dataset.type;
        btn.textContent = 'Processing...';
        btn.disabled = true;

        if (type === 'public') {
          const { error } = await supabase.from('group_members').insert({ group_id: id, user_id: currentUser.id, role: 'member' });
          if (!error) {
            showToast('Joined group!');
            window.location.href = `/group-details.html?id=${id}`;
          } else {
            showToast('Error joining group', true);
            btn.textContent = 'Join Group';
            btn.disabled = false;
          }
        } else {
          const { error } = await supabase.from('group_join_requests').insert({ group_id: id, user_id: currentUser.id });
          if (!error) {
            showToast('Request sent to admin!');
            btn.textContent = 'Request Sent';
          } else {
            showToast('Request already sent or error', true);
            btn.textContent = 'Request to Join';
            btn.disabled = false;
          }
        }
      });
    });
  };

  // Tabs
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
      document.getElementById('group-title').textContent = currentTab === 'discover' ? 'Discover Groups' : 'My Groups';
      renderGroups();
    });
  });

  // Filters
  searchInput.addEventListener('input', renderGroups);
  subjectFilter.addEventListener('change', renderGroups);
  privacyFilter.addEventListener('change', renderGroups);

  // Modal
  createBtn.addEventListener('click', () => {
    modal.style.display = 'flex';
  });

  cancelBtn.addEventListener('click', () => {
    modal.style.display = 'none';
  });

  saveBtn.addEventListener('click', async () => {
    const name = document.getElementById('group-name').value.trim();
    const subject = document.getElementById('group-subject').value;
    const desc = document.getElementById('group-desc').value.trim();
    const isPublic = document.getElementById('group-privacy').value === 'true';

    if (!name || !subject) {
      showToast('Name and Subject are required', true);
      return;
    }

    saveBtn.textContent = 'Creating...';
    saveBtn.disabled = true;

    // Insert group
    const { data: groupData, error: groupErr } = await supabase.from('study_groups').insert({
      name,
      subject,
      description: desc,
      is_public: isPublic,
      created_by: currentUser.id
    }).select().single();

    if (groupErr) {
      showToast('Error creating group', true);
      saveBtn.textContent = 'Create Group';
      saveBtn.disabled = false;
      return;
    }

    // Insert member (admin)
    await supabase.from('group_members').insert({
      group_id: groupData.id,
      user_id: currentUser.id,
      role: 'admin'
    });

    modal.style.display = 'none';
    showToast('Group created!');
    window.location.href = `/group-details.html?id=${groupData.id}`;
  });

  // Pre-fill subject filter if in URL
  const urlParams = new URLSearchParams(window.location.search);
  const urlSubj = urlParams.get('subject');
  if (urlSubj) {
    // Wait slightly for subjects to load into select
    setTimeout(() => {
      if([...subjectFilter.options].some(o => o.value === urlSubj)) {
        subjectFilter.value = urlSubj;
        renderGroups();
      }
    }, 500);
  }

  init();
});
