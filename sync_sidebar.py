import re
import os

def read_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()

def write_file(path, content):
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

index_html = read_file('frontend/index.html')

# Extract sidebar
sidebar_match = re.search(r'<aside class="sidebar">.*?</aside>', index_html, re.DOTALL)
if not sidebar_match:
    print("Sidebar not found in index.html")
    exit(1)

sidebar_content = sidebar_match.group(0)

files_to_update = ['frontend/subjects.html', 'frontend/groups.html', 'frontend/group-details.html', 'frontend/lessons.html']

for file in files_to_update:
    if os.path.exists(file):
        content = read_file(file)
        
        # We need to replace whatever sidebar is in there. 
        # In my generated files I used <aside class="sidebar">...</aside>
        if re.search(r'<aside class="sidebar">.*?</aside>', content, re.DOTALL):
            new_content = re.sub(r'<aside class="sidebar">.*?</aside>', sidebar_content, content, flags=re.DOTALL)
            
            # For each file, we need to update the active class
            # Remove all active classes from the sidebar block
            new_content = re.sub(r'class="nav-item active"', 'class="nav-item "', new_content)
            
            # Add active class based on the file
            if file == 'frontend/subjects.html':
                new_content = re.sub(r'(<a class="nav-item )(" href="/classroom.html")', r'\1active\2', new_content)
            elif file == 'frontend/lessons.html':
                # wait, lessons.html wasn't in index.html's sidebar? 
                # Let's add it if it's missing, or maybe the user has a different name
                # Actually, there is NO lessons.html in the index.html sidebar!
                # Ah! Wait! `Resource Library` goes to `/resources.html`?
                pass
            elif file == 'frontend/groups.html' or file == 'frontend/group-details.html':
                new_content = re.sub(r'(<a class="nav-item )(" href="/groups.html")', r'\1active\2', new_content)
                
            write_file(file, new_content)
            print(f"Updated {file}")
        else:
            print(f"Sidebar not found in {file}")

print("Done")
