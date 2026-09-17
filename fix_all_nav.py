import os
import glob
import re

nav_template = """<nav aria-label="Main navigation">
          <p class="nav-label">Workspace</p>
          <a class="nav-item {active_dashboard}" href="/"><i class="fas fa-home" style="width:20px;"></i> Dashboard</a>
          <a class="nav-item {active_subjects}" href="/subjects.html"><i class="fas fa-book" style="width:20px;"></i> My Subjects</a>
          <a class="nav-item {active_lessons}" href="/lessons.html"><i class="fas fa-video" style="width:20px;"></i> Lessons</a>
          <a class="nav-item" href="/lessons.html#upload"><i class="fas fa-upload" style="width:20px;"></i> Upload Material</a>
          
          <a class="nav-item {active_groups}" href="/groups.html"><i class="fas fa-users" style="width:20px;"></i> Study Groups</a>
          <div class="sub-nav" style="padding-left: 36px; display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px; margin-top: 4px;">
            <a href="/groups.html#discover" style="color: var(--text-secondary); text-decoration: none; font-size: 13px;">Discover Groups</a>
            <a href="/groups.html#my-groups" style="color: var(--text-secondary); text-decoration: none; font-size: 13px;">My Groups</a>
            <a href="/groups.html#create" style="color: var(--text-secondary); text-decoration: none; font-size: 13px;">Create Group</a>
          </div>

          <a class="nav-item {active_classroom}" href="/classroom.html"><i class="fas fa-chalkboard" style="width:20px;"></i> Personal Classroom</a>
          
          <p class="nav-label">Tools & Resources</p>
          <a class="nav-item {active_aiteacher}" href="/ai-teacher.html"><i class="fas fa-robot" style="width:20px;"></i> AI Teacher</a>
          <a class="nav-item {active_calendar}" href="/study-planner.html"><i class="fas fa-calendar" style="width:20px;"></i> Study Calendar</a>
          <a class="nav-item {active_assignments}" href="/assignments.html"><i class="fas fa-tasks" style="width:20px;"></i> Assignments</a>
          <a class="nav-item {active_gamification}" href="/analytics.html"><i class="fas fa-chart-line" style="width:20px;"></i> Learning Analysis</a>
          
          <p class="nav-label">Personal</p>
          <a class="nav-item {active_settings}" href="/settings.html"><i class="fas fa-cog" style="width:20px;"></i> Settings</a>
          <a class="nav-item {active_profile}" href="/profile.html"><i class="fas fa-user" style="width:20px;"></i> Profile</a>
        </nav>"""

bottom_nav_template = """
    <!-- Mobile Bottom Navigation -->
    <nav class="mobile-bottom-nav">
      <div class="mobile-bottom-nav-inner">
        <a href="/" class="mobile-nav-item {active_dashboard}">
          <i class="fas fa-home"></i>
          <span>Home</span>
        </a>
        <a href="/subjects.html" class="mobile-nav-item {active_subjects}">
          <i class="fas fa-book"></i>
          <span>Subjects</span>
        </a>
        <a href="/lessons.html" class="mobile-nav-item {active_lessons}">
          <i class="fas fa-video"></i>
          <span>Lessons</span>
        </a>
        <a href="/groups.html" class="mobile-nav-item {active_groups}">
          <i class="fas fa-users"></i>
          <span>Groups</span>
        </a>
        <button class="mobile-nav-item mobile-menu-toggle" style="background:transparent; border:none; padding:0; cursor:pointer;" onclick="document.querySelector('.sidebar').classList.toggle('open')">
          <i class="fas fa-bars"></i>
          <span>More</span>
        </button>
      </div>
    </nav>
"""

html_files = glob.glob('frontend/*.html')

for filepath in html_files:
    if 'owner.html' in filepath or 'admin.html' in filepath or 'login.html' in filepath or 'register.html' in filepath:
        continue

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    filename = os.path.basename(filepath)
    
    context = {
        'active_dashboard': 'active' if filename == 'index.html' else '',
        'active_subjects': 'active' if filename == 'subjects.html' else '',
        'active_lessons': 'active' if filename == 'lessons.html' else '',
        'active_groups': 'active' if filename in ['groups.html', 'group-details.html'] else '',
        'active_classroom': 'active' if filename == 'classroom.html' else '',
        'active_aiteacher': 'active' if filename == 'ai-teacher.html' else '',
        'active_calendar': 'active' if filename == 'study-planner.html' else '',
        'active_assignments': 'active' if filename == 'assignments.html' else '',
        'active_gamification': 'active' if filename == 'analytics.html' else '',
        'active_settings': 'active' if filename == 'settings.html' else '',
        'active_profile': 'active' if filename == 'profile.html' else '',
    }
    
    nav_filled = nav_template.format(**context)
    
    # 1. Replace the desktop navigation completely
    pattern = re.compile(r'<nav aria-label="Main navigation">.*?</nav>', re.DOTALL)
    if pattern.search(content):
        content = pattern.sub(nav_filled, content)
        
    # 2. Re-inject or update the mobile bottom nav
    bottom_filled = bottom_nav_template.format(**context)
    
    # If it already exists, replace it
    bottom_pattern = re.compile(r'<!-- Mobile Bottom Navigation -->.*?</nav>', re.DOTALL)
    if bottom_pattern.search(content):
        content = bottom_pattern.sub(bottom_filled, content)
    else:
        # Otherwise inject at end of body
        content = content.replace('</body>', f"{bottom_filled}\n</body>")
        
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Updated full navigation in {filename}")
