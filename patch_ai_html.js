import fs from 'fs';

const htmlFile = 'frontend/ai-teacher.html';
let content = fs.readFileSync(htmlFile, 'utf8');

const newStyles = `
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.0.8/purify.min.js"></script>
  <style>
    /* Add specific styles for the AI chat layout to override dashboard defaults */
    .dashboard-page .main-content.ai-chat-layout {
      padding: 0 !important;
      display: flex;
      flex-direction: column;
      height: 100dvh;
      overflow: hidden;
      background: var(--bg-color);
    }
    
    .ai-header {
      display: flex;
      align-items: center;
      padding: 16px 24px;
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      gap: 16px;
      flex-shrink: 0;
      z-index: 10;
    }
    
    .ai-header .mobile-menu {
      background: none;
      border: none;
      color: var(--text-primary);
      font-size: 20px;
      cursor: pointer;
      display: none;
    }
    
    @media(max-width: 900px) {
      .ai-header .mobile-menu {
        display: block;
      }
    }
    
    .ai-header-info {
      display: flex;
      flex-direction: column;
    }
    
    .ai-title {
      font-size: 18px;
      font-weight: 700;
      color: var(--text-primary);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .ai-subtitle {
      font-size: 13px;
      color: var(--text-secondary);
      display: flex;
      align-items: center;
      gap: 6px;
    }
    
    .ai-status-dot {
      width: 8px;
      height: 8px;
      background: #10b981;
      border-radius: 50%;
      display: inline-block;
      box-shadow: 0 0 8px rgba(16, 185, 129, 0.5);
    }

    .chat-container {
      display: flex;
      flex-direction: column;
      flex: 1;
      width: 100%;
      max-width: 900px;
      margin: 0 auto;
      overflow: hidden;
      position: relative;
    }

    .chat-messages {
      flex: 1;
      padding: 24px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 24px;
      scroll-behavior: smooth;
    }

    .chat-bubble-wrapper {
      display: flex;
      flex-direction: column;
      max-width: 85%;
    }
    
    .chat-bubble-wrapper.user {
      align-self: flex-end;
      align-items: flex-end;
    }
    
    .chat-bubble-wrapper.ai {
      align-self: flex-start;
      align-items: flex-start;
    }

    .chat-bubble {
      padding: 16px 20px;
      font-size: 15px;
      line-height: 1.6;
      border-radius: 20px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.05);
    }

    .chat-bubble.user {
      background: linear-gradient(135deg, var(--accent), #c054ff);
      color: #fff;
      border-bottom-right-radius: 4px;
    }

    .chat-bubble.ai {
      background: var(--surface);
      color: var(--text-primary);
      border: 1px solid var(--border);
      border-bottom-left-radius: 4px;
    }

    .chat-bubble.ai p:last-child {
      margin-bottom: 0;
    }
    .chat-bubble.ai p:first-child {
      margin-top: 0;
    }
    .chat-bubble.ai pre {
      background: rgba(0,0,0,0.3);
      padding: 12px;
      border-radius: 8px;
      overflow-x: auto;
      border: 1px solid rgba(255,255,255,0.1);
    }
    .chat-bubble.ai code {
      font-family: monospace;
      font-size: 13px;
    }

    .chat-timestamp {
      font-size: 11px;
      color: var(--text-secondary);
      margin-top: 6px;
      display: flex;
      gap: 6px;
      align-items: center;
    }

    .quick-actions-container {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 16px;
    }

    .quick-action-chip {
      background: var(--surface);
      border: 1px solid var(--border);
      color: var(--text-primary);
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .quick-action-chip:hover {
      background: rgba(98, 230, 226, 0.1);
      border-color: var(--accent);
      color: var(--accent);
      transform: translateY(-2px);
    }

    .typing-indicator {
      display: flex;
      gap: 4px;
      padding: 16px 20px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 20px;
      border-bottom-left-radius: 4px;
      width: fit-content;
      align-items: center;
    }

    .typing-dot {
      width: 6px;
      height: 6px;
      background: var(--accent);
      border-radius: 50%;
      animation: typing 1.4s infinite ease-in-out both;
    }

    .typing-dot:nth-child(1) { animation-delay: -0.32s; }
    .typing-dot:nth-child(2) { animation-delay: -0.16s; }

    @keyframes typing {
      0%, 80%, 100% { transform: scale(0); }
      40% { transform: scale(1); }
    }

    .chat-input-area {
      padding: 16px 24px;
      background: var(--surface);
      border-top: 1px solid var(--border);
      display: flex;
      gap: 12px;
      align-items: flex-end;
      padding-bottom: calc(16px + env(safe-area-inset-bottom));
    }

    .chat-input-wrapper {
      flex: 1;
      background: var(--bg-color);
      border: 1px solid var(--border);
      border-radius: 24px;
      padding: 8px 20px;
      display: flex;
      align-items: center;
      transition: border-color 0.2s;
      box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);
    }

    .chat-input-wrapper:focus-within {
      border-color: var(--accent);
      box-shadow: 0 0 0 2px rgba(98, 230, 226, 0.2);
    }

    .chat-input-wrapper textarea {
      width: 100%;
      background: transparent;
      border: 0;
      outline: 0;
      color: var(--text-primary);
      padding: 6px 0;
      resize: none;
      max-height: 120px;
      font-family: 'Inter', sans-serif;
      font-size: 15px;
      line-height: 1.5;
    }
    
    .chat-input-wrapper textarea::placeholder {
      color: var(--text-secondary);
      opacity: 0.7;
    }

    .btn-send {
      background: var(--accent);
      color: #000;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      cursor: pointer;
      border: 0;
      transition: all 0.2s;
      flex-shrink: 0;
      font-size: 18px;
    }

    .btn-send:hover:not(:disabled) {
      transform: scale(1.05);
      background: #4cd5d1;
      box-shadow: 0 4px 12px rgba(98, 230, 226, 0.3);
    }

    .btn-send:disabled {
      background: var(--border);
      color: var(--text-secondary);
      cursor: not-allowed;
    }
    
    .btn-send.loading {
      background: transparent;
      border: 2px solid var(--border);
      border-top-color: var(--accent);
      animation: spin 1s linear infinite;
      color: transparent;
    }
    
    @keyframes spin { 100% { transform: rotate(360deg); } }
  </style>`;

