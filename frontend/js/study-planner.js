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

// Request Notification Permission for Alarms
if ("Notification" in window) {
  Notification.requestPermission();
}

const loadAssignments = async () => {
  try {
    const res = await fetch('/api/study/assignments', { headers: headers() });
    let rawData = await res.json();
    const data = Array.isArray(rawData) ? rawData : (Array.isArray(rawData?.data) ? rawData.data : (Array.isArray(rawData?.assignments) ? rawData.assignments : []));
    
    const list = document.getElementById('assignment-list');
    list.innerHTML = '';
    
    if (data.length === 0) {
      list.innerHTML = '<p class="muted" style="text-align: center; padding: 20px;">No upcoming assignments! 🎉</p>';
      return;
    }
    
    data.sort((a,b) => new Date(a.due_date) - new Date(b.due_date)).forEach(task => {
      const item = document.createElement('div');
      item.className = 'assignment-item';
      
      const dueDate = new Date(task.due_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
      
      item.innerHTML = `
        <div class="assignment-header">
          <span class="assignment-title">${task.title}</span>
          <span class="priority-badge priority-${task.priority}">${task.priority}</span>
        </div>
        <p style="margin: 0; font-size: 13px; line-height: 1.4;">${task.description || 'No description provided.'}</p>
        <div class="assignment-meta">
          <span>📅 Due: ${dueDate}</span>
          <span class="ai-estimate">✦ AI Estimate: ~${task.estimated_time_minutes} mins</span>
          <button class="btn-secondary" style="margin-left: auto; font-size: 10px; padding: 4px 8px;" onclick="setReminder('${task.title}')">🔔 Set Reminder</button>
        </div>
      `;
      list.appendChild(item);
    });
  } catch (e) {
    console.error(e);
  }
};

const loadTimetable = async () => {
  try {
    const res = await fetch('/api/study/timetable', { headers: headers() });
    let rawData = await res.json();
    const data = Array.isArray(rawData) ? rawData : (Array.isArray(rawData?.data) ? rawData.data : (Array.isArray(rawData?.timetable) ? rawData.timetable : []));
    
    const list = document.getElementById('timetable-list');
    list.innerHTML = '';
    
    if (data.length === 0) {
      list.innerHTML = '<p class="muted">No classes scheduled.</p>';
      return;
    }
    
    const days = { 'Mon':1, 'Tue':2, 'Wed':3, 'Thu':4, 'Fri':5 };
    data.sort((a,b) => days[a.day_of_week] - days[b.day_of_week]).forEach(c => {
      const row = document.createElement('div');
      row.className = 'timetable-row';
      row.innerHTML = `
        <span class="timetable-day">${c.day_of_week}</span>
        <span>${c.subject_name}</span>
        <span class="timetable-time">${c.start_time.substring(0,5)}</span>
      `;
      list.appendChild(row);
    });
  } catch (e) {
    console.error(e);
  }
};

// Global function for onclick
window.setReminder = (title) => {
  if (Notification.permission === "granted") {
    new Notification("Study Alarm Set!", {
      body: `We will remind you to work on: ${title}`,
      icon: "/favicon.ico"
    });
    showToast("Browser reminder activated.");
  } else {
    showToast("Please enable browser notifications.");
  }
};

// Modals
document.getElementById('add-assignment-btn').onclick = () => document.getElementById('assignment-modal').classList.add('show');
document.getElementById('cancel-assign-btn').onclick = () => document.getElementById('assignment-modal').classList.remove('show');

document.getElementById('assignment-form').onsubmit = async (e) => {
  e.preventDefault();
  const btn = document.getElementById('submit-assign-btn');
  btn.disabled = true;
  btn.textContent = 'Generating AI Estimate...';
  
  const payload = {
    title: document.getElementById('assign-title').value,
    description: document.getElementById('assign-desc').value,
    due_date: document.getElementById('assign-date').value,
    priority: document.getElementById('assign-priority').value
  };
  
  const res = await fetch('/api/study/assignments', {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(payload)
  });
  
  btn.disabled = false;
  btn.textContent = 'Create (AI will estimate time)';
  
  if (res.ok) {
    document.getElementById('assignment-modal').classList.remove('show');
    document.getElementById('assignment-form').reset();
    showToast('Assignment created with AI estimate!');
    loadAssignments();
  } else {
    let errMsg = 'Failed to create assignment';
    try {
      const errData = await res.json();
      if (errData.error || errData.message) errMsg = errData.message || errData.error;
    } catch(e) {}
    showToast(errMsg);
  }
};

document.getElementById('add-class-btn').onclick = () => document.getElementById('class-modal').classList.add('show');
document.getElementById('cancel-class-btn').onclick = () => document.getElementById('class-modal').classList.remove('show');

document.getElementById('class-form').onsubmit = async (e) => {
  e.preventDefault();
  const payload = {
    subject_name: document.getElementById('class-subject').value,
    day_of_week: document.getElementById('class-day').value,
    start_time: document.getElementById('class-start').value + ':00',
    end_time: document.getElementById('class-end').value + ':00'
  };
  
  const res = await fetch('/api/study/timetable', {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(payload)
  });
  
  if (res.ok) {
    document.getElementById('class-modal').classList.remove('show');
    document.getElementById('class-form').reset();
    showToast('Class added to timetable');
    loadTimetable();
  }
};

loadAssignments();
loadTimetable();
