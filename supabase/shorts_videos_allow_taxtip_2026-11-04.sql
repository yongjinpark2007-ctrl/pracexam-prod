-- 2026-11-04: allow ea_part = 0 for IRS Tax Tip videos.
-- The site shows "IRS Tax Tip" instead of "EA Part N" when ea_part = 0 (videos.js partText).
-- The youtube-sync worker sets ea_part = 0 when the video title contains "IRS Tax Tip" (or the PX line says part=0).
-- Run once in the Supabase SQL Editor (Jay). Safe: only widens the allowed values, existing rows are untouched.
alter table public.shorts_videos drop constraint if exists shorts_videos_ea_part_check;
alter table public.shorts_videos add constraint shorts_videos_ea_part_check check (ea_part in (0,1,2,3));
