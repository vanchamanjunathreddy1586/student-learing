import os
import glob
import re

bottom_nav_template = """
    <!-- Mobile Bottom Navigation -->
    <nav class="mobile-bottom-nav">
      <div class="mobile-bottom-nav-inner">
        <a href="/" class="mobile-nav-item {active_home}">
          <span class="emoji">🏠</span>
          <span>Home</span>
        </a>
        <a href="/subjects.html" class="mobile-nav-item {active_subjects}">
          <span class="emoji">📚</span>
          <span>Subjects</span>
        </a>
        <a href="/lessons.html" class="mobile-nav-item {active_lessons}">
          <span class="emoji">📺</span>
          <span>Lessons</span>
        </a>
        <a href="/groups.html" class="mobile-nav-item {active_groups}">
          <span class="emoji">👥</span>
          <span>Groups</span>
        </a>
        <button class="mobile-nav-item mobile-menu-toggle" style="background:transparent; border:none; padding:0;" onclick="document.querySelector('.sidebar').classList.toggle('open')">
          <span class="emoji">☰</span>
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

    # Skip if already injected
    if 'mobile-bottom-nav' in content:
        print(f"Skipping {filepath}, already has bottom nav")
        continue

    filename = os.path.basename(filepath)
    
    context = {
        'active_home': 'active' if filename == 'index.html' else '',
        'active_subjects': 'active' if filename == 'subjects.html' else '',
        'active_lessons': 'active' if filename == 'lessons.html' else '',
        'active_groups': 'active' if filename in ['groups.html', 'group-details.html'] else '',
    }
    
    bottom_nav = bottom_nav_template.format(**context)
    
    # Inject right before </body>
    new_content = content.replace('</body>', f"{bottom_nav}</body>")
    
    # Alternatively if </body> isn't perfectly matched, inject after main
    if '</body>' not in content:
        new_content = content + bottom_nav
        
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print(f"Injected bottom nav into {filename}")
