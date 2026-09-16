import { getAccessToken, supabase } from './supabase.js';

const headers = () => {
  const token = getAccessToken();
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
};

let currentQuiz = null;
let currentQuestionIndex = 0;
let score = 0;

// On load, check if topic in URL
const urlParams = new URLSearchParams(window.location.search);
const topicParam = urlParams.get('topic');
if (topicParam) {
  document.getElementById('quiz-topic-input').value = topicParam;
}

document.getElementById('start-quiz-form').onsubmit = async (e) => {
  e.preventDefault();
  const topic = document.getElementById('quiz-topic-input').value;
  
  document.getElementById('setup-view').style.display = 'none';
  document.getElementById('loading-state').style.display = 'block';
  
  try {
    const res = await fetch('/api/ai/quiz', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ topic })
    });
    
    if (!res.ok) throw new Error('Failed to generate quiz');
    currentQuiz = await res.json();
    
    // Fallback if AI fails to return proper array
    if (!currentQuiz.questions || currentQuiz.questions.length === 0) throw new Error('No questions generated');
    
    currentQuestionIndex = 0;
    score = 0;
    
    document.getElementById('loading-state').style.display = 'none';
    document.getElementById('quiz-view').style.display = 'block';
    document.getElementById('quiz-topic-label').textContent = currentQuiz.topic;
    document.getElementById('ai-provider-name').textContent = currentQuiz.generated_by || 'AI';
    
    renderQuestion();
  } catch(e) {
    console.error(e);
    alert('Could not generate quiz. Please try again.');
    location.reload();
  }
};

const renderQuestion = () => {
  const q = currentQuiz.questions[currentQuestionIndex];
  document.getElementById('question-counter').textContent = `Question ${currentQuestionIndex + 1} of ${currentQuiz.questions.length}`;
  document.getElementById('score-counter').textContent = `Score: ${score}`;
  document.getElementById('quiz-progress').style.width = `${((currentQuestionIndex) / currentQuiz.questions.length) * 100}%`;
  
  document.getElementById('question-text').textContent = q.question;
  
  const optionsContainer = document.getElementById('options-container');
  optionsContainer.innerHTML = '';
  
  const letters = ['A', 'B', 'C', 'D', 'E'];
  
  q.options.forEach((opt, idx) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.dataset.letter = letters[idx];
    btn.textContent = opt;
    btn.onclick = () => handleAnswer(idx, btn);
    optionsContainer.appendChild(btn);
  });
  
  document.getElementById('explanation-box').style.display = 'none';
  document.getElementById('next-btn').style.display = 'none';
};

const handleAnswer = (selectedIndex, btnElement) => {
  const q = currentQuiz.questions[currentQuestionIndex];
  const isCorrect = selectedIndex === q.answer;
  
  // Disable all options
  const buttons = document.querySelectorAll('.option-btn');
  buttons.forEach((b, idx) => {
    b.disabled = true;
    if (idx === q.answer) b.classList.add('correct');
    else if (idx === selectedIndex && !isCorrect) b.classList.add('incorrect');
  });
  
  if (isCorrect) {
    score++;
    document.getElementById('score-counter').textContent = `Score: ${score}`;
  }
  
  // Show explanation if exists, else just show generic
  const explBox = document.getElementById('explanation-box');
  explBox.innerHTML = isCorrect 
    ? `<strong>Correct!</strong> ${q.explanation || ''}` 
    : `<strong>Incorrect.</strong> The right answer was ${q.options[q.answer]}. ${q.explanation || ''}`;
  explBox.classList.add('show');
  
  const nextBtn = document.getElementById('next-btn');
  nextBtn.style.display = 'block';
  nextBtn.onclick = () => {
    currentQuestionIndex++;
    if (currentQuestionIndex < currentQuiz.questions.length) {
      renderQuestion();
    } else {
      showResults();
    }
  };
};

const showResults = async () => {
  document.getElementById('quiz-view').style.display = 'none';
  document.getElementById('results-view').style.display = 'block';
  
  const percentage = Math.round((score / currentQuiz.questions.length) * 100);
  document.getElementById('final-score').textContent = `${percentage}%`;
  
  const msg = document.getElementById('result-message');
  const subMsg = document.getElementById('result-submessage');
  
  if (percentage >= 80) {
    msg.textContent = 'Excellent!';
    subMsg.textContent = 'You have shown strong mastery in this topic.';
  } else if (percentage >= 50) {
    msg.textContent = 'Good effort!';
    subMsg.textContent = 'You are getting there. A little more revision will help.';
  } else {
    msg.textContent = 'Keep practicing!';
    subMsg.textContent = 'This topic might need more attention. Review the concepts and try again.';
  }
  
  // Log activity and potentially update weak_topics
  if (supabase) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Log quiz completion
        await fetch('/api/study/session', { 
          method: 'POST', 
          headers: headers(), 
          body: JSON.stringify({ duration: 5 }) // Estimate 5 mins for quiz
        });
        
        // If topic exists in topics table, we'd update mastery, but for now we just rely on AI to log weak topics if < 50%
        if (percentage < 50) {
          console.log('Topic marked as weak');
          // In a real implementation we'd POST to a /api/classroom/weak_topics endpoint here.
        }
      }
    } catch(e) {
      console.error('Failed to log results', e);
    }
  }
};
