# FastAPI backend

## Setup

1. Create `.env.local` from `.env.example`. Set the Supabase project URL and publishable key. The API forwards each signed-in user's access token, so RLS remains active; do not use a service-role key here.
2. From this directory, create and activate the virtual environment, then install requirements:

   ```powershell
   py -3.13 -m venv .venv
   .\.venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   ```

3. Run the API:

   ```powershell
   uvicorn main:app --reload --port 8000
   ```

The API validates the Supabase access token issued by the frontend and scopes task reads/writes to that authenticated user. Apply the SQL migration in `supabase/migrations/` to the Supabase project before using task endpoints. The frontend calls this API at `VITE_API_BASE_URL` (default `http://127.0.0.1:8000`).
