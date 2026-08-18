-- Run in Supabase SQL Editor
create table if not exists public.messages (
  id uuid default gen_random_uuid() primary key,
  sender_id uuid references auth.users,
  receiver_id text not null,
  receiver_name text,
  receiver_type text default 'trainer',
  content text not null,
  is_read boolean default false,
  created_at timestamp with time zone default now()
);

alter table public.messages enable row level security;

drop policy if exists "Users can read own messages" on public.messages;
drop policy if exists "Users can insert own messages" on public.messages;
drop policy if exists "Users can read sent or received" on public.messages;

create policy "Users can read sent or received"
  on public.messages for select
  using (
    auth.uid() = sender_id
    or auth.uid()::text = receiver_id
  );

create policy "Users can insert own messages"
  on public.messages for insert
  with check (auth.uid() = sender_id);
