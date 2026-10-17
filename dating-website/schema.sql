-- Dating website starter schema for Supabase
-- Run in Supabase Dashboard -> SQL Editor. Test with dummy accounts first.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 60),
  birth_date date not null,
  bio text not null default '' check (char_length(bio) <= 500),
  country text not null default '',
  city text not null default '',
  gender text not null default '',
  interested_in text not null default '',
  photo_urls text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint adult_only check (birth_date <= (current_date - interval '18 years')::date)
);

create table if not exists public.likes (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null references public.profiles(id) on delete cascade,
  to_user uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (from_user, to_user),
  check (from_user <> to_user)
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles(id) on delete cascade,
  user_b uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (user_a < user_b),
  unique (user_a, user_b)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_user_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null check (char_length(reason) between 3 and 1000),
  status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  created_at timestamptz not null default now(),
  check (reporter_id <> reported_user_id)
);

create table if not exists public.subscriptions (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  provider text not null,
  provider_customer_id text,
  provider_subscription_id text,
  status text not null default 'inactive',
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists likes_to_user_idx on public.likes(to_user);
create index if not exists messages_match_created_idx on public.messages(match_id, created_at);
create index if not exists reports_status_idx on public.reports(status);

alter table public.profiles enable row level security;
alter table public.likes enable row level security;
alter table public.matches enable row level security;
alter table public.messages enable row level security;
alter table public.reports enable row level security;
alter table public.subscriptions enable row level security;

-- Profiles: signed-in users can discover active profiles; each user edits only their own.
create policy "active profiles readable by signed-in users" on public.profiles
  for select to authenticated using (is_active = true or id = auth.uid());
create policy "users insert own profile" on public.profiles
  for insert to authenticated with check (id = auth.uid());
create policy "users update own profile" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Likes: users can create/read their own likes; no one can impersonate another user.
create policy "users read likes they sent or received" on public.likes
  for select to authenticated using (from_user = auth.uid() or to_user = auth.uid());
create policy "users send own likes" on public.likes
  for insert to authenticated with check (from_user = auth.uid());
create policy "users remove own likes" on public.likes
  for delete to authenticated using (from_user = auth.uid());

-- Matches and messages are visible only to participants.
create policy "participants read matches" on public.matches
  for select to authenticated using (user_a = auth.uid() or user_b = auth.uid());
create policy "participants read messages" on public.messages
  for select to authenticated using (
    exists (select 1 from public.matches m
      where m.id = match_id and (m.user_a = auth.uid() or m.user_b = auth.uid()))
  );
create policy "participants send messages" on public.messages
  for insert to authenticated with check (
    sender_id = auth.uid() and exists (
      select 1 from public.matches m
      where m.id = match_id and (m.user_a = auth.uid() or m.user_b = auth.uid())
    )
  );

create policy "users submit reports" on public.reports
  for insert to authenticated with check (reporter_id = auth.uid());
create policy "users read reports they submitted" on public.reports
  for select to authenticated using (reporter_id = auth.uid());

-- Subscription details must be written by a trusted server/webhook, not the browser.
create policy "users read own subscription" on public.subscriptions
  for select to authenticated using (user_id = auth.uid());

-- Create a match automatically when both users like each other.
create or replace function public.create_mutual_match()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  low_id uuid;
  high_id uuid;
begin
  if exists (
    select 1 from public.likes
    where from_user = new.to_user and to_user = new.from_user
  ) then
    low_id := least(new.from_user, new.to_user);
    high_id := greatest(new.from_user, new.to_user);
    insert into public.matches(user_a, user_b)
    values (low_id, high_id)
    on conflict (user_a, user_b) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists on_mutual_like on public.likes;
create trigger on_mutual_like
after insert on public.likes
for each row execute function public.create_mutual_match();

-- NOTE: Keep service-role keys secret. Never put them in NEXT_PUBLIC_* variables.
