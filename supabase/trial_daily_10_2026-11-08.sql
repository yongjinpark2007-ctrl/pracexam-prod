-- Free trial: 10 questions a day instead of 5 (boss 2026-11-08). EA and RE both.
-- The limit lives in check_answer (two places: RE daily_usage and EA profiles.daily_used).
-- This reads the LIVE function, changes only «>= 5 then» to «>= 10 then», and re-creates it.
-- If the live function does not have exactly those two checks, it stops and changes nothing.

do $$
declare
  d text;
  n int;
begin
  select pg_get_functiondef('public.check_answer(text,integer)'::regprocedure) into d;
  n := array_length(regexp_split_to_array(d, '>=\s*5\s+then'), 1) - 1;
  if n <> 2 then
    raise exception 'Expected 2 daily-limit checks (>= 5 then) in check_answer, found %. Nothing changed.', n;
  end if;
  execute regexp_replace(d, '>=\s*5\s+then', '>= 10 then', 'g');
end $$;

-- Check: should show 2 rows with «>= 10 then»
select m[1] as limit_check
from regexp_matches(pg_get_functiondef('public.check_answer(text,integer)'::regprocedure), '(>=\s*\d+\s+then)', 'g') as m;
