import re
with open('frontend/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

html = html.replace('<div class="course-art" style="background: var(--bg-card);">', '<div class="course-art" style="background: var(--bg-card); pointer-events: none;">')
html = html.replace('<div class="course-info">', '<div class="course-info" style="pointer-events: none;">')
html = re.sub(r'<a href="/lessons\.html" class="continue-card" style="([^"]+)">', r'<a href="/lessons.html" onclick="window.location.href=\'/lessons.html\';" class="continue-card" style="\1">', html)

with open('frontend/index.html', 'w', encoding='utf-8', newline='\n') as f:
    f.write(html)
