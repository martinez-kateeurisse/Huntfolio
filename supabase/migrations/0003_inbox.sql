-- Gmail → Huntfolio. A small Google Apps Script in the user's own account finds
-- job-related emails and posts them to /api/inbox, which classifies them and
-- stores the results here. The app then applies them (new application, status
-- change, interview) the next time the user opens it, under their own session
-- and RLS — so no service-role key is ever needed.

-- One connection per user: the hash of the secret the script sends.
create table inbox_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz default now(),
  last_seen_at timestamptz               -- last time the script checked in
);

-- One row per job-related email. Only what's needed to act on it is kept:
-- sender, subject, date, a short snippet, and what the rules made of it.
create table inbox_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  message_id text not null,              -- Gmail message id (dedupe key)
  received_at timestamptz not null,
  from_name text,
  from_email text,
  subject text,
  snippet text,
  kind text not null,                    -- applied|screening|interview|offer|rejection
  company text,
  role_title text,
  interview_at timestamptz,
  interview_type text,                   -- phone|technical|hr|final|other
  status text not null default 'pending',-- pending|done|skipped
  application_id uuid references applications(id) on delete set null,
  result text,                           -- what the app changed, in words
  created_at timestamptz default now(),
  unique (user_id, message_id)
);
create index on inbox_events(user_id, status);

alter table inbox_connections enable row level security;
create policy "own_rows" on inbox_connections for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table inbox_events enable row level security;
create policy "own_rows" on inbox_events for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- The script has no user session, so its uploads go through this function:
-- it checks the secret, then stores the events for that secret's owner only.
-- Duplicates (the script re-sends a small overlap each run) are ignored.
create or replace function inbox_ingest(p_token text, p_events jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
  v_count integer;
begin
  select user_id into v_user
  from inbox_connections
  where token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex');

  if v_user is null then
    raise exception 'invalid inbox token' using errcode = '28000';
  end if;

  update inbox_connections set last_seen_at = now() where user_id = v_user;

  insert into inbox_events (
    user_id, message_id, received_at, from_name, from_email, subject,
    snippet, kind, company, role_title, interview_at, interview_type
  )
  select
    v_user,
    e->>'message_id',
    (e->>'received_at')::timestamptz,
    e->>'from_name',
    e->>'from_email',
    left(e->>'subject', 500),
    left(e->>'snippet', 300),
    e->>'kind',
    left(e->>'company', 200),
    left(e->>'role_title', 200),
    nullif(e->>'interview_at', '')::timestamptz,
    e->>'interview_type'
  from jsonb_array_elements(coalesce(p_events, '[]'::jsonb)) as e
  on conflict (user_id, message_id) do nothing;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function inbox_ingest(text, jsonb) from public;
grant execute on function inbox_ingest(text, jsonb) to anon, authenticated;
