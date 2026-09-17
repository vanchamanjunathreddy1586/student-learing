import glob
import re

html_files = glob.glob('frontend/*.html')

for file in html_files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()

    if '<aside class="sidebar">' in content and 'href="/lessons.html"' not in content:
        # Insert after subjects.html
        new_content = re.sub(
            r'(href="/subjects.html">.*?</a>)',
            r'\1\n          <a class="nav-item " href="/lessons.html"><span>📖</span> Lessons</a>',
            content
        )
        with open(file, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f'Updated {file}')
