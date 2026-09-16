import { getAccessToken, supabase } from './supabase.js';

const headers = () => {
  const token = getAccessToken();
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
};

const checkOwner = async () => {
  if (!supabase) return window.location.assign('/login.html');
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return window.location.assign('/login.html');

  const { data, error } = await supabase.from('student_profiles').select('role').eq('user_id', session.user.id).single();
  if (error || !data || data.role !== 'owner') {
    alert('Access Denied: You do not have owner privileges.');
    window.location.assign('/');
  }
};

const loadAdmins = async () => {
  const res = await fetch('/api/owner/admins', { headers: headers() });
  if (!res.ok) return;
  const admins = await res.json();
  
  const tbody = document.querySelector('#admins-table tbody');
  tbody.innerHTML = '';
  
  admins.forEach(a => {
    const isOwner = a.role === 'owner';
    const actionBtn = isOwner ? '' : `
      <button class="btn-action btn-danger" onclick="deleteAdmin('${a.user_id}')">Revoke & Delete</button>
    `;

    tbody.innerHTML += `
      <tr>
        <td>${a.full_name || 'N/A'}</td>
        <td>${a.email}</td>
        <td><span style="color: ${isOwner ? '#ff3366' : '#00f0ff'}">${a.role.toUpperCase()}</span></td>
        <td>${actionBtn}</td>
      </tr>
    `;
  });
};

window.deleteAdmin = async (userId) => {
  if (!confirm('Are you sure you want to completely delete this admin account?')) return;
  
  const res = await fetch(`/api/owner/admins/${userId}`, { method: 'DELETE', headers: headers() });
  if (res.ok) loadAdmins();
  else alert('Failed to delete admin');
};

document.getElementById('add-admin-form').onsubmit = async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button');
  btn.disabled = true;
  btn.textContent = 'Creating...';

  const fullName = document.getElementById('admin-name').value;
  const email = document.getElementById('admin-email').value;
  const password = document.getElementById('admin-password').value;
  const role = document.getElementById('admin-role').value;
  
  const res = await fetch('/api/owner/admins', {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ fullName, email, password, role })
  });
  
  btn.disabled = false;
  btn.textContent = 'Create Staff';

  if (res.ok) {
    document.getElementById('admin-message').textContent = 'Account created successfully!';
    e.target.reset();
    setTimeout(() => document.getElementById('admin-message').textContent = '', 3000);
    loadAdmins();
  } else {
    const data = await res.json();
    alert(`Failed: ${data.error}`);
  }
};

document.getElementById('logout-btn').onclick = async () => {
  await supabase.auth.signOut();
  window.location.assign('/login.html');
};

// Init
(async () => {
  await checkOwner();
  loadAdmins();
})();
