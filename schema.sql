-- Rainy Muse Poll v0.1: Supabase Table Schema
-- Table: poll_votes

create table if not exists public.poll_votes (
  id bigint generated always as identity primary key,
  poll_id text not null default 'sleeping-stars-v2-result',
  choice text not null check (choice in ('type1', 'type2', 'type3', 'type4', 'type5', 'type6', 'type7', 'type8', 'type9')),
  source text not null default 'direct',
  created_at timestamptz not null default now()
);

-- Indices for fast aggregations
create index if not exists poll_votes_poll_id_idx on public.poll_votes (poll_id);
create index if not exists poll_votes_choice_idx on public.poll_votes (poll_id, choice);

-- Row Level Security (RLS)
alter table public.poll_votes enable row level security;

-- Allow anonymous inserts
create policy "Allow anonymous insert on poll_votes"
  on public.poll_votes
  for insert
  with check (true);

-- Allow anonymous reads for public aggregate display
create policy "Allow anonymous select on poll_votes"
  on public.poll_votes
  for select
  using (true);
