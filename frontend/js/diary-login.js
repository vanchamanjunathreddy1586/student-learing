import { supabase } from './supabase-client.js';

document.addEventListener('DOMContentLoaded', async () => {
  const authWrapper = document.getElementById('auth-wrapper');
  const authLoading = document.getElementById('auth-loading');
  const formLogin = document.getElementById('form-login');
  const formRegister = document.getElementById('form-register');
  const linkShowRegister = document.getElementById('link-show-register');
  const linkShowLogin = document.getElementById('link-show-login');
  const authTitle = document.getElementById('auth-title');
  const authSubtitle = document.getElementById('auth-subtitle');
  const btnBackDashboard = document.getElementById('btn-back-dashboard');
  const linkForgotPassword = document.getElementById('link-forgot-password');

  // Verify Supabase Auth first
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = '/login.html';
    return;
  }

  // Check Diary Auth Status
  async function checkDiaryStatus() {
    try {
      const res = await fetch('/api/diary/auth/status', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const data = await res.json();
      
      authLoading.style.display = 'none';
      authWrapper.style.display = 'block';

      if (data.hasAccount) {
        showLogin();
      } else {
        showRegister();
      }
    } catch (err) {
      console.error(err);
      showToast('Error checking diary status. Try refreshing.', 'error');
    }
  }

  await checkDiaryStatus();

  // Navigation
  btnBackDashboard.addEventListener('click', () => {
    window.location.href = '/dashboard.html';
  });

  linkShowRegister.addEventListener('click', (e) => {
    e.preventDefault();
    showRegister();
  });

  linkShowLogin.addEventListener('click', (e) => {
    e.preventDefault();
    showLogin();
  });

  linkForgotPassword.addEventListener('click', (e) => {
    e.preventDefault();
    const newPass = prompt("To reset your Diary password, you must be logged into your main student account (which you are).\nPlease enter a new Diary Password (min 6 chars):");
    if (newPass && newPass.length >= 6) {
      fetch('/api/diary/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ newPassword: newPass })
      }).then(res => res.json()).then(data => {
        if (data.success) {
          sessionStorage.setItem('diaryToken', data.diaryToken);
          window.location.href = '/diary.html';
        } else {
          showToast(data.error || 'Failed to reset password', 'error');
        }
      });
    } else if (newPass) {
      showToast('Password must be at least 6 characters.', 'error');
    }
  });

  function showLogin() {
    formLogin.style.display = 'block';
    formRegister.style.display = 'none';
    authTitle.textContent = 'Personal Diary';
    authSubtitle.textContent = 'Enter your Diary credentials to unlock';
  }

  function showRegister() {
    formLogin.style.display = 'none';
    formRegister.style.display = 'block';
    authTitle.textContent = 'Create Private Diary';
    authSubtitle.textContent = 'Setup your separate secure diary account';
  }

  // Toggle Passwords
  document.querySelectorAll('.btn-toggle-password').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const input = btn.previousElementSibling;
      const icon = btn.querySelector('i');
      if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'fas fa-eye-slash';
      } else {
        input.type = 'password';
        icon.className = 'fas fa-eye';
      }
    });
  });

  // Handle Login
  formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-login');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Unlocking...';
    btn.disabled = true;

    try {
      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;
      const pin = document.getElementById('login-pin').value;

      const res = await fetch('/api/diary/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ email, password, pin })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Login failed');

      sessionStorage.setItem('diaryToken', data.diaryToken);
      window.location.href = '/diary.html';
    } catch (err) {
      showToast(err.message, 'error');
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  });

  // Handle Register
  formRegister.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-register');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
    btn.disabled = true;

    try {
      const email = document.getElementById('reg-email').value;
      const password = document.getElementById('reg-password').value;
      const pin = document.getElementById('reg-pin').value;
      const confirmPass = document.getElementById('reg-password-confirm').value;
      const confirmPin = document.getElementById('reg-pin-confirm').value;
      if (password !== confirmPass) throw new Error('Passwords do not match');
      if (pin !== confirmPin) throw new Error('PINs do not match');


      if (password.length < 6) throw new Error('Password must be at least 6 characters.');
      if (pin.length < 4 || pin.length > 6) throw new Error('PIN must be 4 to 6 digits.');

      const res = await fetch('/api/diary/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ email, password, pin })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Registration failed');

      sessionStorage.setItem('diaryToken', data.diaryToken);
      window.location.href = '/diary.html';
    } catch (err) {
      showToast(err.message, 'error');
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  });

  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    
    let icon = 'fa-info-circle';
    let color = 'var(--primary)';
    if (type === 'error') {
      icon = 'fa-exclamation-circle';
      color = 'var(--danger)';
    } else if (type === 'success') {
      icon = 'fa-check-circle';
      color = '#10b981';
    }
    
    toast.innerHTML = \`<i class="fas \${icon}" style="color: \${color}; font-size: 20px;"></i><span style="font-size: 14px; font-weight: 500;">\${message}</span>\`;
    
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(50px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }
});
