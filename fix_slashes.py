with open('frontend/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

html = html.replace(r"window.location.href=\'/lessons.html\';", "window.location.href='/lessons.html';")

with open('frontend/index.html', 'w', encoding='utf-8', newline='\n') as f:
    f.write(html)
