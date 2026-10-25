# Huntfolio

A personal job-search tracker. Organize applications, move them through a
pipeline, keep interviews and follow-ups on schedule, and see how your search
is converting — with optional automatic updates from Gmail.

Built with **Next.js (App Router) + TypeScript** and **Supabase** (Postgres,
Auth, Storage, Row Level Security). Single-user by design, but built clean
enough to deploy publicly.

## Features

The app is organized into five areas.

### Today

The home page: **To do** (overdue and due in the next few days), **Follow up**
(applications going quiet), **Upcoming interviews**, three headline stats, and
**From your inbox** — a log of what Gmail sync changed, with links.

### Applications

- **Board** — Kanban across `Saved → Applied → Screening → Interview → Offer →
  No response → Closed`. Drag to change status (closing asks for a reason).
  Applications still in Applied with no activity for 60 days move to
  **No response** on their own; drag one back if you hear from them.
- **Multi-select** — the Select button (or Ctrl/⌘-click) lets you drag or move
  several cards at once, or pick a whole column.
- Search, filter by track, and Closed hidden until you want it. Compact cards
  show one signal: an upcoming interview, the next task due, "Viewed 3d ago",
  or days since applied.
- **Table** — the same applications, sortable and filterable.
- **Detail** — change status inline; tabs for Overview (tasks + details),
  Interviews & prep, Docs & contacts, and History (status timeline plus the
  emails matched to it). **AI resume tailoring** *(optional)* sends the job
  description and a resume to a model via OpenRouter, server-side, and saves
  the suggestions to prep notes.
- A short add form: company, role, link, status and track, with the rest under
  "More details".

### Schedule

- **Calendar** — month grid and agenda of interviews and dated tasks.
- **Tasks** — grouped by due date (optionally with a time), standalone or
  linked to an application; completed tasks fold away.

### Library

- **Documents** — versioned resumes, cover letters and portfolios in a private
  Storage bucket, with inline PDF preview and signed-URL downloads.
- **Interview prep** — company research, a reusable question bank, and STAR
  stories.
- **Contacts** — recruiters and referrers, searchable and groupable by company.

### Insights

Headline rates — **Viewed** (an employer opened it), **Heard back** (any
reply, rejections included), response, interview and offer — plus a funnel
with stage-to-stage conversion, traction by track, response rate by source,
average time in stage, and applications over time. Filter by track and date
range.

### Gmail sync *(optional)*

