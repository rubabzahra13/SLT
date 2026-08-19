# Sounds Like That — Admin Portal

Next.js admin dashboard for music order operations: orders, MTD spreadsheet, scheduling, producers, and notifications.

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

For a clean dev start (clears port conflicts and cache):

```bash
npm run dev:clean
```

## Stack

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS v4
- Mock data in `src/data/mock-data.json`

## Deploy

Deploy the repository root to [Vercel](https://vercel.com):

| Setting | Value |
|--------|--------|
| Framework Preset | **Next.js** |
| Root Directory | **`./`** (repo root — not `frontend/`) |
| Build Command | `npm run build` (default) |
| Output Directory | *(leave default — Vercel sets this for Next.js)* |
| Install Command | `npm install` (default) |
| Environment Variables | **None required** (mock data only) |

Click **Deploy**. `vercel.json` in the repo root pins the build settings above.
