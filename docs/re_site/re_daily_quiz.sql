-- RE Pop Quiz data (2026-10-24). For Jay to run in the Supabase SQL editor; /re/popquiz.html calls get_daily_quiz_re().
-- Separate table so the EA get_daily_quiz() and the EA daily-quiz e-mail stay untouched.
-- The RE bank is still inactive (pre-launch), so the function does NOT require questions.is_active;
-- it serves exactly the one question an admin puts in daily_quiz_re.

create table if not exists public.daily_quiz_re (
  id          bigserial primary key,
  question_id text        not null,
  active_from date        not null default current_date,
  is_active   boolean     not null default true,
  note        text,
  created_at  timestamptz not null default now()
);
alter table public.daily_quiz_re enable row level security;   -- no policies: readable only through the function below

create or replace function public.get_daily_quiz_re()
returns setof jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
           'question_id', q.question_id, 'part', q.part, 'topic', q.topic, 'text', q.text,
           'options', q.options, 'correct', q.correct,
           'explanation', q.explanation, 'explanation_en', q.explanation_en,
           'examtip', q.examtip, 'examtip_en', q.examtip_en)
  from public.daily_quiz_re d
  join public.questions q on q.question_id = d.question_id
  where d.is_active and d.active_from <= current_date and q.exam like 're-%'
  order by d.active_from desc, d.id desc
  limit 1;
$$;
revoke all on function public.get_daily_quiz_re() from public;
grant execute on function public.get_daily_quiz_re() to anon, authenticated;

-- First question (pick one; national items suit every state):
-- insert into public.daily_quiz_re (question_id, note) values ('RE-N-xxxx', 'first RE pop quiz');
