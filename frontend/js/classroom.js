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

let currentSubjectId = null;

const loadSubjects = async () => {
  try {
    const res = await fetch('/api/classroom', { headers: headers() });
    if (!res.ok) throw new Error('Failed to load subjects');
    const subjects = await res.json();
    
    const grid = document.getElementById('subjects-grid');
    // keep the add button
    const addBtn = document.getElementById('add-subject-btn');
    grid.innerHTML = '';
    
    subjects.forEach(sub => {
      const card = document.createElement('div');
      card.className = 'subject-card';
      card.innerHTML = `
        <h3 class="subject-title">${sub.name}</h3>
        <div class="subject-meta"><span>${sub.category}</span> <span>${sub.mastery_percentage}%</span></div>
        <div class="progress"><i style="width:${sub.mastery_percentage}%"></i></div>
      `;
      card.onclick = () => openSubject(sub);
      grid.appendChild(card);
    });
    
    grid.appendChild(addBtn);
  } catch(e) {
    console.error(e);
    showToast('Error loading subjects');
  }
};

const loadTopics = async (subjectId) => {
  try {
    const res = await fetch(`/api/classroom/topics?subject_id=${subjectId}`, { headers: headers() });
    const topics = await res.json();
    
    const list = document.getElementById('topics-list');
    list.innerHTML = '';
    
    if (topics.length === 0) {
      list.innerHTML = '<p class="muted">No topics yet. Add one to get started.</p>';
      return;
    }
    
    topics.forEach(t => {
      const item = document.createElement('div');
      item.className = 'topic-item';
      
      let statusClass = t.mastery_status === 'Weak' ? 'weak' : (t.mastery_status === 'Strong' ? 'strong' : '');
      
      item.innerHTML = `
        <div>
          <strong style="display:block; margin-bottom:5px;">${t.name}</strong>
          <span class="topic-status ${statusClass}">${t.mastery_status}</span>
        </div>
        <button class="btn-secondary" style="font-size: 11px;" onclick="location.href='/quiz.html?topic=${encodeURIComponent(t.name)}'">Quiz</button>
      `;
      list.appendChild(item);
    });
  } catch(e) {
    console.error(e);
  }
};

const openSubject = (subject) => {
  currentSubjectId = subject.id;
  document.getElementById('subjects-view').style.display = 'none';
  document.getElementById('topics-view').style.display = 'block';
  
  document.getElementById('current-subject-title').textContent = subject.name;
  document.getElementById('current-subject-category').textContent = subject.category;
  document.getElementById('current-subject-mastery').textContent = subject.mastery_percentage;
  document.getElementById('current-subject-progress-bar').style.width = subject.mastery_percentage + '%';
  
  loadTopics(subject.id);
};

// UI Events
document.getElementById('add-subject-btn').onclick = () => document.getElementById('subject-modal').classList.add('show');
document.getElementById('cancel-subject-btn').onclick = () => document.getElementById('subject-modal').classList.remove('show');

document.getElementById('subject-form').onsubmit = async (e) => {
  e.preventDefault();
  const name = document.getElementById('subject-name').value;
  const category = document.getElementById('subject-category').value;
  
  const res = await fetch('/api/classroom', {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ name, category })
  });
  
  if (res.ok) {
    document.getElementById('subject-modal').classList.remove('show');
    document.getElementById('subject-form').reset();
    showToast('Subject created');
    loadSubjects();
  }
};

document.getElementById('back-to-subjects').onclick = () => {
  document.getElementById('topics-view').style.display = 'none';
  document.getElementById('subjects-view').style.display = 'block';
  currentSubjectId = null;
};

document.getElementById('add-topic-btn').onclick = () => document.getElementById('topic-modal').classList.add('show');
document.getElementById('cancel-topic-btn').onclick = () => document.getElementById('topic-modal').classList.remove('show');

document.getElementById('topic-form').onsubmit = async (e) => {
  e.preventDefault();
  if (!currentSubjectId) return;
  
  const name = document.getElementById('topic-name').value;
  const res = await fetch('/api/classroom/topics', {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ name, subject_id: currentSubjectId })
  });
  
  if (res.ok) {
    document.getElementById('topic-modal').classList.remove('show');
    document.getElementById('topic-form').reset();
    showToast('Topic created');
    loadTopics(currentSubjectId);
  }
};

// Init
loadSubjects();
