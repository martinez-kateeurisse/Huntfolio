-- Interview rounds: label each interview Initial / 2nd / 3rd … so several
-- rounds can sit under the board's Interview column, with Final interview as
-- its own column (status 'final_interview' — status is free text, so no
-- constraint change is needed for it).

alter table interviews add column if not exists round smallint;

-- Number existing interviews per application in date order (unscheduled last).
update interviews i
set round = r.n
from (
  select id,
         row_number() over (
           partition by application_id
           order by scheduled_at nulls last, created_at
         ) as n
  from interviews
) r
where i.id = r.id
  and i.round is null;
