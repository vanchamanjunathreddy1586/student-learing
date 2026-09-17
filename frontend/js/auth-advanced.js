import { supabase } from './supabase.js';
import {
  getPasswordStrength,
  isValidEmail,
  validateLoginForm,
  validateRegisterForm,
  validateStudentProfile,
} from './auth-validation.js';

const body = document.body;
const hashView = window.location.hash.replace(/^#/, '').trim();
const authView = body.dataset.authView || (['login', 'register', 'forgot', 'reset', 'profile'].includes(hashView) ? hashView : 'login');
const collegeSuggestions = [
  'University of Delhi',
  'Indian Institute of Technology Delhi',
  'IIT Bombay',
  'IIT Kanpur',
  'BITS Pilani',
  'Vellore Institute of Technology',
  'Amity University',
  'Manipal Academy of Higher Education',
  'Christ University',
  'Symbiosis International University',
  'University of Mumbai',
  'Savitribai Phule Pune University',
  'BMS College of Engineering',
  'Delhi Technological University',
  'NIT Trichy',
  'NIT Surathkal',
  'Jadavpur University',
  'St. Xavier\'s College',
  'SRM Institute of Science and Technology',
  'Lovely Professional University',
];

const state = {
  currentView: authView,
  loginRole: 'student',
  resetEmail: '',
  selectedYear: '',
  collegeQuery: '',
  collegeSelectionIndex: -1,
  isSubmitting: false,
};

const ui = {
  loginForm: document.querySelector('#login-form'),
  registerForm: document.querySelector('#register-form'),
  forgotForm: document.querySelector('#forgot-form'),
  resetForm: document.querySelector('#reset-form'),
  profileForm: document.querySelector('#profile-form'),
  views: [...document.querySelectorAll('[data-panel]')],
  loginError: document.querySelector('#login-error'),
  registerError: document.querySelector('#register-error'),
  forgotError: document.querySelector('#forgot-error'),
  profileError: document.querySelector('#profile-error'),
  successBanner: document.querySelector('#status-banner'),
  passwordStrength: document.querySelector('#password-strength'),
  passwordMeter: document.querySelector('#password-meter'),
  passwordRequirements: document.querySelector('#password-requirements'),
  collegeInput: document.querySelector('#college-input'),
  collegeSuggestions: document.querySelector('#college-suggestions'),
  selectedCollegeValue: document.querySelector('#selected-college-value'),
  yearButtons: [...document.querySelectorAll('[data-year]')],
  continueButton: document.querySelector('#profile-submit'),
  profileLoading: document.querySelector('#profile-loading'),
  globalLoading: document.querySelector('#global-loading'),
  authCard: document.querySelector('#auth-card'),
};

const setView = (viewName) => {
  state.currentView = viewName;
  ui.views.forEach((panel) => {
    const matches = panel.dataset.panel === viewName;
    panel.hidden = !matches;
    panel.setAttribute('aria-hidden', String(!matches));
  });
};

const showInlineError = (input, element, message) => {
  if (!input || !element) return;
  input.setAttribute('aria-invalid', message ? 'true' : 'false');
  element.textContent = message || '';
};

const setBanner = (message, tone = 'info') => {
  if (!ui.successBanner) return;
  ui.successBanner.textContent = message || '';
  ui.successBanner.dataset.tone = tone;
  ui.successBanner.hidden = !message;
};

const getAuthMessage = () => {
  if (!supabase) {
    return 'Supabase is not configured yet. Add your project URL and anon key in the environment.';
  }
  return '';
};

const getProfileErrorMessage = (error) => {
  const message = String(error?.message || error || '').toLowerCase();
  if (message.includes('student_profiles') || error?.code === 'PGRST205') {
    return 'Student profile storage is not available yet. Run the student_profiles SQL migration in Supabase.';
  }
  return 'We could not load your student profile. Please try again.';
};

const isEmailRateLimitError = (error) => {
  const message = String(error?.message || error || '').toLowerCase();
  return message.includes('rate limit') || message.includes('email rate') || error?.status === 429;
};

const getEmailRateLimitMessage = () => 'Email sending is temporarily rate-limited. Wait a few minutes before trying again, or use Google sign-in.';

const getLoginErrorMessage = (error) => {
  const message = String(error?.message || error || '').toLowerCase();
  if (message.includes('email not confirmed')) {
    return 'Please verify your email address from the confirmation email before logging in.';
  }
  if (message.includes('invalid login credentials')) {
    return 'The email or password is incorrect. Check both fields and try again.';
  }
  if (isEmailRateLimitError(error)) {
    return getEmailRateLimitMessage();
  }
  return 'We could not sign you in right now. Please check your connection and try again.';
};

const getOAuthErrorFromUrl = () => {
  const params = new URLSearchParams(window.location.search);
  const description = params.get('oauth_error') || (params.get('error') && (params.get('error_description') || params.get('error')));
  if (!description) return '';
  return `Google sign-in could not be completed: ${description.replaceAll('+', ' ')}. Try again.`;
};

const updatePasswordStrength = (value = '') => {
  if (!ui.passwordStrength || !ui.passwordMeter || !ui.passwordRequirements) return;
  const strength = getPasswordStrength(value);
  const percentage = Math.min(100, (strength.score / 4) * 100);

  ui.passwordMeter.style.width = `${percentage}%`;
  ui.passwordMeter.dataset.level = strength.level;
  ui.passwordStrength.textContent = strength.label;
  ui.passwordRequirements.textContent = strength.requirements;
};

const setPasswordVisibility = (button, input) => {
  const show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  button.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
  button.classList.toggle('visible', show);
};

const syncSelectedYear = () => {
  ui.yearButtons.forEach((button) => {
    const selected = button.dataset.year === state.selectedYear;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
};

const getFilteredColleges = (query = '') => {
  const term = query.trim().toLowerCase();
  if (!term) {
    return collegeSuggestions.slice(0, 5);
  }

  return collegeSuggestions.filter((item) => item.toLowerCase().includes(term)).slice(0, 6);
};

const renderCollegeSuggestions = (query = '') => {
  if (!ui.collegeSuggestions) return;

  const matches = getFilteredColleges(query);
  if (!query.trim()) {
    ui.collegeSuggestions.innerHTML = '<li class="suggestion-empty">Start typing your college name</li>';
    return;
  }

  if (!matches.length) {
    ui.collegeSuggestions.innerHTML = '<li class="suggestion-empty">No matching colleges found — you can type your own.</li>';
    return;
  }

  ui.collegeSuggestions.innerHTML = matches
    .map((college, index) => `
      <li>
        <button type="button" class="suggestion-item ${index === state.collegeSelectionIndex ? 'active' : ''}" data-college="${college}">${college}</button>
      </li>
    `)
    .join('');

  ui.collegeSuggestions.querySelectorAll('.suggestion-item').forEach((button) => {
    button.addEventListener('click', () => {
      ui.collegeInput.value = button.dataset.college;
      state.collegeSelectionIndex = -1;
      if (ui.selectedCollegeValue) {
        ui.selectedCollegeValue.textContent = button.dataset.college;
      }
      ui.collegeSuggestions.innerHTML = '';
    });
  });
};

const validateLoginUI = () => {
  const email = document.querySelector('#login-email');
  const password = document.querySelector('#login-password');
  const result = validateLoginForm({ email: email.value, password: password.value });

  showInlineError(email, document.querySelector('#login-email-error'), result.errors.email || '');
  showInlineError(password, document.querySelector('#login-password-error'), result.errors.password || '');
  return result.valid;
};

const validateRegisterUI = () => {
  const form = {
    fullName: document.querySelector('#register-name').value,
    email: document.querySelector('#register-email').value,
    password: document.querySelector('#register-password').value,
    confirmPassword: document.querySelector('#register-confirm-password').value,
    termsAccepted: document.querySelector('#register-terms').checked,
  };

  const result = validateRegisterForm(form);
  showInlineError(document.querySelector('#register-name'), document.querySelector('#register-name-error'), result.errors.fullName || '');
  showInlineError(document.querySelector('#register-email'), document.querySelector('#register-email-error'), result.errors.email || '');
  showInlineError(document.querySelector('#register-password'), document.querySelector('#register-password-error'), result.errors.password || '');
  showInlineError(document.querySelector('#register-confirm-password'), document.querySelector('#register-confirm-password-error'), result.errors.confirmPassword || '');
  const termsError = document.querySelector('#register-terms-error');
  termsError.textContent = result.errors.termsAccepted || '';
  return result.valid;
};

const validateProfileUI = () => {
  const result = validateStudentProfile({ year: state.selectedYear, college: ui.collegeInput.value });
  showInlineError(ui.collegeInput, document.querySelector('#profile-college-error'), result.errors.college || '');
  const yearError = document.querySelector('#profile-year-error');
  yearError.textContent = result.errors.year || '';
  return result.valid;
};

const persistProfile = async (user) => {
  const trimmedCollege = String(ui.collegeInput.value || '').trim();
  const payload = {
    user_id: user.id,
    full_name: user.user_metadata?.full_name || user.user_metadata?.display_name || user.email?.split('@')[0] || 'Student',
    email: user.email || '',
    year: state.selectedYear,
    college: trimmedCollege,
    profile_completed: true,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('student_profiles').upsert(payload, { onConflict: 'user_id' });

  if (error) {
    throw error;
  }
};

const goToDashboard = () => {
  window.location.href = '/';
};

const handleSessionRedirect = async () => {
  if (!supabase) {
    setView('login');
    return;
  }

  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      setView('login');
      return;
    }

    if (!session?.user) {
      setView(authView);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from('student_profiles')
      .select('*')
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (profileError && profileError.code !== 'PGRST116') {
      throw profileError;
    }

    if (profile && profile.is_banned) {
      await supabase.auth.signOut();
      setBanner('Your account has been suspended by an administrator.', 'error');
      setView('login');
      return;
    }

    if (profile && profile.role === 'owner') {
      window.location.href = '/owner.html';
      return;
    }

    if (profile && profile.role === 'admin') {
      window.location.href = '/admin.html';
      return;
    }

    if (profile && profile.profile_completed && profile.full_name && profile.year && profile.college) {
      goToDashboard();
      return;
    }

    setView('profile');
    if (profile) {
      state.selectedYear = profile.year || '';
      ui.collegeInput.value = profile.college || '';
      syncSelectedYear();
      if (ui.selectedCollegeValue) {
        ui.selectedCollegeValue.textContent = profile.college || 'No college selected';
      }
    }
  } catch (error) {
    console.error('Session redirect failed:', error);
    setView('login');
    setBanner(getProfileErrorMessage(error), 'error');
  } finally {
    if (ui.globalLoading) {
      ui.globalLoading.hidden = true;
    }
  }
};

const handleLogin = async (event) => {
  event.preventDefault();
  if (!supabase) {
    setBanner(getAuthMessage(), 'error');
    return;
  }

  if (!validateLoginUI()) {
    return;
  }

  const button = document.querySelector('#login-button');
  const email = document.querySelector('#login-email').value.trim();
  const password = document.querySelector('#login-password').value;
  button.disabled = true;
  button.dataset.originalText = button.textContent;
  button.textContent = 'Logging in...';

  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error('Supabase Auth Error:', error);
      setBanner(getLoginErrorMessage(error), 'error');
      showInlineError(document.querySelector('#login-password'), document.querySelector('#login-password-error'), '');
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from('student_profiles')
      .select('*')
      .eq('user_id', data.user.id)
      .maybeSingle();

    // Ignore PGRST116 (0 rows) and allow user to continue to profile creation
    if (profileError && profileError.code !== 'PGRST116' && profileError.code !== '42P01') {
      console.warn('Profile fetch warning:', profileError);
    }

    if (profile && profile.is_banned) {
      await supabase.auth.signOut();
      setBanner('Your account has been suspended by an administrator.', 'error');
      return;
    }

    if (profile) {
      const isFaculty = ['admin', 'owner', 'lecturer'].includes(profile.role);
      if (state.loginRole === 'student' && isFaculty) {
        await supabase.auth.signOut();
        setBanner('Please use the Faculty / Admin login tab.', 'error');
        return;
      }
      if (state.loginRole === 'faculty' && !isFaculty) {
        await supabase.auth.signOut();
        setBanner('You do not have a faculty account. Please use the Student tab.', 'error');
        return;
      }
    }

    if (profile && profile.role === 'owner') {
      window.location.href = '/owner.html';
      return;
    }

    if (profile && profile.role === 'admin') {
      window.location.href = '/admin.html';
      return;
    }

    if (profile && profile.profile_completed && profile.full_name && profile.year && profile.college) {
      goToDashboard();
      return;
    }

    state.selectedYear = profile?.year || '';
    ui.collegeInput.value = profile?.college || '';
    syncSelectedYear();
    setView('profile');
    setBanner('Welcome back. Finish your profile to continue.', 'success');
  } catch (error) {
    console.error('Login failed:', error);
    setBanner(getProfileErrorMessage(error), 'error');
  } finally {
    button.disabled = false;
    button.textContent = button.dataset.originalText || 'Login';
  }
};

const handleRegister = async (event) => {
  event.preventDefault();
  if (!supabase) {
    setBanner(getAuthMessage(), 'error');
    return;
  }

  if (!validateRegisterUI()) {
    return;
  }

  const submitButton = document.querySelector('#register-button');
  const payload = {
    email: document.querySelector('#register-email').value.trim(),
    password: document.querySelector('#register-password').value,
    fullName: document.querySelector('#register-name').value.trim(),
  };

  submitButton.disabled = true;
  submitButton.textContent = 'Creating account...';

  try {
    const { data, error } = await supabase.auth.signUp({
      email: payload.email,
      password: payload.password,
      options: {
        data: {
          full_name: payload.fullName,
        },
      },
    });

    if (error) {
      console.error('Supabase Auth Error:', error);
      setBanner(isEmailRateLimitError(error) ? getEmailRateLimitMessage() : (error.message || 'Unable to create your account right now.'), 'error');
      return;
    }

    if (data.session) {
      setView('profile');
      setBanner('Your account is ready. Tell us a little about your student profile.', 'success');
      return;
    }

    setBanner('Your account has been created successfully. Check your email to verify it before continuing.', 'success');
    setView('login');
  } catch (error) {
    console.error('Register failed:', error);
    setBanner('Something went wrong during registration. Please try again.', 'error');
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Create Account';
  }
};

const handleGoogleLogin = async (event) => {
  event.preventDefault();

  if (!supabase) {
    setBanner(getAuthMessage(), 'error');
    return;
  }

  const button = event.currentTarget;
  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = 'Redirecting...';

  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/login.html?oauth=google`,
      },
    });

    if (error) throw error;
  } catch (error) {
    console.error('Google login failed:', error);
    setBanner('Google sign-in could not start. Please try again or use email login.', 'error');
    button.disabled = false;
    button.textContent = originalText;
  }
};

const handleForgotPassword = async (event) => {
  event.preventDefault();
  if (!supabase) {
    setBanner(getAuthMessage(), 'error');
    return;
  }

  const email = document.querySelector('#forgot-email').value.trim();
  if (!email || !isValidEmail(email)) {
    showInlineError(document.querySelector('#forgot-email'), document.querySelector('#forgot-email-error'), 'Enter a valid email address.');
    return;
  }

  const button = document.querySelector('#forgot-button');
  button.disabled = true;
  button.textContent = 'Sending...';

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login.html`,
    });

    if (error) {
      console.error('Supabase Auth Error:', error);
      setBanner(isEmailRateLimitError(error) ? getEmailRateLimitMessage() : 'We could not send a reset link. Please try again in a moment.', 'error');
      return;
    }

    state.resetEmail = email;
    setBanner('Check your email for the six-digit password reset code.', 'success');
    setView('reset');
  } catch (error) {
    console.error('Forgot password failed:', error);
    setBanner('Something went wrong. Please check your connection and try again.', 'error');
  } finally {
    button.disabled = false;
    button.textContent = 'Send OTP';
  }
};

