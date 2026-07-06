# Huntfolio

A personal job-search tracker. Organize applications, move them through a
pipeline, track follow-ups and interviews, and see your momentum at a glance.

Built with **Next.js (App Router) + TypeScript** and **Supabase** (Postgres,
Auth, Storage, Row Level Security). Single-user by design, but built clean
enough to deploy publicly.

## Features

- **Pipeline board** — Kanban across `Saved → Applied → Screening → Interview →
  Offer → Closed`, with drag-and-drop that persists status (and prompts for a
  reason when you close an application). Cards surface a contextual signal —
  days since applied, next task due, or an upcoming interview.
- **Table view** — the same applications, sortable and filterable by track,
  status, and source.
- **Application detail** — every field plus inline tasks, interviews, attached
  document versions, contacts, prep notes, and an auto-logged status-history
  timeline.
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
  resumes to Claude (server-side) and returns tailoring guidance, saved to your
  prep notes.
- Magic-link auth with Row Level Security, role-track tags, dark mode, and a
  responsive layout.

## Tech stack

| Concern     | Choice                                        |
| ----------- | --------------------------------------------- |
| Framework   | Next.js (App Router), React, TypeScript       |
| Backend     | Supabase — Postgres, Auth, Storage, RLS       |
| UI          | Tailwind CSS, shadcn/ui                       |
| Drag & drop | dnd-kit                                       |
| Forms       | react-hook-form + zod                         |
| Charts      | Recharts                                      |
| AI          | Anthropic (Claude), server-side               |
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

### 4. Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with the
magic link sent to your email.

> **Optional:** run `supabase/seed.sql` (after signing in once) to load sample
> data, and add `ANTHROPIC_API_KEY` to `.env.local` to enable AI resume
> tailoring. See `.env.example` for all variables.

## Deploying to Vercel

1. Push to GitHub and import the repo into [Vercel](https://vercel.com).
2. Add the environment variables from `.env.local` in the Vercel project
   settings.
3. In Supabase → **Authentication → URL Configuration**, set the Site URL to
   your Vercel domain and add `https://your-app.vercel.app/auth/callback` as a
   redirect URL.

## Project structure

```
app/          routes: login, board, table, calendar, tasks, analytics,
              prep, contacts, documents, application detail
components/    UI (board, forms, charts, shadcn primitives, …)
lib/
  supabase/   browser + server clients, session middleware
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
