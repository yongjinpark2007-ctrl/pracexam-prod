-- ============================================================================
-- 동영상 "가입자 전용" 구분 (2026-10-17) - 1단계 SQL
-- 실행: Jay 가 Supabase SQL Editor 에 이 파일 전체를 붙여 넣고 실행 (한 번에 전부)
--
-- 하는 일 (3가지)
--   1) shorts_videos 에 access 칸을 더합니다.  'free' = 누구나 / 'members' = 결제·증정 회원만
--      기본값이 'free' 라서 "지금 있는 영상은 전부 자동으로 무료"가 됩니다.
--   2) 공개 읽기 규칙을 좁힙니다.  공개됨 + access='free' 인 행만 직접 읽힙니다.
--      => 가입자 전용 행은 표를 직접 읽는 길(anon 키)로는 절대 안 나옵니다.
--   3) get_videos_for_viewer() 함수를 만듭니다. 화면(랜딩 /videos · 앱 대시보드 · 앱 동영상 화면)이
--      이것 하나를 씁니다.
--        - 결제(is_paid) 회원, 증정 회원, 관리자  => 모든 영상의 YouTube 번호를 줍니다.
--        - 그 외(비로그인·체험·체험만료)           => 가입자 전용 영상은 "번호·설명을 뺀" 잠금 카드용 행만 줍니다.
--
-- 안전한가
--   · 기존 함수·다른 표 무변경. 표에 칸 하나, 정책 하나 교체, 새 함수 하나.
--   · 앞단 화면 코드가 아직 안 바뀌어도 지금 사이트는 그대로 멀쩡합니다
--     (모든 기존 행이 'free' 이므로 공개 읽기 결과가 전과 같습니다) => 배포 순서 무관.
--   · 되돌리기는 맨 아래 "되돌리기" 블록.
--
-- 🔴 잠금 카드 행에서 YouTube 번호가 새지 않게 막은 곳
--   · youtube_id_en / youtube_id_ko  => null
--   · description_en / description_ko => null (설명에 문제·정답이 들어 있음)
--   · poster_url 이 YouTube 썸네일 주소(번호가 들어 있음)이면 => null
-- ============================================================================

-- 1) 칸 추가 -----------------------------------------------------------------
alter table public.shorts_videos
  add column if not exists access text not null default 'free';

alter table public.shorts_videos
  drop constraint if exists shorts_videos_access_chk;
alter table public.shorts_videos
  add constraint shorts_videos_access_chk check (access in ('free','members'));

-- 2) 공개 읽기 규칙을 좁힘 -----------------------------------------------------
drop policy if exists "shorts_videos public read" on public.shorts_videos;
create policy "shorts_videos public read"
  on public.shorts_videos
  for select
  to anon, authenticated
  using (is_published = true and access = 'free');

-- 3) 보는 사람에 맞춰 영상 목록을 주는 함수 ------------------------------------
create or replace function public.get_videos_for_viewer(p_limit int default null)
returns table (
  id              uuid,
  slug            text,
  ea_part         smallint,
  topic           text,
  title_en        text,
  title_ko        text,
  description_en  text,
  description_ko  text,
  youtube_id_en   text,
  youtube_id_ko   text,
  poster_url      text,
  published_at    date,
  sort_order      int,
  access          text,
  locked          boolean,   -- true = 이 보는 사람에겐 잠긴 영상(번호 없음)
  has_en          boolean,   -- 영어 영상이 있는가 (잠금 카드의 EN/KO 표시용)
  has_ko          boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member boolean := false;
begin
  if auth.uid() is not null then
    v_member := auth.uid() = 'f80cf93f-066f-415d-8925-a2e848dccaa3'::uuid
                or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_paid is true);
  end if;

  return query
    select
      v.id, v.slug, v.ea_part, v.topic, v.title_en, v.title_ko,
      case when v.access = 'members' and not v_member then null else v.description_en end,
      case when v.access = 'members' and not v_member then null else v.description_ko end,
      case when v.access = 'members' and not v_member then null else v.youtube_id_en end,
      case when v.access = 'members' and not v_member then null else v.youtube_id_ko end,
      case when v.access = 'members' and not v_member
                and (v.poster_url is null or v.poster_url ~* '(ytimg|youtube|youtu\.be)')
           then null else v.poster_url end,
      v.published_at, v.sort_order, v.access,
      (v.access = 'members' and not v_member) as locked,
      (v.youtube_id_en is not null) as has_en,
      (v.youtube_id_ko is not null) as has_ko
    from public.shorts_videos v
    where v.is_published = true
    order by v.published_at desc, v.sort_order desc
    limit p_limit;
end;
$$;

-- 비로그인 방문자(/videos 잠금 카드)도 불러야 하므로 anon 에게도 실행 권한을 줍니다.
-- (위 본문이 가입자 전용 행의 번호·설명을 이미 빼므로 안전합니다.)
revoke all on function public.get_videos_for_viewer(int) from public;
grant execute on function public.get_videos_for_viewer(int) to anon, authenticated;

-- ── 확인 (SQL Editor 에서 눈으로) ───────────────────────────────────────────
--    ※ SQL Editor 는 «마지막 문장의 결과»만 보여 줍니다. 위 실행이 끝난 뒤,
--      아래 A·B·C 를 «하나씩» 따로 선택해서 실행하며 확인하십시오.
-- A) 지금 영상이 전부 free 인가:
select access, count(*) from public.shorts_videos group by access;
-- B) 정책이 바뀌었는가:
select policyname, qual from pg_policies where tablename = 'shorts_videos';
-- C) 함수가 있는가 (SQL Editor 는 로그인 없음 => 비회원처럼 동작, 지금은 전부 free 라서 번호가 보여야 정상):
select slug, access, locked, youtube_id_en is not null as en_id_visible
  from public.get_videos_for_viewer(5);

-- ── 되돌리기 (문제가 생겼을 때만) ──────────────────────────────────────────
-- drop function if exists public.get_videos_for_viewer(int);
-- drop policy if exists "shorts_videos public read" on public.shorts_videos;
-- create policy "shorts_videos public read" on public.shorts_videos
--   for select to anon, authenticated using (is_published = true);
-- alter table public.shorts_videos drop constraint if exists shorts_videos_access_chk;
-- alter table public.shorts_videos drop column if exists access;
