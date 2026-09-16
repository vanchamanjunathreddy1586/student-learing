import { getAccessToken } from './supabase.js';

const headers = () => {
  const token = getAccessToken();
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
};

const showToast = (msg) => {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
};

let currentGroupId = null;

const loadGroups = async () => {
  try {
    const res = await fetch('/api/groups', { headers: headers() });
    const groups = await res.json();
    
    const list = document.getElementById('groups-list');
    list.innerHTML = '';
    
    // Hardcode a global group if empty for demo purposes
    if (groups.length === 0) {
      list.innerHTML = '<p class="muted" style="text-align:center; padding: 20px;">No groups found.</p>';
      return;
    }
    
    groups.forEach(g => {
      const item = document.createElement('div');
      item.className = 'group-item';
      if (currentGroupId === g.id) item.classList.add('active');
      
      const memberCount = g.group_members[0]?.count || 0;
      
      item.innerHTML = `
        <span class="group-name">${g.name}</span>
        <span class="group-meta">${memberCount} members</span>
      `;
      
      item.onclick = () => {
        document.querySelectorAll('.group-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        openGroup(g);
      };
      
      list.appendChild(item);
    });
  } catch (e) {
    console.error(e);
  }
};

const openGroup = (group) => {
  currentGroupId = group.id;
  document.getElementById('current-group-name').textContent = group.name;
  
  // Show join button (mock functionality for now)
  document.getElementById('join-group-btn').style.display = 'block';
  document.getElementById('post-box').style.display = 'block';
  
  loadNotes(group.id);
};

const loadNotes = async (groupId) => {
  try {
    const res = await fetch(`/api/groups/${groupId}/notes`, { headers: headers() });
    const notes = await res.json();
    
    const list = document.getElementById('notes-list');
    list.innerHTML = '';
    
    if (notes.length === 0) {
      list.innerHTML = '<p class="muted" style="text-align:center; margin-top:20px;">No public notes posted yet. Be the first!</p>';
      return;
    }
    
    notes.forEach(note => {
      const card = document.createElement('div');
      card.className = 'note-card';
      
      const email = note.auth_users?.email || 'Anonymous';
      const initial = email[0].toUpperCase();
      const date = new Date(note.created_at).toLocaleDateString();
      
      card.innerHTML = `
        <div class="note-header">
          <div class="note-author">
            <div class="note-avatar">${initial}</div>
            <span>${email.split('@')[0]}</span>
          </div>
          <span class="note-date">${date}</span>
        </div>
        <h4 class="note-title">${note.title}</h4>
        <div class="note-content">${note.content}</div>
      `;
      
      list.appendChild(card);
    });
  } catch(e) {
    console.error(e);
  }
};

document.getElementById('post-note-btn').onclick = async () => {
  if (!currentGroupId) return;
  
  const titleInput = document.getElementById('note-title');
  const contentInput = document.getElementById('note-content');
  
  const title = titleInput.value.trim();
  const content = contentInput.value.trim();
  
  if (!title || !content) {
    showToast('Please enter both title and content.');
    return;
  }
  
  const btn = document.getElementById('post-note-btn');
  btn.disabled = true;
  btn.textContent = 'Posting...';
  
  try {
    const res = await fetch(`/api/groups/${currentGroupId}/notes`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ title, content })
    });
    
    if (res.ok) {
      showToast('Public note posted!');
      titleInput.value = '';
      contentInput.value = '';
      loadNotes(currentGroupId);
    }
  } catch(e) {
    console.error(e);
    showToast('Failed to post note.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Post Public Note';
  }
};

document.getElementById('join-group-btn').onclick = async () => {
  if (!currentGroupId) return;
  try {
    await fetch(`/api/groups/${currentGroupId}/join`, { method: 'POST', headers: headers() });
    showToast('Joined group successfully!');
    loadGroups();
  } catch(e) {
    console.error(e);
  }
};

loadGroups();
