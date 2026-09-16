import { supabase } from './supabase.js';
import { defaultSettings, loadSettings, loadStudentProfile, saveSettings, saveStudentProfile } from './settings-service.js';
import { toolRegistry } from './tool-registry.js';

const shell = document.querySelector('#settings-shell'); 
const loading = document.querySelector('#settings-loading'); 
const toast = document.querySelector('#settings-toast'); 
const saveStateEl = document.querySelector('#save-state');
let currentUser; 
let settings = structuredClone(defaultSettings);

const showToast = (message, tone = 'success') => { 
  toast.textContent = message; 
  toast.dataset.tone = tone; 
  toast.classList.add('visible'); 
  window.setTimeout(() => toast.classList.remove('visible'), 3200); 
};

const getPath = (object, path) => path.split('.').reduce((value, key) => value?.[key], object); 
const setPath = (object, path, value) => { 
  const keys = path.split('.'); 
  const last = keys.pop(); 
  const parent = keys.reduce((target, key) => target[key] ||= {}, object); 
  parent[last] = value; 
}; 
const initials = (name) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'SL';

const applySettings = () => { 
  document.querySelectorAll('[data-setting]').forEach((input) => { 
    const value = getPath(settings, input.dataset.setting); 
    if (input.type === 'checkbox') input.checked = Boolean(value); 
    else input.value = value ?? ''; 
  }); 
  document.querySelector('#accent-value').textContent = settings.accent_color; 
  document.querySelector('#study-goal-value').textContent = `${settings.learning_preferences.study_goal} min`; 
  if(window.slSetTheme) window.slSetTheme(settings.theme); 
  document.documentElement.style.setProperty('--settings-accent', settings.accent_color); 
};

let saveTimeout = null;
const saveCurrentSettings = () => {
  if (saveStateEl) {
    saveStateEl.textContent = 'Saving...';
    saveStateEl.style.color = 'var(--settings-accent)';
  }
  
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(async () => {
    try { 
      await saveSettings(currentUser.id, settings); 
      if (saveStateEl) {
        saveStateEl.textContent = 'Saved ✓';
        saveStateEl.style.color = '#10b981'; // Success green
      }
    } catch (error) { 
      console.error('Database error:', error); 
      if (saveStateEl) {
        saveStateEl.textContent = 'Save failed';
        saveStateEl.style.color = '#ff6b9d'; // Error red
      }
      showToast('Settings could not be saved. Check connection.', 'error'); 
    }
  }, 1000); // 1s debounce
};

const renderTools = () => { 
  document.querySelector('#tool-grid').innerHTML = toolRegistry.map((tool) => `<article class="tool-card"><div class="tool-card-top"><span class="tool-icon">🤖</span><span class="tool-status ${tool.status}">${tool.status}</span></div><h3>${tool.name}</h3><p>${tool.description}</p><small>${tool.category} • ${tool.provider}</small><button type="button" data-tool-id="${tool.id}" class="tool-toggle">${settings.enabled_tools.includes(tool.id) ? 'Enabled' : tool.status === 'available' ? 'Enable' : 'Planned'}</button></article>`).join(''); 
  document.querySelectorAll('[data-tool-id]').forEach((button) => button.addEventListener('click', () => { 
    const id = button.dataset.toolId; 
    const tool = toolRegistry.find((item) => item.id === id); 
    if (tool.status !== 'available') return showToast('This integration is staged for a future release.', 'info'); 
    settings.enabled_tools = settings.enabled_tools.includes(id) ? settings.enabled_tools.filter((item) => item !== id) : [...settings.enabled_tools, id]; 
    renderTools(); 
    saveCurrentSettings(); 
  })); 
};

const logout = async () => { await supabase?.auth.signOut(); window.location.assign('/login.html'); };

const bindSettings = () => { 
  document.querySelectorAll('[data-settings-section]').forEach((button) => button.addEventListener('click', () => { 
    document.querySelectorAll('[data-settings-section], [data-settings-panel]').forEach((element) => element.classList.remove('active')); 
    button.classList.add('active'); 
    document.querySelector(`[data-settings-panel="${button.dataset.settingsSection}"]`).classList.add('active'); 
  })); 
  
  document.querySelectorAll('[data-setting]').forEach((input) => input.addEventListener('change', () => { 
    const value = input.type === 'checkbox' ? input.checked : input.type === 'number' || input.type === 'range' ? Number(input.value) : input.value; 
    setPath(settings, input.dataset.setting, value); 
    applySettings(); 
    saveCurrentSettings(); 
  })); 
  
  document.querySelector('#save-profile').addEventListener('click', async () => { 
    try { 
      await saveStudentProfile(currentUser.id, { 
        full_name: document.querySelector('#profile-name').value.trim(), 
        email: document.querySelector('#profile-email').value, 
        year: document.querySelector('#profile-year').value, 
        college: document.querySelector('#profile-college').value.trim() 
      }); 
      showToast('Profile saved'); 
    } catch (error) { 
      console.error('Database error:', error); 
      showToast('Profile could not be saved.', 'error'); 
    } 
  }); 
  
  document.querySelector('#logout-button').addEventListener('click', logout); 
  document.querySelector('#logout-all-button').addEventListener('click', logout); 
};

const initialize = async () => { 
  if (!supabase) return window.location.assign('/login.html'); 
  try { 
    const { data: { session }, error } = await supabase.auth.getSession(); 
    if (error || !session?.user) return window.location.assign('/login.html'); 
    currentUser = session.user; 
    
    // Load initial settings
    const [profile, loadedSettings] = await Promise.all([loadStudentProfile(currentUser.id), loadSettings(currentUser.id)]); 
    settings = { ...settings, ...loadedSettings }; 
    
    // Set UI state
    if (saveStateEl) saveStateEl.textContent = 'All changes saved remotely';
    
    document.querySelector('#profile-name').value = profile?.full_name || currentUser.user_metadata?.full_name || ''; 
    document.querySelector('#profile-email').value = profile?.email || currentUser.email || ''; 
    document.querySelector('#profile-year').value = profile?.year || ''; 
    document.querySelector('#profile-college').value = profile?.college || ''; 
    document.querySelector('#profile-avatar').textContent = initials(document.querySelector('#profile-name').value); 
    
    applySettings(); 
    renderTools(); 
    bindSettings(); 
    shell.hidden = false; 
  } catch (error) { 
    console.error('Database error:', error); 
    showToast('Settings are temporarily unavailable.', 'error'); 
    shell.hidden = false; 
  } finally { 
    loading.hidden = true; 
  } 
};
initialize();