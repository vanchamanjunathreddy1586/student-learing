import os
import glob
import re

html_files = glob.glob('frontend/*.html')

for file in html_files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()

    # If it has a sidebar, modify it
    if '<aside class="sidebar">' in content:
        # Change classroom.html to subjects.html, and Subjects to My Subjects
        new_content = re.sub(
            r'<a class="nav-item(.*?)href="/classroom.html"><span>(.*?)</span> Subjects</a>',
            r'<a class="nav-item\1href="/subjects.html"><span>\2</span> My Subjects</a>',
            content
        )
        
        # Check if lessons.html is already in the sidebar
        if 'href="/lessons.html"' not in new_content:
            # Insert Lessons right after My Subjects
            new_content = re.sub(
                r'(<a class="nav-item.*?href="/subjects.html"><span>.*?</span> My Subjects</a>)',
                r'\1\n            <a class="nav-item " href="/lessons.html"><span>📖</span> Lessons</a>',
                new_content
            )
            
        with open(file, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {file}")

print("Done")
