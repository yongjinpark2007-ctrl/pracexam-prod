-- First real row: the "Filing Status for Year of Death" Shorts (EN + KO), so the landing band and /videos show something.
-- Run AFTER shorts_videos.sql, in the Supabase SQL Editor.
--
-- source = 'youtube-sync' on purpose: once the sync Worker is deployed and both videos carry
--   PX: key=filing-status-for-year-of-death
-- it takes over this row (same slug) and fills in the descriptions. A 'manual' row would be left alone by the sync.
-- Descriptions are left empty here; the page simply shows no description line until the sync fills it.

insert into public.shorts_videos
  (slug, ea_part, topic, title_en, title_ko, youtube_id_en, youtube_id_ko,
   published_at, source, is_published)
values
  ('filing-status-for-year-of-death', 1, 'Filing Status for Year of Death',
   'Enrolled Agent EA Exam: Filing Status for Year of Death | Part 1 Question #eaexam #eaexamprep',
   '미국 세무사 EA 시험: 배우자 사망 연도의 신고 지위 | 파트 1 실전 문제 📝 #EA시험 #미국세무사',
   'gBqWWoaeFdQ', 'SlmXmmAqX2g',
   '2026-10-13', 'youtube-sync', true)
on conflict (slug) do nothing;

-- Check (should return 1 row):
-- select slug, ea_part, topic, youtube_id_en, youtube_id_ko, is_published from public.shorts_videos where is_published;