const handlePasswordReset = async (event) => {
  event.preventDefault();
  if (!supabase) {
    setBanner(getAuthMessage(), 'error');
    return;
  }

  const otpInput = document.querySelector('#reset-otp');
  const passwordInput = document.querySelector('#reset-password');
  const confirmInput = document.querySelector('#reset-confirm-password');
  const otp = otpInput.value.trim();
  const password = passwordInput.value;
  const confirmPassword = confirmInput.value;
  const strength = getPasswordStrength(password);
  const otpError = !/^\d{6}$/.test(otp) ? 'Enter the six-digit code from your email.' : '';
  const passwordError = strength.level === 'weak' ? 'Choose a stronger password with at least 8 characters.' : '';
  const confirmError = password !== confirmPassword ? 'Passwords do not match.' : '';
  showInlineError(otpInput, document.querySelector('#reset-otp-error'), otpError);
  showInlineError(passwordInput, document.querySelector('#reset-password-error'), passwordError);
  showInlineError(confirmInput, document.querySelector('#reset-confirm-password-error'), confirmError);
  if (otpError || passwordError || confirmError) return;

  const button = document.querySelector('#reset-button');
  button.disabled = true;
  button.textContent = 'Updating...';
  try {
    if (!state.resetEmail) {
      const { data: { user } } = await supabase.auth.getUser();
      state.resetEmail = user?.email || '';
    }
    if (state.resetEmail) {
      const { error: otpVerificationError } = await supabase.auth.verifyOtp({ email: state.resetEmail, token: otp, type: 'recovery' });
      if (otpVerificationError) throw otpVerificationError;
    }
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
    setBanner('Your password has been updated. You can log in now.', 'success');
    setView('login');
  } catch (error) {
    console.error('Password reset failed:', error);
    setBanner('This recovery link is invalid or expired. Request a new reset link and try again.', 'error');
  } finally {
    button.disabled = false;
    button.textContent = 'Update Password';
  }
};

