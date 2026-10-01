# Sounds Like That — Admin Portal

Next.js admin dashboard for music order operations: orders, MTD spreadsheet, scheduling, producers, and notifications.

## Development

```bash
npm install --prefix frontend
npm run dev
# in another terminal:
cd backend && ./venv/bin/uvicorn app.main:app --reload --port 8001
```

Open [http://localhost:3000](http://localhost:3000). Root `npm run dev` proxies into `frontend/`.

## Stack

- Next.js 15 (App Router) in `frontend/`
- FastAPI in `backend/`
- TypeScript + Tailwind CSS v4

## Deploy (Vercel Services)

Deploy the **repository root** to Vercel. `vercel.json` runs two services:

| Service | Root | Role |
|--------|------|------|
| `web` | `frontend/` | Next.js UI |
| `api` | `backend/` | FastAPI (`index:app`) |

Public routing: `/api/*` and `/health` → api; everything else → web.

Set these project env vars (shared by both services):

- `DATABASE_URL` — Supabase pooler URL
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REDIRECT_URI` (optional Gmail)
- `FRONTEND_URL` = `https://slt-teal.vercel.app`
