-- War Room trial: 10 different sheets a day instead of 5 (boss 2026-11-08). EA and RE both.
-- Reads every LIVE function that uses war_room_daily, changes only the «5» limit checks to «10», and re-creates it.
-- Patterns changed:  ") < 5)"  ·  "v_n >= 5 then"  ·  "used < 5 or"
-- If no function has any of them, it stops and changes nothing.

do $$
declare
  r record;
  d text;
  nd text;
  total int := 0;
begin
  for r in
    select p.oid, p.proname
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and (case when p.prokind = 'f' then pg_get_functiondef(p.oid) end) like '%war_room_daily%'
  loop
    d := pg_get_functiondef(r.oid);
    nd := regexp_replace(d,  '\)\s*<\s*5\s*\)',      ') < 10)',        'g');
    nd := regexp_replace(nd, 'v_n\s*>=\s*5\s+then',   'v_n >= 10 then', 'g');
    nd := regexp_replace(nd, 'used\s*<\s*5\s+or',     'used < 10 or',   'g');
    if nd <> d then
      execute nd;
      total := total + 1;
      raise notice 'updated %', r.proname;
    end if;
  end loop;
  if total = 0 then
    raise exception 'No War Room limit of 5 found. Nothing changed.';
  end if;
end $$;

-- Check: every War Room function and the limits it now has (should show 10, no 5)
select p.proname,
       array_to_string(array(select m[1] from regexp_matches(pg_get_functiondef(p.oid),
         '(\)\s*<\s*\d+\s*\)|v_n\s*>=\s*\d+\s+then|used\s*<\s*\d+\s+or)', 'g') m), ' | ') as limits
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and (case when p.prokind = 'f' then pg_get_functiondef(p.oid) end) like '%war_room_daily%'
order by 1;
