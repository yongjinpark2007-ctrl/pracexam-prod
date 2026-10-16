-- Second real row: "Qualifying Child Support Test" (EN + KO). Run in the Supabase SQL Editor.
-- Same idea as shorts_videos_first_real_row.sql: source = 'youtube-sync' so the sync Worker takes it over later
-- when both videos carry   PX: key=qualifying-child-support-test
--
-- NOT inserted on purpose: EN video j08GU_A_hdo. It has the same title and length (108 s) as 2EFkT-Uxk4o,
-- so it looks like a duplicate upload. One row can hold only one EN video.

insert into public.shorts_videos
  (slug, ea_part, topic, title_en, title_ko, youtube_id_en, youtube_id_ko,
   published_at, source, is_published)
values
  ('qualifying-child-support-test', 1, 'Qualifying Child Support Test',
   'Enrolled Agent EA Exam: Qualifying Child Support Test | Part 1 Practice Question #eaexam #eaexamprep',
   '미국 세무사 EA 시험 파트 1 연습문제: 적격 자녀 부양 요건 | Enrolled Agent #eaexam #eaexamprep #enrolledagent #미국세무사',
   '2EFkT-Uxk4o', 'qio9aPdKo_o',
   '2026-10-10', 'youtube-sync', true)
on conflict (slug) do nothing;

-- Check (should now return 2 rows):
-- select slug, ea_part, topic, youtube_id_en, youtube_id_ko, is_published from public.shorts_videos where is_published order by published_at desc;
