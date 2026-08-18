-- Run in Supabase SQL Editor
-- Links trainers to gyms where they offer in-person sessions

create table if not exists public.trainer_gyms (
  id uuid default gen_random_uuid() primary key,
  trainer_id uuid not null references public.trainers(id) on delete cascade,
  gym_id uuid not null references public.gyms(id) on delete cascade,
  created_at timestamptz default now(),
  unique (trainer_id, gym_id)
);

create index if not exists trainer_gyms_trainer_id_idx
  on public.trainer_gyms (trainer_id);

alter table public.trainer_gyms enable row level security;

drop policy if exists "Trainers manage own gym links" on public.trainer_gyms;

create policy "Trainers manage own gym links"
  on public.trainer_gyms
  for all
  using (
    trainer_id in (
      select id from public.trainers
      where owner_id = auth.uid()
    )
  )
  with check (
    trainer_id in (
      select id from public.trainers
      where owner_id = auth.uid()
    )
  );

-- Allow trainers to read messages sent to their trainer profile (mobile app uses trainer.id as receiver_id)
drop policy if exists "Trainers read profile messages" on public.messages;

create policy "Trainers read profile messages"
  on public.messages
  for select
  using (
    receiver_id = auth.uid()::text
    or receiver_id in (
      select id::text from public.trainers
      where owner_id = auth.uid()
    )
  );
