-- War Room sheet flags (boss 2026-11-08)
-- One row = one member flagged one War Room sheet. Used by app.html (EA) and re/app.html (RE).
-- Each member can only see, add and remove their own rows.
-- Safe to run more than once.

create table if not exists public.war_room_flags (
  user_id      uuid        not null references auth.users(id) on delete cascade,
  outline_code text        not null,
  created_at   timestamptz not null default now(),
  primary key (user_id, outline_code)
);

alter table public.war_room_flags enable row level security;

drop policy if exists war_room_flags_select_own on public.war_room_flags;
create policy war_room_flags_select_own on public.war_room_flags
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists war_room_flags_insert_own on public.war_room_flags;
create policy war_room_flags_insert_own on public.war_room_flags
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists war_room_flags_update_own on public.war_room_flags;
create policy war_room_flags_update_own on public.war_room_flags
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists war_room_flags_delete_own on public.war_room_flags;
create policy war_room_flags_delete_own on public.war_room_flags
  for delete to authenticated using (auth.uid() = user_id);

grant select, insert, update, delete on public.war_room_flags to authenticated;
