# DUALFORGE

DUALFORGE is a responsive PWA-style web app for healthy discipline duels: habits, streaks, recovery challenges, evidence review and competitive Discipline XP.

## Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- Supabase Auth
- Supabase PostgreSQL
- Supabase Storage
- Supabase Realtime
- Supabase Row Level Security

## Features In Progress

- Real Supabase authentication.
- Account creation with private full name, public unique username, avatar, description and password confirmation.
- Profile setup and privacy-ready profile data.
- Duel creation and invitation code flow.
- Daily habits and check-ins.
- Streak calculation with `completed`, `rescued` and `failed` states.
- Recovery challenges with evidence submission and rival review.
- Challenge decision window to finish or continue a completed challenge.
- Dark neon dashboard, arena comparison and evidence center.

## Local Setup

Install dependencies:

```bash
npm install
```

Create `.env` from `.env.example`:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
```

Run the app:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

## Supabase Setup

Run the SQL migrations in order:

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_profiles_and_challenge_decisions.sql`

If you do not have the Supabase CLI installed, paste each migration into the Supabase SQL Editor and run them in order.

Required Storage buckets are created by the first migration:

- `avatars`
- `evidence`
- `library`

## Environment Safety

Do not commit `.env`. The repository includes `.env.example` only.

Ignored local/generated files include:

- `node_modules/`
- `dist/`
- `.env`
- `.env.local`
- `*.tsbuildinfo`

## GitHub Upload

Recommended remote:

```bash
git remote add origin https://github.com/sebashulla/dualforge.git
git branch -M main
git push -u origin main
```

