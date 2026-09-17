import urllib.request
import re

content = urllib.request.urlopen('https://student-learing-web.vercel.app/').read().decode('utf-8')
match = re.search(r'<nav aria-label="Main navigation">(.*?)</nav>', content, re.DOTALL)
if match:
    with open('nav.txt', 'w', encoding='utf-8') as f:
        f.write(match.group(1))
    print('Nav saved to nav.txt')
else:
    print('Nav not found')
