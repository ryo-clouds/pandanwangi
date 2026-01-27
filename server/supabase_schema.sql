-- Create chat_sessions table
create table public.chat_sessions (
  id uuid default gen_random_uuid() primary key,
  title text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add session_id to chat_messages
alter table public.chat_messages 
add column session_id uuid references public.chat_sessions(id) on delete cascade;

-- Create index for faster lookups
create index idx_chat_messages_session_id on public.chat_messages(session_id);

-- Add RLS policies (optional, if RLS is enabled)
alter table public.chat_sessions enable row level security;
create policy "Public sessions access" on public.chat_sessions for all using (true);
