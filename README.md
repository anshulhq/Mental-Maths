# Mental Maths

A fast, keyboard-first mental maths trainer for SSC CGL prep. Squares, cubes, tables and fraction→% drills with full/quick/**trouble** modes, per-item mastery tracking, a GitHub-style activity heatmap, streaks and detailed stats.

## Features

- **Test categories** — Squares 1–25 / 1–100 / 1–300 + their reverse (given n², name n), Squares ending in 5 (up to 125²), Squares 101–1000 (random 10/20/30), Square roots 2-digit & 1–300, Cube roots 1–300 (random), 50 − n, 100 − n, Borrow subtraction (16−9 style, every units-digit pair), Carry addition (16+9 style, every units-digit pair), Addition facts 1–9 (all 81 single-digit pairs), Cubes 1–15, Tables 2–25 ×10 (each table up to ×10, big-first like 25 × 10), Fractions → % (add your own in `src/lib/categories.ts`)
- **Full test** — every item, jumbled
- **Quick test** — 20 random items
- **Trouble drill** — automatically drills the items you keep getting wrong (accuracy < 80%)
- Instant feedback, per-question timing, end-of-test report with misses and slowest answers
- GitHub-style practice heatmap, streaks, mastery bars, weakest-items view
- Simple username/password auth, one account (or more) — data lives in Postgres
- Dark mode (toggle in the header, remembers your choice, follows system by default)

## Local development

```bash
npm install
npm run dev
```

With no `DATABASE_URL` set, the app runs on an **embedded Postgres (PGlite)** stored in `.pglite/` — zero setup. Schema is created automatically on first run.

Open http://localhost:3000 and create an account.

## Deploy for free (Vercel + Neon) — step by step

### 0. Prerequisites (all free)
- GitHub account — https://github.com
- Vercel account — https://vercel.com (sign in with GitHub)
- Neon account — https://neon.tech (sign in with GitHub)

### 1. Push the code to GitHub
```bash
git add -A
git commit -m "Mental maths trainer"
```
Create an empty repo on github.com (no README/license), then:
```bash
git remote add origin https://github.com/<your-username>/mental-maths.git
git branch -M main
git push -u origin main
```

### 2. Create the database (Neon)
1. Neon dashboard → **Create project** → pick a name (e.g. `mental-maths`) and a region close to you (e.g. Mumbai / Singapore).
2. On the project page, copy the **Connection string** — it looks like
   `postgresql://user:password@ep-xxxx-pooler-region.aws.neon.tech/neondb?sslmode=require`
3. Keep it private — it's the master key to your data.

### 3. Generate a session secret
On your Mac terminal:
```bash
openssl rand -base64 32
```
Copy the output.

### 4. Create the tables (one time)
From the project folder (this runs the schema push against Neon):
```bash
DATABASE_URL="<paste-your-neon-connection-string>" npm run db:push
```
It should print the tables it created. (Needs `npm install` done once locally.)

### 5. Deploy (Vercel)
1. vercel.com → **Add New… → Project** → import your `mental-maths` repo.
2. Framework preset: **Next.js** (auto-detected). Leave build settings default.
3. Open **Environment Variables** and add BOTH (for all environments):
   - `DATABASE_URL` = your Neon connection string
   - `AUTH_SECRET` = the output of the openssl command from step 3
4. Click **Deploy** and wait ~1 minute.

### 6. Use it
Open the URL Vercel gives you (e.g. `mental-maths.vercel.app`), click **Create account**, and practice. Bookmark it on your phone too — the app is mobile friendly.

### Everyday workflow after this
- Practice: just open your Vercel URL. Nothing else to do.
- Code changes: `git add -A && git commit -m "..." && git push` → Vercel redeploys automatically.
- Local dev (`npm run dev` without `DATABASE_URL`) uses a separate embedded database in `.pglite/` — your production data is untouched. To point local dev at the real data, put `DATABASE_URL` and `AUTH_SECRET` in `.env.local`.

### Notes
- **Cost**: ₹0 — Vercel Hobby and Neon Free are enough for personal use (Neon gives 0.5 GB storage; this app needs a few MB even after years).
- **Neon autosuspend**: the free database sleeps after inactivity — the first request after a long pause can take ~1 second to wake it. Everything after is instant.
- **Schema changes**: if you ever edit `src/db/schema.ts`, run the step-4 command again.

## Adding a new test category

Add an entry to the `categories` array in `src/lib/categories.ts`:

```ts
const squareRoots: CategoryDef = {
  id: 'square-roots',
  name: 'Square roots',
  tagline: '√n for perfect squares up to 900',
  items: range(1, 30).map((n) => String(Number(n) ** 2)),
  label: (item) => `√${item}`,
  question: (item) => `√${item}`,
  answer: (item) => Math.sqrt(Number(item)),
  tolerance: 0,
}
```

Everything else (quiz, trouble tracking, heatmap, stats) picks it up automatically.

## Tech

Next.js 16 (App Router) · Tailwind CSS 4 · Drizzle ORM · Neon Postgres (embedded PGlite for local dev) · bcrypt + JWT cookie auth
