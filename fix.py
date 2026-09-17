import sys

content = open('frontend/js/app.js', 'r', encoding='utf-8').read()
index = content.find('// Real Lesson System: Dashboard Resume Logic')
if index != -1:
    content = content[:index]

logic = '''// Real Lesson System: Dashboard Resume Logic
const continueCardWrapper = document.getElementById('continue-card-wrapper');
if (continueCardWrapper) {
  const loadRecentLesson = async () => {
    try {
      const response = await fetch('/api/lessons/recent', { headers: getHeaders() });
      const { success, data } = await response.json();
      
      if (success && data) {
        const pct = Math.round(data.progress.progress_percentage || 0);
        continueCardWrapper.innerHTML = \
          <div class="course-art"><div class="orbit orbit-a"></div><div class="orbit orbit-b"></div><span>📚</span></div>
          <div class="course-info">
            <span class="tag">DOCUMENT</span>
            <h3>\</h3>
            <p>Page \</p>
            <div class="course-progress">
              <div><span id="course-pct">\% complete</span></div>
              <div class="progress"><i id="course-bar" style="width:\%"></i></div>
            </div>
            <button class="primary-btn" id="resume-btn" style="width: 100%; margin-top: 16px;" onclick="window.location.href='/reader.html?id=\'">Continue Learning <span>✨</span></button>
          </div>
        \;
      } else {
        continueCardWrapper.innerHTML = \
          <div class="course-art" style="background: var(--bg-card);"><i class="fas fa-book-open" style="font-size: 32px; color: var(--accent);"></i></div>
          <div class="course-info">
            <h3>Start Your First Lesson</h3>
            <p>Upload a document to begin.</p>
            <button class="primary-btn" id="resume-btn" style="width: 100%; margin-top: 16px;" onclick="window.location.href='/lessons.html'">Browse My Lessons <span>✨</span></button>
          </div>
        \;
      }
    } catch (err) {
      console.error('Failed to load recent lesson:', err);
    }
  };
  loadRecentLesson();
}
'''
with open('frontend/js/app.js', 'w', encoding='utf-8') as f:
    f.write(content + logic)
