import { getAccessToken, supabase } from './supabase.js';

const headers = () => {
  const token = getAccessToken();
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
};

const checkAdmin = async () => {
  if (!supabase) return window.location.assign('/login.html');
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return window.location.assign('/login.html');

  const { data, error } = await supabase.from('student_profiles').select('role').eq('user_id', session.user.id).single();
  if (error || !data || !['admin', 'owner'].includes(data.role)) {
    alert('Access Denied: You do not have admin privileges.');
    window.location.assign('/');
  }
};

const loadStudents = async () => {
  const res = await fetch('/api/admin/students', { headers: headers() });
  if (!res.ok) return;
  const students = await res.json();
  
  const tbody = document.querySelector('#students-table tbody');
  tbody.innerHTML = '';
  
  students.forEach(s => {
    let statusBadge = '';
    if (s.role === 'admin') statusBadge = '<span class="status-badge status-admin">Admin</span>';
    else if (s.is_banned) statusBadge = '<span class="status-badge status-banned">Banned</span>';
    else statusBadge = '<span class="status-badge status-active">Active</span>';

    const actionBtn = s.role === 'admin' ? '' : `
      <button class="btn-action ${s.is_banned ? '' : 'btn-danger'}" onclick="toggleBan('${s.user_id}', ${!s.is_banned})">
        ${s.is_banned ? 'Unban' : 'Ban'}
      </button>
    `;

    tbody.innerHTML += `
      <tr>
        <td>${s.full_name || 'N/A'}</td>
        <td>${s.email}</td>
        <td>${s.college || 'N/A'}</td>
        <td>${s.total_study_minutes} mins</td>
        <td>${statusBadge}</td>
        <td>${actionBtn}</td>
      </tr>
    `;
  });
};

window.toggleBan = async (userId, banState) => {
  if (!confirm(`Are you sure you want to ${banState ? 'ban' : 'unban'} this user?`)) return;
  
  const res = await fetch(`/api/admin/students/${userId}/ban`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ is_banned: banState })
  });
  
  if (res.ok) loadStudents();
  else alert('Failed to update ban status');
};

const loadColleges = async () => {
  const res = await fetch('/api/admin/colleges', { headers: headers() });
  if (!res.ok) return;
  const colleges = await res.json();
  
  const tbody = document.querySelector('#colleges-table tbody');
  const select = document.querySelector('#subject-college');
  tbody.innerHTML = '';
  select.innerHTML = '<option value="">Global (All Colleges)</option>';
  
  colleges.forEach(c => {
    tbody.innerHTML += `
      <tr>
        <td>${c.name}</td>
        <td><span class="status-badge status-active">${c.status}</span></td>
        <td>${new Date(c.created_at).toLocaleDateString()}</td>
        <td><button class="btn-action btn-danger" onclick="deleteCollege('${c.id}')">Delete</button></td>
      </tr>
    `;
    select.innerHTML += `<option value="${c.id}">${c.name}</option>`;
  });
};

window.deleteCollege = async (id) => {
  if (!confirm('Are you sure you want to delete this college?')) return;
  const res = await fetch(`/api/admin/colleges/${id}`, { method: 'DELETE', headers: headers() });
  if (res.ok) { loadColleges(); loadSubjects(); }
};

document.getElementById('add-college-form').onsubmit = async (e) => {
  e.preventDefault();
  const name = document.getElementById('college-name').value;
  const res = await fetch('/api/admin/colleges', {
    method: 'POST', headers: headers(), body: JSON.stringify({ name })
  });
  if (res.ok) {
    document.getElementById('college-name').value = '';
    loadColleges();
  }
};

const loadSubjects = async () => {
  const res = await fetch('/api/admin/subjects', { headers: headers() });
  if (!res.ok) return;
  const subjects = await res.json();
  
  const tbody = document.querySelector('#subjects-table tbody');
  tbody.innerHTML = '';
  
  subjects.forEach(s => {
    const collegeName = s.colleges?.name || 'Global';
    tbody.innerHTML += `
      <tr>
        <td>${s.name}</td>
        <td>${s.category}</td>
        <td>${collegeName}</td>
        <td><button class="btn-action btn-danger" onclick="deleteSubject('${s.id}')">Delete</button></td>
      </tr>
    `;
  });
};

window.deleteSubject = async (id) => {
  if (!confirm('Are you sure you want to delete this subject?')) return;
  const res = await fetch(`/api/admin/subjects/${id}`, { method: 'DELETE', headers: headers() });
  if (res.ok) loadSubjects();
};

document.getElementById('add-subject-form').onsubmit = async (e) => {
  e.preventDefault();
  const name = document.getElementById('subject-name').value;
  const category = document.getElementById('subject-category').value;
  const college_id = document.getElementById('subject-college').value || null;
  
  const res = await fetch('/api/admin/subjects', {
    method: 'POST', headers: headers(), body: JSON.stringify({ name, category, college_id })
  });
  if (res.ok) {
    document.getElementById('subject-name').value = '';
    document.getElementById('subject-category').value = '';
    loadSubjects();
  }
};

// Tabs
document.querySelectorAll('.admin-tab').forEach(tab => {
  tab.onclick = () => {
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(tab.dataset.target).classList.add('active');
  };
});

document.getElementById('logout-btn').onclick = () => window.location.assign('/');

// Init
(async () => {
  await checkAdmin();
  loadStudents();
  loadColleges();
  loadSubjects();
})();
