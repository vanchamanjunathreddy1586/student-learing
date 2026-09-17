import os

css = """
/* TYPOGRAPHY AND HIGHLIGHTING IMPROVEMENTS */

/* Clear page titles & Section headings with subtle glow/gradient */
.welcome h1, .section-heading h2, .group-header h2 {
  font-weight: 800 !important;
  letter-spacing: -0.5px;
  background: linear-gradient(135deg, #ffffff 40%, var(--accent) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 0 4px 20px rgba(98, 230, 226, 0.15);
}

.section-heading h2 {
  font-size: 24px;
}

/* Subtle glow/gradient for key headings and eyebrow text */
.eyebrow, .nav-label {
  font-weight: 700;
  letter-spacing: 2px !important;
  color: var(--accent) !important;
  text-transform: uppercase;
}

/* Stand-out stats/numbers */
.stat-card strong, .ring span {
  font-weight: 800 !important;
  font-size: 32px !important;
  color: #fff !important;
  text-shadow: 0 0 10px rgba(255, 107, 157, 0.3);
}

/* Highlight important words with accent gradients (e.g. User Name) */
#greeting span.text-gradient {
  background: linear-gradient(135deg, var(--accent), var(--accent-secondary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* Subject names, Lesson titles, Group names */
.stat-card h3, .continue-card h3, .course-info h3 {
  font-weight: 700 !important;
  font-size: 18px !important;
  color: #ffffff !important;
  letter-spacing: -0.2px;
}

/* Make badges (Public / Private) prominent */
.status-badge, .badge, .subject-tag {
  font-weight: 700 !important;
  letter-spacing: 0.5px;
  padding: 4px 10px !important;
  border-radius: 6px !important;
  text-transform: uppercase;
  font-size: 11px !important;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
}

/* specific badge colors based on text content */
.stat-card .tag, .stat-card span[style*="background"], .badge {
  font-weight: 700 !important;
  color: #fff !important;
  text-shadow: 0 1px 2px rgba(0,0,0,0.5);
}

/* Stronger Button Text Contrast */
.primary-btn {
  font-weight: 700 !important;
  letter-spacing: 0.5px;
  color: #000000 !important; 
  text-shadow: none !important;
}

/* Important Status Messages */
#toast.show {
  font-weight: 600;
  letter-spacing: 0.2px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.5), 0 0 15px var(--accent);
}

.progress-text {
  font-weight: 600 !important;
}

/* Improve general readability & hierarchy */
.muted, .text-secondary, p {
  line-height: 1.6;
}

.continue-card p {
  color: rgba(255,255,255,0.7) !important;
}
"""

with open('frontend/css/dashboard.css', 'a', encoding='utf-8') as f:
    f.write(css)
print("CSS appended")
