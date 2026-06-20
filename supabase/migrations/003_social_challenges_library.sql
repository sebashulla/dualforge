create type public.open_challenge_status as enum ('open', 'active', 'completed', 'cancelled');
create type public.open_challenge_participant_status as enum ('joined', 'completed', 'left');

drop policy if exists "profiles readable by owner or duel peers" on public.profiles;
create policy "profiles public readable by authenticated users" on public.profiles
for select using (auth.uid() is not null);

create table if not exists public.profile_stats (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  duels_won int not null default 0 check (duels_won >= 0),
  duel_streak int not null default 0 check (duel_streak >= 0),
  open_challenges_completed int not null default 0 check (open_challenges_completed >= 0),
  updated_at timestamptz not null default now()
);

create trigger profile_stats_updated_at
before update on public.profile_stats
for each row execute function public.set_updated_at();

alter table public.profile_stats enable row level security;

create policy "profile stats readable" on public.profile_stats
for select using (auth.uid() is not null);

create policy "profile stats own insert" on public.profile_stats
for insert with check (user_id = auth.uid());

create policy "profile stats own update" on public.profile_stats
for update using (user_id = auth.uid()) with check (user_id = auth.uid());

insert into public.profile_stats(user_id)
select id from public.profiles
on conflict (user_id) do nothing;

create or replace function public.ensure_profile_stats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profile_stats(user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists ensure_profile_stats_on_profile on public.profiles;
create trigger ensure_profile_stats_on_profile
after insert on public.profiles
for each row execute function public.ensure_profile_stats();

alter table public.duels
  add column if not exists winner_user_id uuid references public.profiles(id) on delete set null,
  add column if not exists status text not null default 'active'
    check (status in ('active', 'completed', 'cancelled'));

create table if not exists public.open_challenges (
  id uuid primary key default gen_random_uuid(),
  creator_user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null,
  category text not null default 'productividad',
  difficulty public.difficulty_level not null default 'medium',
  points int not null default 25 check (points >= 0),
  min_participants int not null default 2 check (min_participants >= 1),
  max_participants int not null default 2 check (max_participants >= min_participants),
  starts_at timestamptz,
  ends_at timestamptz,
  evidence_type public.evidence_type not null default 'reflection',
  rules text not null default '',
  status public.open_challenge_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger open_challenges_updated_at
before update on public.open_challenges
for each row execute function public.set_updated_at();

create table if not exists public.open_challenge_participants (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.open_challenges(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status public.open_challenge_participant_status not null default 'joined',
  joined_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (challenge_id, user_id)
);

alter table public.open_challenges enable row level security;
alter table public.open_challenge_participants enable row level security;

create policy "open challenges readable" on public.open_challenges
for select using (auth.uid() is not null);

create policy "open challenges create own" on public.open_challenges
for insert with check (creator_user_id = auth.uid());

create policy "open challenges update creator" on public.open_challenges
for update using (creator_user_id = auth.uid()) with check (creator_user_id = auth.uid());

create policy "open participants readable" on public.open_challenge_participants
for select using (auth.uid() is not null);

create policy "open participants join self" on public.open_challenge_participants
for insert with check (user_id = auth.uid());

create policy "open participants update self" on public.open_challenge_participants
for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists public.library_courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null default '',
  visibility public.visibility_level not null default 'private',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger library_courses_updated_at
before update on public.library_courses
for each row execute function public.set_updated_at();

create table if not exists public.library_topics (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.library_courses(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  summary text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger library_topics_updated_at
before update on public.library_topics
for each row execute function public.set_updated_at();

create table if not exists public.library_topic_notes (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.library_topics(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger library_topic_notes_updated_at
before update on public.library_topic_notes
for each row execute function public.set_updated_at();

create table if not exists public.library_topic_flashcards (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.library_topics(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  question text not null,
  answer text not null,
  difficulty public.difficulty_level not null default 'medium',
  next_review_on date not null default current_date,
  success_count int not null default 0,
  failure_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger library_topic_flashcards_updated_at
before update on public.library_topic_flashcards
for each row execute function public.set_updated_at();

alter table public.library_courses enable row level security;
alter table public.library_topics enable row level security;
alter table public.library_topic_notes enable row level security;
alter table public.library_topic_flashcards enable row level security;

create policy "library courses visible" on public.library_courses
for select using (user_id = auth.uid() or visibility <> 'private');
create policy "library courses own write" on public.library_courses
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "library topics visible through course" on public.library_topics
for select using (
  user_id = auth.uid()
  or exists (
    select 1 from public.library_courses c
    where c.id = course_id and c.visibility <> 'private'
  )
);
create policy "library topics own write" on public.library_topics
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "library notes own" on public.library_topic_notes
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "library flashcards own" on public.library_topic_flashcards
for all using (user_id = auth.uid()) with check (user_id = auth.uid());
