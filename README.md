# Huntfolio

A personal job-search tracker. Organize applications, move them through a
pipeline, track follow-ups and interviews, and see your momentum at a glance.

Built with **Next.js (App Router) + TypeScript** and **Supabase** (Postgres,
Auth, Storage, Row Level Security). Single-user by design, but built clean
enough to deploy publicly.

## Features

The app is organized into five areas: **Today**, **Applications**,
**Schedule**, **Library**, and **Insights**.

- **Today** — the home page: tasks due in the next few days, people to follow
  up with, upcoming interviews, and three headline stats.
- **Pipeline board** — Kanban across `Saved → Applied → Screening → Interview →
  Offer → No response → Closed`, with drag-and-drop that persists status (and
  prompts for a reason when you close an application). Applications still in
  Applied with no activity for 60 days move to **No response** on their own.
  Select several cards (Select button, or Ctrl/⌘-click) to drag or move them
  together. Search, filter by track, and keep
  Closed applications out of the way until you want them. Cards surface a
  contextual signal — days since applied, next task due, or an upcoming
  interview.
- **Table view** — the same applications, sortable and filterable by track,
  status, and source.
- **Application detail** — change status inline, then four tabs: Overview
  (tasks + details), Interviews & prep, Docs & contacts, and an auto-logged
  status History.
- **Tasks & reminders** — to-dos grouped by due date, and a computed
  "Needs attention" panel (follow-ups, stale applications, interviews soon,
  overdue tasks) with one-click actions.
- **Calendar** — a month grid and agenda of interviews and dated tasks.
- **Documents** — versioned resumes / cover letters / portfolios in a private
  Storage bucket, with signed-URL downloads.
- **Contacts** — recruiters and referrers, searchable and groupable by company.
- **Interview prep** — research notes, a reusable question bank, and STAR stories.
- **Analytics** — a funnel with stage-to-stage conversion, traction by track,
  response rate by source, average time-in-stage, and applications over time.
- **AI resume tailoring** *(optional)* — sends a job description and one of your
  resumes to a model via OpenRouter (server-side) and returns tailoring
  guidance, saved to your prep notes.
- Email + password sign-in (with an email link or one-time code as the
  fallback for first sign-in or a forgotten password), Row Level Security,
  role-track tags, dark mode, and a responsive layout with a bottom tab bar on
  phones.

## Tech stack

| Concern     | Choice                                        |
| ----------- | --------------------------------------------- |
| Framework   | Next.js (App Router), React, TypeScript       |
| Backend     | Supabase — Postgres, Auth, Storage, RLS       |
| UI          | Tailwind CSS, shadcn/ui                       |
| Drag & drop | dnd-kit                                       |
| Forms       | react-hook-form + zod                         |
| Charts      | Recharts                                      |
| AI          | OpenRouter (free models), server-side         |
| Deploy      | Vercel                                        |

## Getting started

### 1. Configure environment

Create a Supabase project, then copy `.env.example` to `.env.local` and fill in
the Project URL and anon key (Supabase → **Project Settings → API**):

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 2. Set up the database

In the Supabase **SQL Editor**, run the migrations in order:

1. `supabase/migrations/0001_init.sql` — tables, RLS policies, and triggers.
2. `supabase/migrations/0002_storage.sql` — the private `documents` bucket and
   its access policies.

### 3. Enable auth

In **Authentication → Providers**, ensure **Email** is enabled. In
**Authentication → URL Configuration**, set the **Site URL** to
`http://localhost:3000` and add `http://localhost:3000/auth/callback` as a
redirect URL.

To also allow sign-in with a one-time code (handy when you open the email on a
different device than the one you requested it from), edit
**Authentication → Email Templates → Magic Link** and add the code to the
body, e.g. `<p>Or enter this code: {{ .Token }}</p>`.

### 4. Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The first time, choose
**Email me a link** and sign in from your inbox; then open the account menu →
**Set password** so future sign-ins are just email + password.

> **Optional:** run `supabase/seed.sql` (after signing in once) to load sample
> data, and add `OPENROUTER_API_KEY` to `.env.local` to enable AI resume
> tailoring. See `.env.example` for all variables.

## Deploying to Vercel

1. Push to GitHub and import the repo into [Vercel](https://vercel.com).
2. Add the environment variables from `.env.local` in the Vercel project
   settings. `NEXT_PUBLIC_*` values are baked in at build time, so **redeploy**
   after changing them. Optionally set `APP_TIMEZONE` (defaults to
   `Asia/Manila`) and `CRON_SECRET`.
3. In Supabase → **Authentication → URL Configuration**, set the Site URL to
   your Vercel domain and add `https://your-app.vercel.app/auth/callback` as a
   redirect URL. Without this, magic links send you to localhost.

`vercel.json` schedules a daily call to `/api/health`, which runs one tiny
query so a free-tier Supabase project isn't paused for inactivity. You can open
`/api/health` yourself to check the backend is reachable (it needs the
`CRON_SECRET` bearer token if you set one).

### Troubleshooting

- **The live site loads but sign-in fails with "Can't reach the sign-in
  service"** — the Supabase project is probably paused (free projects pause
  after a week without use). Restore it from the Supabase dashboard.
- **Magic link lands on "That sign-in link didn't work"** — it was used
  already, expired, or opened in a different browser. Request a new one or
  use the code from the email.
- **Pages show "Couldn't load this page"** — the database returned an error;
  the reference code matches the entry in the Vercel function logs.

## Project structure

```
app/          routes: today (/), board, table, application detail,
              calendar, tasks, documents, prep, contacts, analytics,
              login, api/health
components/    UI (board, forms, charts, shadcn primitives, …)
lib/
  supabase/   browser + server clients, session middleware
  navigation.ts  the five areas and their section tabs
  actions/    server actions (mutations)
  queries.ts  read helpers for server components
  analytics.ts, reminders.ts   pure, testable domain logic
supabase/     SQL migrations + seed
```

Reads go through server components and `lib/queries.ts`; mutations go through
server actions. `lib/database.types.ts` mirrors the schema and can be
regenerated with `supabase gen types typescript`.

## Scripts

```bash
npm run dev      # start the dev server
npm run build    # production build
npm run start    # run the production build
npm run lint     # lint
```
