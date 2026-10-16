-- PracExam free Shorts videos table (Phase 1)
-- Run this yourself in Supabase SQL Editor. One row = one topic (EN + KO video IDs together).

create table if not exists public.shorts_videos (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique check (slug ~ '^[a-z0-9-]{3,80}$'),
  ea_part         smallint not null check (ea_part in (1,2,3)),
  topic           text not null,
  title_en        text,
  title_ko        text,
  description_en  text,
  description_ko  text,
  youtube_id_en   text check (youtube_id_en is null or char_length(youtube_id_en) = 11),
  youtube_id_ko   text check (youtube_id_ko is null or char_length(youtube_id_ko) = 11),
  poster_url      text,
  published_at    date not null,
  sort_order      int default 0,
  is_published    boolean default true,
  source          text default 'manual' check (source in ('manual','youtube-sync')),
  last_synced_at  timestamptz,
  created_at      timestamptz default now(),
  constraint shorts_videos_has_video check (youtube_id_en is not null or youtube_id_ko is not null)
);

create index if not exists shorts_videos_pub_idx
  on public.shorts_videos (is_published, published_at desc);

alter table public.shorts_videos enable row level security;

-- Read-only for the public site. No INSERT/UPDATE/DELETE policies:
-- writes happen only via the Supabase dashboard or the service_role key (server side).
drop policy if exists "shorts_videos public read" on public.shorts_videos;
create policy "shorts_videos public read"
  on public.shorts_videos
  for select
  to anon, authenticated
  using (is_published = true);

-- Sample rows with obvious placeholders (replace the IDs, or delete these rows).
-- 'REPLACE_ME_' is exactly 11 characters so it passes the length CHECK.
-- The samples are unpublished (is_published = false) so visitors never see placeholders.
insert into public.shorts_videos
  (slug, ea_part, topic, title_en, title_ko, description_en, description_ko,
   youtube_id_en, youtube_id_ko, published_at, source, is_published)
values
  ('ea1-filing-status-01', 1, 'Filing Status',
   'Which filing status applies?', '어떤 filing status가 적용될까요?',
   'A 60-second EA Part 1 practice question on filing status.', '60초 EA Part 1 filing status 문제풀이.',
   'REPLACE_ME_', 'REPLACE_ME_', current_date, 'manual', false),
  ('ea2-s-corp-basis-01', 2, 'S Corporation Basis',
   'S corporation stock basis in 60 seconds', 'S corporation 주식 basis 60초 풀이',
   'EA Part 2 practice question on S corporation basis.', 'EA Part 2 S corporation basis 문제풀이.',
   'REPLACE_ME_', null, current_date - 1, 'manual', false),
  ('ea3-circular-230-01', 3, 'Circular 230',
   null, 'Circular 230 핵심 문제',
   null, 'EA Part 3 Circular 230 문제풀이.',
   null, 'REPLACE_ME_', current_date - 2, 'manual', false)
on conflict (slug) do nothing;

-- To preview a sample: put a real 11-char YouTube ID in it and set is_published = true.
