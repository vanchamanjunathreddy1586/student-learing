import { getAccessToken } from './supabase.js';

const headers = () => {
  const token = getAccessToken();
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
};

const loadAnalytics = async () => {
  try {
    const res = await fetch('/api/analytics/summary', { headers: headers() });
    if (!res.ok) return;
    const data = await res.json();
    
    // Gamification
    document.getElementById('player-level').textContent = data.level || 1;
    document.getElementById('current-xp').textContent = `${data.xp || 0} XP`;
    document.getElementById('current-streak').innerHTML = `${data.streak || 0} Days 🔥`;
    
    const nextLvl = (data.level || 1) * 1000;
    document.getElementById('next-level-xp').textContent = `${nextLvl} XP`;
    
    const percentage = Math.min(100, ((data.xp || 0) / nextLvl) * 100);
    document.getElementById('xp-bar').style.width = `${percentage}%`;
    
    const focusMins = data.weekly_minutes ? data.weekly_minutes.reduce((a,b)=>a+b, 0) : 0;
    const hours = Math.floor(focusMins / 60);
    const mins = focusMins % 60;
    document.getElementById('total-time').textContent = `${hours}h ${mins}m (This Week)`;
    
  } catch(e) {
    console.error(e);
  }
};

loadAnalytics();
