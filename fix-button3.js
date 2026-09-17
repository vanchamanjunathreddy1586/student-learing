import fs from 'fs';
let content = fs.readFileSync('frontend/index.html', 'utf8');

const newCard = \<a href="/lessons.html" class="continue-card" style="cursor: pointer; text-decoration: none; display: flex; flex-direction: column;">
  <div class="course-art" style="background: var(--bg-card);"><i class="fas fa-book-open" style="font-size: 32px; color: var(--accent);"></i></div>
  <div class="course-info">
    <h3 style="color: var(--text-primary); margin: 0 0 4px 0;">Start Learning</h3>
    <p style="color: var(--text-secondary); margin: 0 0 16px 0;">Upload a document or pick up where you left off.</p>
    <div class="primary-btn" style="width: 100%; text-align: center; box-sizing: border-box;">Start Learning <span>→</span></div>
  </div>
</a>\;

content = content.replace(/<article class="continue-card"[^>]*>[\s\S]*?<\/article>/, newCard);
fs.writeFileSync('frontend/index.html', content, 'utf8');
