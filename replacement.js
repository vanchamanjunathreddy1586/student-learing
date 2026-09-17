import { supabase, getAccessToken } from './supabase.js';

const publicPages = ['/', '/index.html', '/login.html', '/register.html', '/forgot-password.html', '/verify-email.html', '/reset-password.html'];

document.addEventListener('DOMContentLoaded', async () => {
  if (supabase) {
    const { data: { session } } = await supabase.auth.getSession();
    const currentPath = window.location.pathname;
    
    // If we are on a protected page and there is no session
    if (!session && !publicPages.includes(currentPath) && currentPath !== '') {
      window.location.href = /login.html?next=;
      return;
    }
    
    if (session) {
      // Role-based routing
      const { data: profile } = await supabase
        .from('student_profiles')
        .select('role, profile_completed')
        .eq('user_id', session.user.id)
        .maybeSingle();

      const role = profile?.role || 'student';
      
      // Auto-redirect logged-in users away from auth pages
      if (currentPath === '/login.html' || currentPath === '/register.html') {
        if (role === 'owner') {
          window.location.href = '/owner.html';
          return;
        } else if (role === 'admin') {
          window.location.href = '/admin.html';
          return;
        } else if (profile && !profile.profile_completed) {
          // let auth-advanced handle profile completion
          return;
        } else {
          const next = new URLSearchParams(window.location.search).get('next') || '/';
          window.location.href = next;
          return;
        }
      }

      // Prevent Owners/Admins from seeing Student Dashboard
      if (currentPath === '/' || currentPath === '/index.html') {
        if (role === 'owner') {
          window.location.href = '/owner.html';
          return;
        }
        if (role === 'admin') {
          window.location.href = '/admin.html';
          return;
        }
      }
    }
  }
});
