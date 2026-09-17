import fs from 'fs';
let content = fs.readFileSync('frontend/index.html', 'utf8');

const newCard = \<article class="continue-card" id="continue-card-wrapper" onclick="window.location.href='/lessons.html'" style="cursor: pointer;">
  <div class="course-art" style="background: var(--bg-card);"><i class="fas fa-book-open" style="font-size: 32px; color: var(--accent);"></i></div>
  <div class="course-info">
    <h3>Start Learning</h3>
    <p>Upload a document or pick up where you left off.</p>
    <button class="primary-btn" id="resume-btn" style="width: 100%; margin-top: 16px;" onclick="window.location.href='/lessons.html'; event.stopPropagation();">Start Learning <span>&rarr;</span></button>
  </div>
</article>\;

content = content.replace(/<article class="continue-card" id="continue-card-wrapper">[\s\S]*?<\/article>/, newCard);
fs.writeFileSync('frontend/index.html', content, 'utf8');