A small Google Apps Script in your own Google account checks for job emails
every hour: application confirmations (including JobStreet and LinkedIn),
"viewed your application" notices, employer messages, interview invites,
rejections and offers. Keyword rules — no AI — turn them into new
applications, forward-only status changes, interviews, and the Viewed / Heard
back numbers. Only matching emails are sent, and only the sender, subject,
date and a short snippet are kept. See [Connecting Gmail](#connecting-gmail-optional).

### Also

Email + password sign-in (an email link or one-time code covers the first
sign-in and forgotten passwords), Row Level Security on every table, dark
mode, a bottom tab bar on phones, friendly error and loading screens, and a
daily keep-alive so a free Supabase project never pauses.

## Tech stack

| Concern         | Choice                                                |
| --------------- | ----------------------------------------------------- |
| Framework       | Next.js 16 (App Router, Server Actions), React 19, TypeScript |
| Backend         | Supabase — Postgres, Auth, Storage, RLS               |
| UI              | Tailwind CSS v4, shadcn/ui (Radix)                    |
| Drag & drop     | dnd-kit                                               |
| Forms           | react-hook-form + zod                                 |
| Charts          | Recharts                                              |
| Gmail sync      | Google Apps Script → `/api/inbox` route handler       |
| AI              | OpenRouter (free models), server-side                 |
| File parsing    | pdf-parse, mammoth (resume text for AI tailoring)     |
| Deploy          | Vercel (deploys from GitHub, daily cron)              |

## Getting started

### 1. Configure environment

Create a Supabase project, then copy `.env.example` to `.env.local` and fill in
the Project URL and anon key (Supabase → **Project Settings → API**):

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

See `.env.example` for the optional variables (`OPENROUTER_API_KEY`,
`APP_TIMEZONE`, `CRON_SECRET`). Without Supabase values the app runs in
**demo mode** on sample data.

### 2. Set up the database

In the Supabase **SQL Editor**, run the migrations in order:

1. `supabase/migrations/0001_init.sql` — tables, RLS policies, and triggers.
2. `supabase/migrations/0002_storage.sql` — the private `documents` bucket and
   its access policies.
3. `supabase/migrations/0003_inbox.sql` — tables for Gmail sync (optional; the
   rest of the app works without it).
4. `supabase/migrations/0004_inbox_reprocess.sql` — lets improved Gmail rules
   re-read emails they misread before.

### 3. Enable auth

- **Authentication → Providers:** make sure **Email** is enabled.
- **Authentication → URL Configuration:** set the **Site URL** to
  `http://localhost:3000` and add `http://localhost:3000/auth/callback` as a
  redirect URL.
- *Optional:* to also allow sign-in with a one-time code (handy when you open
  the email on another device), add the code to **Email Templates → Magic
  Link**, e.g. `<p>Or enter this code: {{ .Token }}</p>`.
- *Recommended:* once your account exists, turn off **Allow new users to sign
  up** under Providers → Email, so nobody else can create an account.

### 4. Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The first time, choose
**Email me a link** and sign in from your inbox; then open the account menu →
**Set password** so future sign-ins are just email + password.

> **Optional:** run `supabase/seed.sql` (after signing in once) to load sample
> data.

## Deploying to Vercel

1. Push to GitHub and import the repo into [Vercel](https://vercel.com). Every
   push to `main` then deploys automatically.
2. Add the environment variables from `.env.local` in the Vercel project
   settings. `NEXT_PUBLIC_*` values are baked in at build time, so **redeploy**
   after changing them. Optionally set `APP_TIMEZONE` (defaults to
   `Asia/Manila`; Vercel runs in UTC) and `CRON_SECRET`.
3. In Supabase → **Authentication → URL Configuration**, set the Site URL to
   your Vercel domain and add `https://your-app.vercel.app/auth/callback` as a
   redirect URL. Without this, email links send you to localhost.

`vercel.json` schedules a daily call to `/api/health`, which runs one tiny
query so a free-tier Supabase project isn't paused for inactivity. Open
`/api/health` yourself to check the backend is reachable (it needs the
`CRON_SECRET` bearer token if you set one).

## Connecting Gmail *(optional)*

Requires migrations 0003 and 0004, and a deployed site (Google can't reach
localhost).

1. On **Today**, find **From your inbox** → **Connect Gmail** → **Create key
   and script** → **Copy**.
2. Open [script.google.com](https://script.google.com) in the Google account
   whose Gmail you want synced (it can differ from your Huntfolio login) and
   create a new project. Replace the sample code with the script and save.
3. Pick **setup** in the toolbar and click **Run**. When Google warns that the
   app isn't verified — it says that for any script you write yourself —
   choose **Advanced → Go to project (unsafe) → Allow**.

The first run looks back 90 days; after that it checks every hour. The script
reads its search terms from `/api/inbox` on each run, so rule improvements
reach it without re-pasting. The key inside the script is private — to rotate
it, use **Settings → Create a new key** and paste the new script; to stop
syncing, use **Disconnect** or delete the Apps Script project.

## Troubleshooting

- **The live site loads but sign-in fails with "Can't reach the sign-in
  service"** — the Supabase project is probably paused (free projects pause
  after a week without use). Restore it from the Supabase dashboard.
- **An email link lands on "That sign-in link didn't work"** — it was used
  already, expired, or opened in a different browser. Request a new one, use
  the code from the email, or sign in with your password.
- **Pages show "Couldn't load this page"** — the database returned an error;
  the reference code matches the entry in the Vercel function logs.
- **Gmail sync errors** — open the Apps Script project → **Executions**. A
  401 "Unknown key" means the key was replaced or disconnected: create a new
  key and paste the new script.

## Project structure

```
app/
  (app)/        signed-in pages: Today (/), applications (board, table,
                detail), calendar, tasks, documents, prep, contacts, analytics
  (auth)/login  sign-in
  api/health    keep-alive / backend check (daily cron)
  api/inbox     receives emails from the Gmail script; serves its settings
  icon.svg, apple-icon.tsx   browser-tab and home-screen icons
components/     UI (board, forms, charts, inbox, shadcn primitives, logo, …)
lib/
  supabase/     browser + server clients, session middleware
  actions/      server actions (mutations)
  queries.ts    reads for server components, plus the automations that run
                before them (Gmail emails, the no-response rule)
  inbox/        Gmail sync: keyword rules, applying emails, the Apps Script
  navigation.ts the five areas and their section tabs
  analytics.ts, reminders.ts   pure domain logic
supabase/       SQL migrations + seed
instrumentation.ts   sets the server timezone
vercel.json          daily keep-alive cron
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
