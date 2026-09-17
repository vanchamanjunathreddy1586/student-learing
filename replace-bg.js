import fs from 'fs';
let content = fs.readFileSync('frontend/admin.html', 'utf8');

// Replace glass-background with occ-bg-elements
content = content.replace(
  '<div class="glass-background">\n    <div class="blur-circle circle-1"></div>\n    <div class="blur-circle circle-2"></div>\n    <div class="blur-circle circle-3"></div>\n  </div>',
  \<div class="occ-bg-elements">
    <div class="occ-grid"></div>
  </div>\
);

// Add CSS to override body and define occ-bg-elements
const occStyle = \
  <style>
    /* Premium Futuristic Background Override */
    html[data-theme] body, body {
      background: #030712 !important;
      background-color: #030712 !important;
      color: #f3f4f6 !important;
      margin: 0;
      min-height: 100vh;
      overflow-x: hidden;
      font-family: 'Inter', sans-serif;
    }

    .occ-bg-elements {
      position: fixed;
      top: 0; left: 0; width: 100vw; height: 100vh;
      z-index: -1;
      pointer-events: none;
      background: radial-gradient(circle at 15% 50%, rgba(59, 130, 246, 0.15) 0%, transparent 50%),
                  radial-gradient(circle at 85% 30%, rgba(139, 92, 246, 0.15) 0%, transparent 50%),
                  #030712;
      overflow: hidden;
    }

    .occ-grid {
      position: absolute;
      top: 0; left: 0; width: 100vw; height: 100vh;
      background-image: 
        linear-gradient(to right, rgba(59, 130, 246, 0.05) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(59, 130, 246, 0.05) 1px, transparent 1px);
      background-size: 50px 50px;
      transform: perspective(500px) rotateX(60deg) scale(2);
      transform-origin: top center;
      animation: occGridMove 20s linear infinite;
      opacity: 0.6;
    }

    /* Soft glowing blobs */
    .occ-bg-elements::before {
      content: '';
      position: absolute;
      width: 400px;
      height: 400px;
      background: rgba(59, 130, 246, 0.1);
      border-radius: 50%;
      filter: blur(80px);
      top: -100px;
      left: -100px;
      animation: occFloat 15s ease-in-out infinite alternate;
    }

    .occ-bg-elements::after {
      content: '';
      position: absolute;
      width: 300px;
      height: 300px;
      background: rgba(139, 92, 246, 0.1);
      border-radius: 50%;
      filter: blur(80px);
      bottom: -50px;
      right: -50px;
      animation: occFloat2 12s ease-in-out infinite alternate;
    }

    @keyframes occGridMove {
      0% { background-position: 0 0; }
      100% { background-position: 0 50px; }
    }
    @keyframes occFloat {
      0% { transform: translate(0, 0) scale(1); }
      100% { transform: translate(50px, 50px) scale(1.1); }
    }
    @keyframes occFloat2 {
      0% { transform: translate(0, 0) scale(1); }
      100% { transform: translate(-50px, -50px) scale(1.2); }
    }

    /* Minimal floating particles */
    .particle {
      position: absolute;
      width: 3px;
      height: 3px;
      background: rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      box-shadow: 0 0 5px rgba(255, 255, 255, 0.5);
      animation: occParticleFloat 10s infinite linear;
    }
    
    @keyframes occParticleFloat {
      0% { transform: translateY(100vh) scale(0); opacity: 0; }
      10% { opacity: 1; scale: 1; }
      90% { opacity: 1; }
      100% { transform: translateY(-10vh) scale(0); opacity: 0; }
    }
  </style>
\;

content = content.replace('</head>', occStyle + '</head>');

fs.writeFileSync('frontend/admin.html', content, 'utf8');
