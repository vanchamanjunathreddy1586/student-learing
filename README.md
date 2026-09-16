# Smart Learning Platform 🚀

A comprehensive, AI-powered learning ecosystem built for students. 

## Features
* **Adaptive Quizzes:** AI-generated quizzes that adapt to your topic inputs, grade automatically, and log progress.
* **Scan & Learn:** Upload documents, PDFs, or images and let AI summarize the key concepts and generate immediate practice material.
* **AI Teacher:** A voice-activated tutor powered by OpenAI, Gemini, Anthropic, or Ollama. Ask questions with your voice and get text-to-speech spoken answers back!
* **Classroom Dashboard:** Manage your subjects, topics, and track mastery percentages dynamically.
* **Smart Study Planner:** Focus sessions, daily streaks, gamification points, and activity tracking.

## Getting Started

1. Set up a Supabase project and create the necessary tables.
2. Run all SQL migrations located in `supabase/migrations/` sequentially via the Supabase SQL editor.
   * *Make sure to run `006_smart_learning_core.sql` for the core schema.*
3. Copy `.env.example` to `.env` and fill in your Supabase keys and AI provider keys.
4. Run `npm install` and `npm start`.
5. Access the app at `http://localhost:5000`.

## Architecture
- **Frontend:** Vanilla JS, HTML, CSS with Glassmorphism and dark themes. Mobile responsive.
- **Backend:** Node.js with Express.
- **Database:** Supabase PostgreSQL with Row-Level Security (RLS) policies.
- **AI Gateway:** Custom routing layer for Ollama, OpenAI, and Gemini.