const handleProfileSubmit = async (event) => {
  event.preventDefault();
  if (!supabase) {
    setBanner(getAuthMessage(), 'error');
    return;
  }

  if (!validateProfileUI()) {
    return;
  }

  const button = ui.continueButton;
  if (button.disabled) return;

  button.disabled = true;
  button.textContent = 'Saving...';

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      setBanner('Your session expired. Please log in again.', 'error');
      setView('login');
      return;
    }

    await persistProfile(user);
    setBanner('Your student profile is ready!', 'success');
    setTimeout(() => goToDashboard(), 850);
  
    } catch (error) {
      console.error('Profile save failed:', {
        code: error?.code,
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        status: error?.status
      });

      let safeMessage = 'Your profile could not be saved. Please try again.';
      if (error?.message?.includes('permission denied')) {
        safeMessage = 'Database permissions error. Please contact support.';
      } else if (error?.message?.includes('JWT') || error?.message?.includes('session')) {
        safeMessage = 'Your session expired. Please log in again.';
        setTimeout(() => setView('login'), 2000);
      } else if (error?.status === 429) {
        safeMessage = 'Too many requests. Please wait a moment and try again.';
      } else if (error?.message === 'Failed to fetch' || error?.message?.includes('NetworkError')) {
        safeMessage = 'Connection problem. Please check your internet and try again.';
      }

      setBanner(safeMessage, 'error');
      button.disabled = false;
      button.textContent = 'Continue →';
    }
  };
