import { supabase, getHeaders } from './supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const groupId = urlParams.get('id');
  if (!groupId) {
    window.location.href = '/groups.html';
    return;
  }

  const toast = document.getElementById('toast');
  let currentUser = null;
  let groupData = null;
  let userRole = null; // admin, member, pending, none

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

    await fetchGroupData();
  };

  const fetchGroupData = async () => {
    // Check membership
    const { data: mem } = await supabase.from('group_members').select('role').eq('group_id', groupId).eq('user_id', currentUser.id).maybeSingle();
    
    // Check pending request
    let pending = false;
    if (!mem) {
      const { data: req } = await supabase.from('group_join_requests').select('status').eq('group_id', groupId).eq('user_id', currentUser.id).eq('status', 'pending').maybeSingle();
      if (req) pending = true;
    }

    userRole = mem ? mem.role : (pending ? 'pending' : 'none');

    // Fetch Group
    const { data: grp, error } = await supabase.from('study_groups').select('*, group_members(count)').eq('id', groupId).single();
    if (error || !grp) {
      document.getElementById('loading').innerHTML = '<p class="muted">Group not found or you do not have permission to view it.</p>';
      return;
    }
    
    groupData = grp;
    if (groupData.created_by === currentUser.id) userRole = 'admin';

    renderHeader();
    
    // If pending or none and private, stop here
    if ((userRole === 'none' || userRole === 'pending') && !groupData.is_public) {
      document.getElementById('loading').style.display = 'none';
      document.getElementById('group-content').style.display = 'block';
      document.getElementById('group-content').innerHTML = `
        <div class="group-header">
          <h1>${groupData.name}</h1>
          <p>This is a private group.</p>
          <p>Your status: ${userRole === 'pending' ? 'Pending Approval' : 'Not a member'}</p>
        </div>
      `;
      return;
    }

    document.getElementById('loading').style.display = 'none';
    document.getElementById('group-content').style.display = 'block';

    if (userRole === 'admin') {
      document.getElementById('admin-tab').style.display = 'inline-block';
      loadJoinRequests();
    }

    setupTabs();
    loadDiscussion();
    loadMaterials();
    loadMembers();
  };

  const renderHeader = () => {
    document.getElementById('gh-name').textContent = groupData.name;
    document.getElementById('gh-desc').textContent = groupData.description || 'No description';
    document.getElementById('gh-subject').textContent = groupData.subject || 'General';
    document.getElementById('gh-privacy').textContent = groupData.is_public ? 'Public' : 'Private';
    document.getElementById('gh-members').innerHTML = `<i class="fas fa-users"></i> ${groupData.group_members[0]?.count || 0}`;
  };

  const setupTabs = () => {
    const tabs = document.querySelectorAll('.group-tabs button');
    const contents = document.querySelectorAll('.tab-content');
    tabs.forEach(t => {
      t.addEventListener('click', () => {
        tabs.forEach(btn => btn.classList.remove('active'));
        contents.forEach(c => c.style.display = 'none');
        t.classList.add('active');
        document.getElementById(`tab-${t.dataset.tab}`).style.display = 'block';
      });
    });
  };

  // DISCUSSION
  const loadDiscussion = async () => {
    const { data } = await supabase.from('group_posts').select('*, auth.users(email)').eq('group_id', groupId).order('created_at', { ascending: false });
    const c = document.getElementById('posts-container');
    if (!data || data.length === 0) {
      c.innerHTML = '<p class="muted">No messages yet.</p>';
      return;
    }
    c.innerHTML = data.map(p => `
      <div class="post-card">
        <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
          <strong style="color:var(--accent);">${p.user_id === currentUser.id ? 'You' : 'Student'}</strong>
          <small style="color:var(--text-secondary);">${new Date(p.created_at).toLocaleString()}</small>
        </div>
        <div style="color:var(--text-primary); white-space: pre-wrap;">${p.content}</div>
      </div>
    `).join('');
  };

  document.getElementById('submit-post').addEventListener('click', async () => {
    const input = document.getElementById('post-content');
    const val = input.value.trim();
    if (!val) return;
    
    document.getElementById('submit-post').disabled = true;
    const { error } = await supabase.from('group_posts').insert({ group_id: groupId, user_id: currentUser.id, content: val });
    document.getElementById('submit-post').disabled = false;
    
    if (error) {
      showToast('Error posting', true);
    } else {
      input.value = '';
      loadDiscussion();
    }
  });

  // MEMBERS
  const loadMembers = async () => {
    const { data } = await supabase.from('group_members').select('*').eq('group_id', groupId);
    const c = document.getElementById('members-list');
    if (!data) return;
    c.innerHTML = data.map(m => `
      <div class="member-row">
        <div>
          <strong style="color:var(--text-primary);">${m.user_id === currentUser.id ? 'You' : 'Student'}</strong>
          ${m.role === 'admin' ? '<span style="font-size:10px; background:var(--accent); color:#000; padding:2px 6px; border-radius:4px; margin-left:8px;">Admin</span>' : ''}
        </div>
        <small style="color:var(--text-secondary);">Joined ${new Date(m.joined_at).toLocaleDateString()}</small>
      </div>
    `).join('');
  };

  // ADMIN - Requests
  const loadJoinRequests = async () => {
    const { data } = await supabase.from('group_join_requests').select('*').eq('group_id', groupId).eq('status', 'pending');
    const c = document.getElementById('requests-list');
    if (!data || data.length === 0) {
      c.innerHTML = '<p class="muted">No pending requests.</p>';
      document.getElementById('req-badge').style.display = 'none';
      return;
    }
    
    document.getElementById('req-badge').style.display = 'inline-block';
    c.innerHTML = data.map(r => `
      <div class="member-row" style="background:#ffffff05; border-radius:8px; margin-bottom:8px;">
        <span style="color:var(--text-primary);">Student Request</span>
        <div style="display:flex; gap:8px;">
          <button class="primary-btn approve-btn" data-id="${r.id}" data-uid="${r.user_id}" style="padding:4px 12px; font-size:12px;">Approve</button>
          <button class="primary-btn reject-btn" data-id="${r.id}" style="padding:4px 12px; font-size:12px; background:var(--danger);">Reject</button>
        </div>
      </div>
    `).join('');

    document.querySelectorAll('.approve-btn').forEach(btn => btn.addEventListener('click', async (e) => {
      const rid = e.target.dataset.id;
      const uid = e.target.dataset.uid;
      await supabase.from('group_members').insert({ group_id: groupId, user_id: uid });
      await supabase.from('group_join_requests').update({ status: 'approved' }).eq('id', rid);
      showToast('Approved!');
      loadJoinRequests();
      loadMembers();
    }));

    document.querySelectorAll('.reject-btn').forEach(btn => btn.addEventListener('click', async (e) => {
      const rid = e.target.dataset.id;
      await supabase.from('group_join_requests').update({ status: 'rejected' }).eq('id', rid);
      showToast('Rejected.');
      loadJoinRequests();
    }));
  };

  // MATERIALS
  const loadMaterials = async () => {
    const { data } = await supabase.from('group_materials').select('*, learning_materials(*)').eq('group_id', groupId);
    const c = document.getElementById('materials-grid');
    if (!data || data.length === 0) {
      c.innerHTML = '<p class="muted" style="grid-column:1/-1;">No materials shared with this group yet.</p>';
      return;
    }
    c.innerHTML = data.map(m => {
      const lm = m.learning_materials;
      if(!lm) return '';
      return `
        <article class="stat-card">
          <div class="stat-icon" style="background:var(--bg-card); color:var(--accent);"><i class="fas fa-file-alt"></i></div>
          <strong style="display:block; margin:8px 0; font-size:16px;">${lm.title}</strong>
          <small style="color:var(--text-secondary); display:block; margin-bottom:12px;">Shared on ${new Date(m.created_at).toLocaleDateString()}</small>
          <a href="/reader.html?id=${lm.id}" class="primary-btn" style="text-align:center; display:block; text-decoration:none; padding:8px;">Open</a>
        </article>
      `;
    }).join('');
  };

  // SHARE MODAL
  const shareBtn = document.getElementById('share-material-btn');
  const modal = document.getElementById('share-modal');
  let selectedMaterialId = null;

  shareBtn.addEventListener('click', async () => {
    modal.style.display = 'flex';
    document.getElementById('my-materials-loading').style.display = 'block';
    document.getElementById('my-materials-list').style.display = 'none';

    const { data } = await supabase.from('learning_materials').select('*').eq('user_id', currentUser.id);
    document.getElementById('my-materials-loading').style.display = 'none';
    const list = document.getElementById('my-materials-list');
    list.style.display = 'block';

    if (!data || data.length === 0) {
      list.innerHTML = '<p class="muted" style="text-align:center;">You have no materials to share. Upload some in Lessons first.</p>';
      return;
    }

    list.innerHTML = data.map(m => `
      <div class="mat-select-row" data-id="${m.id}" style="padding:12px; border-bottom:1px solid var(--border); cursor:pointer; color:var(--text-primary); transition:background 0.2s;">
        <i class="fas fa-file"></i> ${m.title}
      </div>
    `).join('');

    document.querySelectorAll('.mat-select-row').forEach(row => {
      row.addEventListener('click', (e) => {
        document.querySelectorAll('.mat-select-row').forEach(r => r.style.background = 'transparent');
        row.style.background = '#ffffff1a';
        selectedMaterialId = row.dataset.id;
        document.getElementById('confirm-share').disabled = false;
      });
    });
  });

  document.getElementById('cancel-share').addEventListener('click', () => {
    modal.style.display = 'none';
    selectedMaterialId = null;
    document.getElementById('confirm-share').disabled = true;
  });

  document.getElementById('confirm-share').addEventListener('click', async () => {
    if (!selectedMaterialId) return;
    const btn = document.getElementById('confirm-share');
    btn.disabled = true;
    btn.textContent = 'Sharing...';

    const { error } = await supabase.from('group_materials').insert({
      group_id: groupId,
      material_id: selectedMaterialId,
      shared_by: currentUser.id
    });

    if (error) {
      if (error.code === '23505') showToast('Already shared!');
      else showToast('Error sharing material', true);
    } else {
      showToast('Material shared!');
      loadMaterials();
    }

    modal.style.display = 'none';
    selectedMaterialId = null;
    btn.textContent = 'Share Selected';
  });

  init();
});
