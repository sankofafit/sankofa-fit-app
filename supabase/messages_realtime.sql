-- Run in Supabase SQL Editor
-- Real-time chat policies + enable replication on messages table

-- Trainers can mark client messages as read
drop policy if exists "Trainers update received messages" on public.messages;

create policy "Trainers update received messages"
  on public.messages
  for update
  using (
    receiver_id = auth.uid()::text
    or receiver_id in (
      select id::text from public.trainers
      where owner_id = auth.uid()
    )
  );

-- Users can mark trainer messages as read
drop policy if exists "Users update received messages" on public.messages;

create policy "Users update received messages"
  on public.messages
  for update
  using (auth.uid()::text = receiver_id);

-- Enable realtime (Dashboard → Database → Replication → messages)
-- Or run: alter publication supabase_realtime add table public.messages;
