import glob
import re

html_files = glob.glob('frontend/*.html')

for file in html_files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find the nav item for subjects.html and insert lessons.html right after it if it's not already in the nav block
    nav_match = re.search(r'<nav aria-label="Main navigation">(.*?)</nav>', content, re.DOTALL)
    if nav_match:
        nav_content = nav_match.group(1)
        if 'href="/lessons.html"' not in nav_content:
            new_nav_content = re.sub(
                r'(<a class="nav-item.*?href="/subjects.html".*?</a>)',
                r'\1\n            <a class="nav-item " href="/lessons.html"><span>📖</span> Lessons</a>',
                nav_content
            )
            content = content.replace(nav_content, new_nav_content)
            with open(file, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f'Updated {file}')
