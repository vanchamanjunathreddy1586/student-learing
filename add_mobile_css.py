import os

css = """
/* ========================================= */
/* MOBILE APP-LIKE EXPERIENCE                */
/* ========================================= */

:root {
  --safe-area-bottom: env(safe-area-inset-bottom, 20px);
}

/* Mobile Bottom Navigation */
.mobile-bottom-nav {
  display: none;
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  background: rgba(23, 42, 43, 0.95);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  z-index: 2000;
  padding-bottom: var(--safe-area-bottom);
}

.mobile-bottom-nav-inner {
  display: flex;
  justify-content: space-around;
  align-items: center;
  height: 65px;
}

.mobile-nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 11px;
  font-weight: 600;
  gap: 4px;
  flex: 1;
  height: 100%;
  transition: all 0.2s ease;
}

.mobile-nav-item i, .mobile-nav-item span.emoji {
  font-size: 22px;
  margin-bottom: 2px;
}

.mobile-nav-item.active {
  color: var(--accent);
}

.mobile-nav-item.active i {
  text-shadow: 0 0 15px var(--accent);
}

/* Base Responsive Fixes */
@media (max-width: 768px) {
  /* Activate Bottom Nav */
  .mobile-bottom-nav {
    display: block;
  }
  
  /* Prevent content being covered */
  body, .main-content {
    padding-bottom: calc(85px + var(--safe-area-bottom)) !important;
  }
  
  /* Mobile padding & spacing */
  .main-content {
    padding-left: 16px !important;
    padding-right: 16px !important;
  }

  /* Prevent horizontal scroll */
  body {
    overflow-x: hidden;
    width: 100%;
  }
  
  /* Cards stack and stretch natively */
  .stats-grid, .content-grid, .right-column {
    display: flex !important;
    flex-direction: column !important;
    gap: 16px !important;
    width: 100% !important;
  }
  
  .stat-card, .quick-card, .ai-card, .continue-card {
    width: 100% !important;
    min-height: auto !important;
  }

  /* Make forms and inputs touch-friendly */
  input, select, textarea, button {
    font-size: 16px !important; /* prevents iOS zoom */
  }

  /* Enhance touch targets */
  .primary-btn, .action, .icon-btn {
    min-height: 48px;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  /* AI Teacher Chat Input - push above keyboard */
  .ai-teacher-layout {
    height: calc(100vh - 85px - var(--safe-area-bottom)) !important;
  }
  
  /* Hide desktop sidebar */
  .sidebar {
    transform: translateX(-100%);
  }

  /* Adjust header text */
  .welcome h1 {
    font-size: 26px !important;
  }

  /* Reduce heavy glows on mobile for performance */
  .welcome h1, .stat-card strong, .ring span {
    text-shadow: none !important;
  }
}
"""

with open('frontend/css/dashboard.css', 'a', encoding='utf-8') as f:
    f.write(css)
print("Mobile CSS appended")
