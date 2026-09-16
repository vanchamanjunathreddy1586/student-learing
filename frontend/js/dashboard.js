import { supabase } from './supabase.js';

const loading = document.querySelector('#dashboard-loading');
const shell = document.querySelector('#dashboard-shell');
const initials = (name) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'SL';
const greetingForHour = (hour) => hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : hour < 21 ? 'Good Evening' : 'Good Night';

const redirectOAuthError = () => {
  const params = new URLSearchParams(window.location.search);
  if (!params.get('error')) return false;
  console.error('Supabase Auth Error:', {
    error: params.get('error'),
    code: params.get('error_code'),
    description: params.get('error_description'),
  });
  window.location.replace(`/login.html?oauth_error=${encodeURIComponent(params.get('error_description') || params.get('error'))}`);
  return true;
};

const showProfile = (profile, user) => {
  const fullName = String(profile?.full_name || user.user_metadata?.full_name || '').trim();
  const name = fullName || 'Student';
  const complete = Boolean(profile?.full_name && profile?.year && profile?.college);
  const shortName = name.split(/\s+/)[0];
  document.querySelector('#greeting').innerHTML = `${greetingForHour(new Date().getHours())}, ${shortName} <span>👋</span>`;
  document.querySelector('#today-label').textContent = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date()).toUpperCase();
  document.querySelectorAll('[data-profile-name]').forEach((element) => { element.textContent = name; });
  document.querySelectorAll('[data-profile-initials]').forEach((element) => { element.textContent = initials(name); });
  document.querySelector('[data-profile-year]').textContent = profile?.year || 'Not added yet';
  document.querySelector('[data-profile-college]').textContent = profile?.college || 'Not added yet';
  document.querySelector('#profile-completion').hidden = complete;
};

const initializeDashboard = async () => {
  if (redirectOAuthError()) return;
  if (!supabase) {
    window.location.assign('/login.html');
    return;
  }

  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.user) {
      window.location.assign('/login.html');
      return;
    }

    const { data: profile, error: profileError } = await supabase.from('student_profiles').select('full_name, college, year, profile_completed, role, is_banned').eq('user_id', session.user.id).maybeSingle();
    // Ignore PGRST116 (0 rows) and 42P01 (relation doesn't exist)
    if (profileError && profileError.code !== 'PGRST116' && profileError.code !== '42P01') throw profileError;
    
    if (profile?.is_banned) {
      await supabase.auth.signOut();
      alert('Your account has been suspended by an administrator.');
      window.location.assign('/login.html');
      return;
    }
    
    // Add Admin button if they are an admin
    if (profile?.role === 'admin') {
      const nav = document.querySelector('.desktop-nav');
      if (nav && !document.getElementById('admin-link')) {
        const adminLink = document.createElement('a');
        adminLink.id = 'admin-link';
        adminLink.href = '/admin.html';
        adminLink.className = 'nav-item';
        adminLink.innerHTML = '⚙️ Admin Portal';
        nav.appendChild(adminLink);
      }
    }

    if (!profile || !profile.profile_completed) {
      window.location.assign('/login.html#profile');
      return;
    }
    showProfile(profile, session.user);

    // Fetch analytics summary
    const token = session.access_token;
    fetch('/api/analytics/summary', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        const focusMins = data.weekly_minutes ? data.weekly_minutes.reduce((a,b)=>a+b, 0) : 0;
        const hours = Math.floor(focusMins / 60);
        const mins = focusMins % 60;
        document.querySelector('.stat-card.accent strong').textContent = `${hours}h ${mins}m`;
        
        const streakText = document.querySelector('.stat-card:nth-child(2) strong');
        if (streakText) streakText.textContent = `${data.streak || 0} days`;

        const masteryText = document.querySelector('.stat-card:nth-child(3) strong');
        if (masteryText) masteryText.textContent = `${data.mastery || 0}%`;
        const ringSpan = document.querySelector('.ring span');
        if (ringSpan) ringSpan.textContent = data.mastery || 0;
      })
      .catch(console.error);

    // Fetch dynamic 'Continue Learning' lesson from local storage for instant feedback
    const lastTopic = localStorage.getItem('last_study_topic');
    const tag = document.querySelector('.course-info .tag');
    const title = document.querySelector('.course-info h3');
    const desc = document.querySelector('.course-info p');
      
    if (lastTopic) {
      if (tag) tag.textContent = 'INDEPENDENT STUDY';
      if (title) title.textContent = lastTopic;
      if (desc) desc.textContent = `Continuing where you left off`;
    } else {
      if (tag) tag.textContent = 'NO ACTIVE MODULES';
      if (title) title.textContent = 'Start a Focus Session';
      if (desc) desc.textContent = `Click the button above to begin`;
    }

    shell.hidden = false;
    shell.classList.add('dashboard-ready');
  } catch (error) {
    console.error('Dashboard profile load failed:', error);
    shell.hidden = false;
    shell.classList.add('dashboard-ready');
    document.querySelector('#profile-completion').textContent = error?.code === 'PGRST205'
      ? 'Student profile storage is not available yet. Run the student_profiles SQL migration in Supabase.'
      : 'We could not load your profile right now. Refresh to try again.';
    document.querySelector('#profile-completion').hidden = false;
  } finally {
    loading.hidden = true;
  }
};

document.querySelector('#sign-out-button')?.addEventListener('click', async () => {
  await supabase?.auth.signOut();
  window.location.assign('/login.html');
});

initializeDashboard();