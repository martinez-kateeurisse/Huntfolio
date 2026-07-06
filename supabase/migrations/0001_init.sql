-- Huntfolio — initial schema.
-- Creates every table for all planned phases. Phase 1 only reads/writes
-- applications, tasks, and status_history, but the rest exist so we never have
-- to run a destructive migration later. RLS is ON for every table and scoped
-- to auth.uid() = user_id.

create extension if not exists "pgcrypto";

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- APPLICATIONS ------------------------------------------------------
create table applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company text not null,
  role_title text not null,
  job_url text,
  source text,                       -- JobStreet | LinkedIn | Referral | Company site | Other
  location text,
  work_mode text,                    -- Onsite | Hybrid | Remote
  salary_min integer,
  salary_max integer,
  salary_currency text default 'PHP',
  status text not null default 'saved',   -- saved|applied|screening|interview|offer|closed
  close_reason text,                 -- rejected|accepted|withdrawn (only when closed)
  track text,                        -- qa|dev|data|ai
  priority text default 'medium',    -- low|medium|high
  date_saved timestamptz default now(),
  date_applied timestamptz,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index on applications(user_id);
create trigger applications_updated before update on applications
  for each row execute function set_updated_at();

-- STATUS HISTORY (auto-logged) --------------------------------------
create table status_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  application_id uuid not null references applications(id) on delete cascade,
  from_status text,
  to_status text not null,
  changed_at timestamptz default now()
);
create index on status_history(application_id);

create or replace function log_status_change()
returns trigger language plpgsql as $$
begin
  if (tg_op = 'INSERT') then
    insert into status_history(user_id, application_id, from_status, to_status)
    values (new.user_id, new.id, null, new.status);
  elsif (new.status is distinct from old.status) then
    insert into status_history(user_id, application_id, from_status, to_status)
    values (new.user_id, new.id, old.status, new.status);
  end if;
  return new;
end $$;
create trigger applications_status_log
  after insert or update of status on applications
  for each row execute function log_status_change();

-- TASKS -------------------------------------------------------------
create table tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  application_id uuid references applications(id) on delete cascade,  -- nullable = standalone
  title text not null,
  description text,
  due_date timestamptz,
  status text default 'todo',        -- todo|done
  priority text default 'medium',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index on tasks(user_id);
create trigger tasks_updated before update on tasks
  for each row execute function set_updated_at();

-- INTERVIEWS (Phase 2 UI) -------------------------------------------
create table interviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  application_id uuid not null references applications(id) on delete cascade,
  type text,                         -- phone|technical|hr|final|other
  scheduled_at timestamptz,
  location text,                     -- room or video link
  notes text,
  outcome text default 'pending',    -- pending|passed|failed
  created_at timestamptz default now()
);
create index on interviews(user_id);

-- DOCUMENTS (Phase 2 UI) --------------------------------------------
create table documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text,                         -- resume|cover_letter|portfolio|other
  version_label text,
  file_url text,                     -- Supabase storage path
  is_default boolean default false,
  created_at timestamptz default now()
);
create index on documents(user_id);

create table application_documents (
  application_id uuid not null references applications(id) on delete cascade,
  document_id uuid not null references documents(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  primary key (application_id, document_id)
);

-- PREP NOTES (Phase 3 UI) -------------------------------------------
create table prep_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  application_id uuid references applications(id) on delete cascade,  -- nullable
  category text,                     -- research|questions|star
  title text,
  content text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index on prep_notes(user_id);
create trigger prep_notes_updated before update on prep_notes
  for each row execute function set_updated_at();

-- CONTACTS (Phase 4 UI) ---------------------------------------------
create table contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  application_id uuid references applications(id) on delete set null,
  name text not null,
  role text,
  company text,
  email text,
  linkedin text,
  notes text,
  created_at timestamptz default now()
);
create index on contacts(user_id);

-- ROW LEVEL SECURITY ------------------------------------------------
-- Every table: enable RLS and allow a user to touch only their own rows.

alter table applications enable row level security;
create policy "own_rows" on applications for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table status_history enable row level security;
create policy "own_rows" on status_history for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table tasks enable row level security;
create policy "own_rows" on tasks for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table interviews enable row level security;
create policy "own_rows" on interviews for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table documents enable row level security;
create policy "own_rows" on documents for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table application_documents enable row level security;
create policy "own_rows" on application_documents for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table prep_notes enable row level security;
create policy "own_rows" on prep_notes for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table contacts enable row level security;
create policy "own_rows" on contacts for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
