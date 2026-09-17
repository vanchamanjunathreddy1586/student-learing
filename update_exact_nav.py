import os
import re
import glob

nav_template = """<nav aria-label="Main navigation">
          <p class="nav-label">Workspace</p>
          <a class="nav-item {active_dashboard}" href="/"><span>🏠</span> Dashboard</a>
          <a class="nav-item {active_subjects}" href="/subjects.html"><span>📚</span> My Subjects</a>
          <a class="nav-item {active_lessons}" href="/lessons.html"><span>📺</span> Lessons</a>
          <a class="nav-item" href="/lessons.html#upload"><span>📤</span> Upload Material</a>
          
          <a class="nav-item {active_groups}" href="/groups.html"><span>👥</span> Study Groups</a>
          <div class="sub-nav" style="padding-left: 32px; display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; margin-top: -4px;">
            <a href="/groups.html#discover" style="color: var(--text-secondary); text-decoration: none; font-size: 13px;">Discover Groups</a>
            <a href="/groups.html#my-groups" style="color: var(--text-secondary); text-decoration: none; font-size: 13px;">My Groups</a>
            <a href="/groups.html#create" style="color: var(--text-secondary); text-decoration: none; font-size: 13px;">Create Group</a>
          </div>

          <a class="nav-item {active_aiteacher}" href="/ai-teacher.html"><span>🤖</span> AI Teacher</a>
          <a class="nav-item {active_calendar}" href="/study-planner.html"><span>📅</span> Calendar</a>
          <a class="nav-item {active_assignments}" href="/assignments.html"><span>📝</span> Assignments</a>
          <a class="nav-item {active_attendance}" href="/attendance.html"><span>✅</span> Attendance</a>
          <a class="nav-item {active_gamification}" href="/analytics.html"><span>🎮</span> Gamification</a>
          
          <p class="nav-label">Tools & Resources</p>
          <a class="nav-item {active_scan}" href="/scan-learn.html"><span>📷</span> Scan & Learn</a>
          <a class="nav-item {active_quiz}" href="/quiz.html"><span>🧠</span> Quizzes</a>
          <a class="nav-item {active_research}" href="/research.html"><span>🔬</span> Research Assistant</a>
          <a class="nav-item {active_resources}" href="/resources.html"><span>📁</span> Resource Library</a>
          <a class="nav-item {active_coding}" href="/coding.html"><span>💻</span> Coding Lab</a>
          <a class="nav-item {active_diary}" href="/diary.html"><span>📓</span> Student Diary</a>
        </nav>"""

html_files = glob.glob('frontend/*.html')

for filepath in html_files:
    # Skip owner/admin pages if they shouldn't have the student nav
    # Actually wait, owner.html has its own nav. I should only replace the main nav if it's there.
    if 'owner.html' in filepath or 'admin.html' in filepath or 'login.html' in filepath or 'register.html' in filepath:
        continue

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Determine active state
    filename = os.path.basename(filepath)
    
    context = {
        'active_dashboard': 'active' if filename == 'index.html' else '',
        'active_subjects': 'active' if filename == 'subjects.html' else '',
        'active_lessons': 'active' if filename == 'lessons.html' else '',
        'active_groups': 'active' if filename in ['groups.html', 'group-details.html'] else '',
        'active_aiteacher': 'active' if filename == 'ai-teacher.html' else '',
        'active_calendar': 'active' if filename == 'study-planner.html' else '',
        'active_assignments': 'active' if filename == 'assignments.html' else '',
        'active_attendance': 'active' if filename == 'attendance.html' else '',
        'active_gamification': 'active' if filename == 'analytics.html' else '',
        'active_scan': 'active' if filename == 'scan-learn.html' else '',
        'active_quiz': 'active' if filename == 'quiz.html' else '',
        'active_research': 'active' if filename == 'research.html' else '',
        'active_resources': 'active' if filename == 'resources.html' else '',
        'active_coding': 'active' if filename == 'coding.html' else '',
        'active_diary': 'active' if filename == 'diary.html' else '',
    }
    
    nav_filled = nav_template.format(**context)
    
    # Replace everything between <nav aria-label="Main navigation"> and </nav>
    pattern = re.compile(r'<nav aria-label="Main navigation">.*?</nav>', re.DOTALL)
    if pattern.search(content):
        new_content = pattern.sub(nav_filled, content)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated nav in {filename}")

