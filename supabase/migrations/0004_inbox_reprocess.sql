-- Gmail sync, round 2: let improved rules fix emails they misread before.
--
-- Same as inbox_ingest in 0003, except that when an email arrives again
-- (the script re-scans after rule updates), it's re-queued if it couldn't be
-- placed before or if the new rules read it differently. Emails that were
-- handled and still read the same are left alone, so nothing is applied twice.

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
  on conflict (user_id, message_id) do update set
    kind = excluded.kind,
    company = excluded.company,
    role_title = excluded.role_title,
    interview_at = excluded.interview_at,
    interview_type = excluded.interview_type,
    snippet = excluded.snippet,
    status = 'pending',
    result = null
  where (inbox_events.status = 'skipped' and inbox_events.application_id is null)
     or inbox_events.kind is distinct from excluded.kind
     or inbox_events.company is distinct from excluded.company;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function inbox_ingest(text, jsonb) from public;
grant execute on function inbox_ingest(text, jsonb) to anon, authenticated;
