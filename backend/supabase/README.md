# Supabase setup

1. Run `migrations/20260929000000_create_tasks.sql` in the Supabase SQL Editor. The migration creates the task table and enables per-user row-level security.
2. Set `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` in `backend/.env.local`. FastAPI forwards the signed-in user's access token so database requests remain subject to row-level security.
3. Set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_API_BASE_URL` in `frontend/.env.local`. Use the publishable/anon key for the React app.
4. Enable email/password sign-in in Supabase Authentication. If email confirmation is enabled, new users must confirm their email before signing in.
