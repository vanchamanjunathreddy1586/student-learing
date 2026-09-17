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

const timeAgo = (dateStr) => {
  if (!dateStr) return 'Never';
  const seconds = Math.floor((new Date() - new Date(dateStr)) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const loadStats = async () => {
  try {
    const res = await fetch('/api/owner/stats', { headers: headers() });
    if (!res.ok) throw new Error('Stats fetch failed');
    const stats = await res.json();
    
    // Animate numbers
    const animateValue = (id, start, end, duration) => {
      const obj = document.getElementById(id);
      if (!obj) return;
      let startTimestamp = null;
      const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.innerHTML = Math.floor(progress * (end - start) + start);
        if (progress < 1) {
          window.requestAnimationFrame(step);
        }
      };
      window.requestAnimationFrame(step);
    };

    animateValue("stat-students", 0, stats.totalStudents, 1500);
    animateValue("stat-materials", 0, stats.totalMaterials, 1500);
    animateValue("stat-ai", 0, stats.totalAIQueries, 1500);
    animateValue("stat-active", 0, stats.activeToday, 1500);

    // Populate activity table
    const activityTbody = document.querySelector('#activity-table tbody');
    if (activityTbody && stats.recentActivity) {
      activityTbody.innerHTML = '';
      if (stats.recentActivity.length === 0) {
        activityTbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--occ-text-muted);">No recent activity found.</td></tr>';
      } else {
        stats.recentActivity.forEach(act => {
          activityTbody.innerHTML += `
            <tr>
              <td>
                <div style="font-weight: 500; color: white;">${act.full_name || 'Unknown'}</div>
              </td>
              <td><span class="occ-badge ${act.role}">${act.role}</span></td>
              <td style="color: var(--occ-text-muted);">${act.college || 'N/A'}</td>
              <td>${timeAgo(act.updated_at)}</td>
            </tr>
          `;
        });
      }
    }
  } catch (error) {
    console.error('Error loading stats:', error);
  }
};

const loadAdmins = async () => {
  const res = await fetch('/api/owner/admins', { headers: headers() });
  if (!res.ok) return;
  const admins = await res.json();
  
  const tbody = document.querySelector('#admins-table tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  
  admins.forEach(a => {
    const isOwner = a.role === 'owner';
    const actionBtn = isOwner ? 
      '<span style="color: var(--occ-text-muted); font-size: 0.85rem;"><i class="fas fa-lock"></i> Protected</span>' : 
      `<button class="occ-btn" style="color: var(--occ-danger); border-color: rgba(239, 68, 68, 0.3); padding: 0.4rem 0.8rem; font-size: 0.85rem;" onclick="deleteAdmin('${a.user_id}')"><i class="fas fa-trash-alt"></i> Revoke</button>`;

    tbody.innerHTML += `
      <tr>
        <td>
          <div style="font-weight: 500; color: white;">${a.full_name || 'N/A'}</div>
          <div style="color: var(--occ-text-muted); font-size: 0.85rem;">${a.email}</div>
        </td>
        <td><span class="occ-badge ${a.role}">${a.role}</span></td>
        <td>${actionBtn}</td>
      </tr>
    `;
  });
};

window.deleteAdmin = async (userId) => {
  if (!confirm('CRITICAL ACTION: Are you sure you want to completely delete this admin account?')) return;
  
  const res = await fetch(`/api/owner/admins/${userId}`, { method: 'DELETE', headers: headers() });
  if (res.ok) loadAdmins();
  else alert('Failed to delete admin');
};

const addAdminForm = document.getElementById('add-admin-form');
if (addAdminForm) {
  addAdminForm.onsubmit = async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

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
    btn.innerHTML = originalText;

    if (res.ok) {
      document.getElementById('admin-message').textContent = 'Account provisioned successfully!';
      e.target.reset();
      setTimeout(() => document.getElementById('admin-message').textContent = '', 3000);
      loadAdmins();
    } else {
      const data = await res.json();
      alert(`System Error: ${data.error}`);
    }
  };
}

const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
  logoutBtn.onclick = async (e) => {
    e.preventDefault();
    await supabase.auth.signOut();
    window.location.assign('/login.html');
  };
}

// Navigation functionality
document.querySelectorAll('.occ-nav-item[href^="#"]').forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    // Update active nav
    document.querySelectorAll('.occ-nav-item').forEach(n => n.classList.remove('active'));
    item.classList.add('active');
    
    // Smooth scroll to section
    const targetId = item.getAttribute('href').substring(1);
    const targetEl = document.getElementById(targetId);
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth' });
    }
  });
});

// Init
(async () => {
  await checkOwner();
  loadStats();
  loadAdmins();
})();
