import re

with open('frontend/lessons.html', 'r', encoding='utf-8') as f:
    c = f.read()

c = re.sub(r'class="nav-item active"', 'class="nav-item "', c)
c = re.sub(r'(<a class="nav-item )(" href="/lessons.html")', r'\1active\2', c)

with open('frontend/lessons.html', 'w', encoding='utf-8') as f:
    f.write(c)
print('Fixed lessons.html active state')