const initializePasswordToggles = () => {
  document.querySelectorAll('[data-password-toggle]').forEach((button) => {
    const input = document.querySelector(`#${button.dataset.passwordToggle}`);
    if (!input) return;
    button.addEventListener('click', () => setPasswordVisibility(button, input));
  });
};

const initializeViewSwitches = () => {
  document.querySelectorAll('[data-auth-link]').forEach((button) => {
    button.addEventListener('click', () => {
      const target = button.dataset.authLink;
      setView(target);
      setBanner('', 'info');
    });
  });
};

const initializeRoleToggle = () => {
  document.querySelectorAll('[data-role-select]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-role-select]').forEach(b => {
        b.classList.remove('active');
        b.style.background = 'transparent';
        b.style.color = 'rgba(255,255,255,0.6)';
      });
      btn.classList.add('active');
      btn.style.background = 'rgba(0, 240, 255, 0.1)';
      btn.style.color = '#00f0ff';
      state.loginRole = btn.dataset.roleSelect;
    });
  });
};

const initializeYearSelection = () => {
  ui.yearButtons.forEach((button) => {
    button.addEventListener('click', () => {
      state.selectedYear = button.dataset.year;
      syncSelectedYear();
      validateProfileUI();
    });
  });
};

const initializeCollegeInput = () => {
  if (!ui.collegeInput) return;

  ui.collegeInput.addEventListener('input', (event) => {
    state.collegeQuery = event.target.value;
    state.collegeSelectionIndex = -1;
    renderCollegeSuggestions(event.target.value);
    validateProfileUI();
  });

  ui.collegeInput.addEventListener('keydown', (event) => {
    const items = [...ui.collegeSuggestions.querySelectorAll('.suggestion-item')];
    if (!items.length) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      state.collegeSelectionIndex = Math.min(items.length - 1, state.collegeSelectionIndex + 1);
      items.forEach((item, index) => item.classList.toggle('active', index === state.collegeSelectionIndex));
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      state.collegeSelectionIndex = Math.max(0, state.collegeSelectionIndex - 1);
      items.forEach((item, index) => item.classList.toggle('active', index === state.collegeSelectionIndex));
    }

    if (event.key === 'Enter' && state.collegeSelectionIndex >= 0 && items[state.collegeSelectionIndex]) {
      event.preventDefault();
      const selected = items[state.collegeSelectionIndex];
      ui.collegeInput.value = selected.dataset.college;
      if (ui.selectedCollegeValue) {
        ui.selectedCollegeValue.textContent = selected.dataset.college;
      }
      ui.collegeSuggestions.innerHTML = '';
    }
  });
};

