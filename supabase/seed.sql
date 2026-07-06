-- Huntfolio sample data.
--
-- Run this AFTER you've signed in at least once (so a user exists) and AFTER
-- 0001_init.sql. Every row is assigned to the first user in auth.users, so on a
-- personal single-user project it "just works" with no editing. Delete these
-- rows once you've added your own applications.
--
-- Applications are inserted as "saved" and then walked forward through their
-- statuses, so the status_history trigger records a realistic timeline for each.

begin;

-- Baseline: eight applications, all starting at "saved".
insert into applications
  (id, user_id, company, role_title, job_url, source, location, work_mode,
   salary_min, salary_max, salary_currency, track, priority, notes, date_saved)
values
  ('00000000-0000-0000-0000-0000000000a1',
   (select id from auth.users order by created_at limit 1),
   'Kumu', 'Frontend Engineer', 'https://example.com/jobs/kumu-fe',
   'LinkedIn', 'Makati City', 'Remote',
   70000, 95000, 'PHP', 'dev', 'high',
   'Referred by a former colleague. React + TypeScript stack.',
   now() - interval '2 days'),

  ('00000000-0000-0000-0000-0000000000a2',
   (select id from auth.users order by created_at limit 1),
   'Thinking Machines', 'Machine Learning Engineer', 'https://example.com/jobs/tm-mle',
   'Company site', 'BGC, Taguig', 'Hybrid',
   90000, 130000, 'PHP', 'ai', 'high',
   'Dream role. Need to brush up on MLOps before applying.',
   now() - interval '1 day'),

  ('00000000-0000-0000-0000-0000000000a3',
   (select id from auth.users order by created_at limit 1),
   'Sprout Solutions', 'QA Engineer', 'https://example.com/jobs/sprout-qa',
   'JobStreet', 'Pasig City', 'Onsite',
   45000, 60000, 'PHP', 'qa', 'medium',
   'Applied through JobStreet. Waiting to hear back.',
   now() - interval '6 days'),

  ('00000000-0000-0000-0000-0000000000a4',
   (select id from auth.users order by created_at limit 1),
   'UnionBank', 'Data Analyst', 'https://example.com/jobs/ub-da',
   'LinkedIn', 'Ortigas, Pasig', 'Hybrid',
   55000, 75000, 'PHP', 'data', 'medium',
   'SQL-heavy role. They asked for a take-home.',
   now() - interval '3 days'),

  ('00000000-0000-0000-0000-0000000000a5',
   (select id from auth.users order by created_at limit 1),
   'PayMongo', 'Backend Developer', 'https://example.com/jobs/pm-be',
   'Referral', 'Remote', 'Remote',
   80000, 110000, 'PHP', 'dev', 'high',
   'Recruiter reached out. Go + Postgres.',
   now() - interval '9 days'),

  ('00000000-0000-0000-0000-0000000000a6',
   (select id from auth.users order by created_at limit 1),
   'Kroll', 'QA Automation Engineer', 'https://example.com/jobs/kroll-qa',
   'JobStreet', 'Manila', 'Hybrid',
   60000, 85000, 'PHP', 'qa', 'high',
   'Cypress + Playwright. Second interview scheduled.',
   now() - interval '15 days'),

  ('00000000-0000-0000-0000-0000000000a7',
   (select id from auth.users order by created_at limit 1),
   'Globe Telecom', 'Data Engineer', 'https://example.com/jobs/globe-de',
   'Company site', 'BGC, Taguig', 'Hybrid',
   95000, 120000, 'PHP', 'data', 'high',
   'Verbal offer received — reviewing the package.',
   now() - interval '25 days'),

  ('00000000-0000-0000-0000-0000000000a8',
   (select id from auth.users order by created_at limit 1),
   'Cognizant', 'AI Engineer', 'https://example.com/jobs/cts-ai',
   'LinkedIn', 'Cebu City', 'Onsite',
   65000, 90000, 'PHP', 'ai', 'low',
   'Did not move past the first screen. Not a great fit.',
   now() - interval '20 days');

-- Walk each application forward so status_history builds a real timeline.
-- (a1, a2 stay at "saved".)

-- a3: saved -> applied
update applications set status = 'applied', date_applied = now() - interval '5 days'
  where id = '00000000-0000-0000-0000-0000000000a3';

-- a4: saved -> applied
update applications set status = 'applied', date_applied = now() - interval '3 days'
  where id = '00000000-0000-0000-0000-0000000000a4';

-- a5: saved -> applied -> screening
update applications set status = 'applied', date_applied = now() - interval '8 days'
  where id = '00000000-0000-0000-0000-0000000000a5';
update applications set status = 'screening'
  where id = '00000000-0000-0000-0000-0000000000a5';

-- a6: saved -> applied -> screening -> interview
update applications set status = 'applied', date_applied = now() - interval '14 days'
  where id = '00000000-0000-0000-0000-0000000000a6';
update applications set status = 'screening'
  where id = '00000000-0000-0000-0000-0000000000a6';
update applications set status = 'interview'
  where id = '00000000-0000-0000-0000-0000000000a6';

-- a7: saved -> applied -> screening -> interview -> offer
update applications set status = 'applied', date_applied = now() - interval '24 days'
  where id = '00000000-0000-0000-0000-0000000000a7';
update applications set status = 'screening'
  where id = '00000000-0000-0000-0000-0000000000a7';
update applications set status = 'interview'
  where id = '00000000-0000-0000-0000-0000000000a7';
update applications set status = 'offer'
  where id = '00000000-0000-0000-0000-0000000000a7';

-- a8: saved -> applied -> closed (rejected)
update applications set status = 'applied', date_applied = now() - interval '18 days'
  where id = '00000000-0000-0000-0000-0000000000a8';
update applications set status = 'closed', close_reason = 'rejected'
  where id = '00000000-0000-0000-0000-0000000000a8';

-- Tasks: a mix of application-linked and standalone, across due-date buckets.
insert into tasks
  (user_id, application_id, title, description, due_date, status, priority)
values
  ((select id from auth.users order by created_at limit 1),
   '00000000-0000-0000-0000-0000000000a4',
   'Finish UnionBank take-home', 'SQL assessment — due end of week.',
   now() + interval '2 days', 'todo', 'high'),

  ((select id from auth.users order by created_at limit 1),
   '00000000-0000-0000-0000-0000000000a6',
   'Prep for Kroll 2nd interview', 'Review Playwright fixtures and CI setup.',
   now() + interval '1 day', 'todo', 'high'),

  ((select id from auth.users order by created_at limit 1),
   '00000000-0000-0000-0000-0000000000a3',
   'Follow up with Sprout recruiter', 'It has been a few days since applying.',
   now() - interval '1 day', 'todo', 'medium'),

  ((select id from auth.users order by created_at limit 1),
   '00000000-0000-0000-0000-0000000000a7',
   'Respond to Globe offer', 'Ask about signing bonus and start date.',
   now(), 'todo', 'high'),

  ((select id from auth.users order by created_at limit 1),
   '00000000-0000-0000-0000-0000000000a2',
   'Complete an MLOps course module', 'Two chapters before applying to TM.',
   now() + interval '10 days', 'todo', 'medium'),

  ((select id from auth.users order by created_at limit 1),
   null,
   'Update resume with latest project', 'Add the analytics dashboard work.',
   null, 'todo', 'medium'),

  ((select id from auth.users order by created_at limit 1),
   null,
   'Refresh LinkedIn headline', 'Done — kept for reference.',
   now() - interval '3 days', 'done', 'low');

commit;
