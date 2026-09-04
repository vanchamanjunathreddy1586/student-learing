# Smart Learning

A production-style, provider-neutral AI classroom prototype. The frontend only calls the Flask API; provider credentials stay server-side.

## Run locally

```powershell
Copy-Item .env.example .env
npm install
npm start
```

Open http://localhost:5000. With no provider configured, the isolated demo provider keeps local development functional. Add `OPENAI_API_KEY` or run Ollama to use a real model.

## Supabase setup

1. Create a Supabase project and run `supabase/migrations/001_initial_schema.sql` in its SQL editor.
2. Copy the project URL and publishable key into `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` in `.env`.
3. Enable Email provider authentication in Supabase Authentication settings.

For direct PostgreSQL access, set `DATABASE_URL` using the template in `.env.example`. Percent-encode special characters in the database password, and never commit the completed connection string.

The login and registration pages use Supabase Auth directly. The Flask API validates the resulting bearer token when protected endpoints are added.

## Architecture

- `frontend/`: responsive vanilla JS classroom experience
- `server/`: Node.js Express API and Supabase authentication
- `backend/services/ai_gateway/`: legacy Python AI gateway implementation
- `supabase/migrations/`: PostgreSQL tables and RLS policies
- `/api/ai/providers`: capability and availability metadata, never secrets

Supabase is the intended primary database. The JavaScript server falls back to the demo provider when Supabase credentials are not present, so the UX remains testable without infrastructure.