const initializeForms = () => {
  if (ui.loginForm) {
    ui.loginForm.addEventListener('submit', handleLogin);
    document.querySelector('#login-email').addEventListener('input', () => validateLoginUI());
    document.querySelector('#login-password').addEventListener('input', () => validateLoginUI());
  }

  document.querySelectorAll('#google-login-button, #register-google-button').forEach((button) => {
    button.addEventListener('click', handleGoogleLogin);
  });

  if (ui.registerForm) {
    ui.registerForm.addEventListener('submit', handleRegister);
    document.querySelector('#register-password').addEventListener('input', (event) => {
      updatePasswordStrength(event.target.value);
      validateRegisterUI();
    });
    document.querySelector('#register-name').addEventListener('input', validateRegisterUI);
    document.querySelector('#register-email').addEventListener('input', validateRegisterUI);
    document.querySelector('#register-confirm-password').addEventListener('input', validateRegisterUI);
    document.querySelector('#register-terms').addEventListener('change', validateRegisterUI);
  }

  if (ui.forgotForm) {
    ui.forgotForm.addEventListener('submit', handleForgotPassword);
  }

  if (ui.resetForm) {
    ui.resetForm.addEventListener('submit', handlePasswordReset);
  }

  if (ui.profileForm) {
    ui.profileForm.addEventListener('submit', handleProfileSubmit);
  }
};

const initialize = async () => {
  initializePasswordToggles();
  initializeViewSwitches();
  initializeRoleToggle();
  initializeYearSelection();
  initializeCollegeInput();
  initializeForms();
  renderCollegeSuggestions('');
  setView(state.currentView);
  const oauthError = getOAuthErrorFromUrl();
  if (oauthError) {
    window.history.replaceState({}, document.title, '/login.html');
    setBanner(oauthError, 'error');
  }
  if (ui.globalLoading) {
    ui.globalLoading.hidden = false;
  }
  if (window.location.hash.includes('type=recovery')) {
    setView('reset');
    if (ui.globalLoading) ui.globalLoading.hidden = true;
    return;
  }
  await handleSessionRedirect();
};

initialize();