// Replace existing style block with the new styles
content = content.replace(/<style>[\s\S]*?<\/style>/, newStyles);

// Replace main content with the new layout
const newMainContent = `
    <main class="main-content ai-chat-layout">
      <header class="ai-header">
        <button class="mobile-menu" aria-label="Open menu"><i class="fas fa-bars"></i></button>
        <div class="ai-header-info">
          <div class="ai-title"><i class="fas fa-robot" style="color:var(--accent)"></i> AI Teacher</div>
          <div class="ai-subtitle">Your personal study assistant <span class="ai-status-dot"></span> Online</div>
        </div>
      </header>

      <div class="chat-container">
        <div class="chat-messages" id="chat-messages">
          <!-- Initial Welcome Message -->
          <div class="chat-bubble-wrapper ai">
            <div class="chat-bubble ai">
              👋 Hi! I'm your AI Teacher.<br><br>
              I can help you:<br>
              • Understand difficult concepts<br>
              • Solve questions step-by-step<br>
              • Generate quizzes<br>
              • Create study plans<br>
              • Explain topics in simple language<br>
              • Identify weak topics<br>
              • Prepare for exams<br><br>
              Ask me anything about your studies.
            </div>
            <div class="quick-actions-container">
              <button class="quick-action-chip" data-prompt="Explain a complex topic in simple words"><i class="fas fa-book-open"></i> Explain a topic</button>
              <button class="quick-action-chip" data-prompt="Give me a quick 3-question quiz to test my knowledge"><i class="fas fa-brain"></i> Give me a quiz</button>
              <button class="quick-action-chip" data-prompt="Make bullet-point study notes for my exam"><i class="fas fa-list-ul"></i> Make study notes</button>
              <button class="quick-action-chip" data-prompt="Create a weekly study plan for me"><i class="fas fa-calendar-alt"></i> Create study plan</button>
              <button class="quick-action-chip" data-prompt="I have a doubt, can you help me solve it?"><i class="fas fa-question-circle"></i> Ask a doubt</button>
            </div>
          </div>
        </div>
        
        <div class="chat-input-area">
          <div class="chat-input-wrapper">
            <textarea id="chat-input" placeholder="Ask your AI Teacher anything..." rows="1"></textarea>
          </div>
          <button class="btn-send" id="send-btn" disabled>
            <i class="fas fa-paper-plane"></i>
          </button>
        </div>
      </div>
    </main>
`;

// Replace everything between <main class="main-content"> and </main>
content = content.replace(/<main class="main-content">[\s\S]*?<\/main>/, newMainContent);

fs.writeFileSync(htmlFile, content);
console.log("Patched ai-teacher.html layout");
