create extension if not exists "pgcrypto";

create type public.visibility_level as enum ('private', 'shared_progress', 'shared_full', 'duel', 'public');
create type public.duel_role as enum ('owner', 'member');
create type public.habit_frequency as enum ('daily', 'weekly', 'custom');
create type public.difficulty_level as enum ('easy', 'medium', 'hard', 'legendary');
create type public.day_status as enum ('completed', 'rescued', 'failed');
create type public.challenge_status as enum ('pending', 'submitted', 'approved', 'rejected', 'expired', 'needs_changes');
create type public.evidence_type as enum ('image', 'text', 'document', 'link', 'reflection');
create type public.review_decision as enum ('approved', 'rejected', 'needs_changes');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  motto text default '',
  level int not null default 1 check (level >= 1),
  privacy jsonb not null default '{"goals":"shared_progress","posts":"duel","evidence":"duel"}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.duels (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  duration_days int not null check (duration_days in (30, 60, 90)),
  starts_on date not null,
  ends_on date not null,
  rules text not null default '',
  rescue_cooldown_days int not null default 14 check (rescue_cooldown_days >= 1),
  invite_code text not null unique default upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 10)),
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint duels_valid_dates check (ends_on >= starts_on)
);

create table public.duel_members (
  id uuid primary key default gen_random_uuid(),
  duel_id uuid not null references public.duels(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.duel_role not null default 'member',
  joined_at timestamptz not null default now(),
  unique (duel_id, user_id)
);

create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  duel_id uuid not null references public.duels(id) on delete cascade,
  name text not null,
  starts_on date not null,
  ends_on date not null,
  created_at timestamptz not null default now(),
  constraint seasons_valid_dates check (ends_on >= starts_on)
);

create table public.habits (
  id uuid primary key default gen_random_uuid(),
  duel_id uuid references public.duels(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  category text not null,
  frequency public.habit_frequency not null default 'daily',
  repeat_days int[] not null default '{1,2,3,4,5,6,7}',
  deadline time,
  difficulty public.difficulty_level not null default 'medium',
  points int not null default 10 check (points >= 0),
  requires_evidence boolean not null default false,
  is_essential boolean not null default true,
  visibility public.visibility_level not null default 'duel',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.habit_checkins (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  checkin_date date not null default current_date,
  completed boolean not null default true,
  note text,
  evidence_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (habit_id, user_id, checkin_date)
);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  duel_id uuid references public.duels(id) on delete set null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null default '',
  due_date date,
  category text not null default 'personal',
  progress numeric(5,2) not null default 0 check (progress between 0 and 100),
  visibility public.visibility_level not null default 'shared_progress',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.goal_milestones (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals(id) on delete cascade,
  title text not null,
  target_value numeric,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.recovery_challenges (
  id uuid primary key default gen_random_uuid(),
  duel_id uuid not null references public.duels(id) on delete cascade,
  target_user_id uuid not null references public.profiles(id) on delete cascade,
  creator_user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null,
  due_at timestamptz not null,
  difficulty public.difficulty_level not null default 'medium',
  points int not null default 20,
  required_evidence public.evidence_type not null default 'reflection',
  status public.challenge_status not null default 'pending',
  creator_comment text,
  rescue_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recovery_challenges_distinct_users check (target_user_id <> creator_user_id)
);

create table public.challenge_evidence (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.recovery_challenges(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  evidence_type public.evidence_type not null,
  file_path text,
  link_url text,
  body text,
  description text not null default '',
  review_status public.challenge_status not null default 'submitted',
  validator_comment text,
  submitted_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.challenge_reviews (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.recovery_challenges(id) on delete cascade,
  evidence_id uuid references public.challenge_evidence(id) on delete set null,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  decision public.review_decision not null,
  comment text not null default '',
  created_at timestamptz not null default now()
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  duel_id uuid references public.duels(id) on delete set null,
  goal_id uuid references public.goals(id) on delete set null,
  title text not null,
  body text not null,
  image_paths text[] not null default '{}',
  tags text[] not null default '{}',
  category text not null default 'learning',
  minutes_spent int not null default 0 check (minutes_spent >= 0),
  visibility public.visibility_level not null default 'duel',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.library_folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  parent_id uuid references public.library_folders(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  folder_id uuid references public.library_folders(id) on delete set null,
  title text not null,
  body text not null default '',
  tags text[] not null default '{}',
  document_path text,
  link_url text,
  visibility public.visibility_level not null default 'private',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.flashcard_decks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  folder_id uuid references public.library_folders(id) on delete set null,
  title text not null,
  description text not null default '',
  created_at timestamptz not null default now()
);

create table public.flashcards (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.flashcard_decks(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  question text not null,
  answer text not null,
  category text not null default 'general',
  difficulty public.difficulty_level not null default 'medium',
  next_review_on date not null default current_date,
  success_count int not null default 0,
  failure_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.flashcard_reviews (
  id uuid primary key default gen_random_uuid(),
  flashcard_id uuid not null references public.flashcards(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  remembered boolean not null,
  reviewed_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  duel_id uuid references public.duels(id) on delete set null,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table public.score_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  duel_id uuid references public.duels(id) on delete cascade,
  source_type text not null,
  source_id uuid,
  points int not null,
  reason text not null,
  created_at timestamptz not null default now()
);

create index duel_members_user_id_idx on public.duel_members(user_id);
create index habits_user_duel_idx on public.habits(user_id, duel_id);
create index habit_checkins_user_date_idx on public.habit_checkins(user_id, checkin_date);
create index recovery_challenges_duel_target_idx on public.recovery_challenges(duel_id, target_user_id);
create index score_events_user_duel_idx on public.score_events(user_id, duel_id);

create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger duels_updated_at before update on public.duels for each row execute function public.set_updated_at();
create trigger habits_updated_at before update on public.habits for each row execute function public.set_updated_at();
create trigger habit_checkins_updated_at before update on public.habit_checkins for each row execute function public.set_updated_at();
create trigger goals_updated_at before update on public.goals for each row execute function public.set_updated_at();
create trigger recovery_challenges_updated_at before update on public.recovery_challenges for each row execute function public.set_updated_at();
create trigger posts_updated_at before update on public.posts for each row execute function public.set_updated_at();
create trigger notes_updated_at before update on public.notes for each row execute function public.set_updated_at();
create trigger flashcards_updated_at before update on public.flashcards for each row execute function public.set_updated_at();

create or replace function public.is_duel_member(target_duel_id uuid, target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.duel_members dm
    where dm.duel_id = target_duel_id
      and dm.user_id = target_user_id
  );
$$;

create or replace function public.share_duel_with_user(owner_id uuid, viewer_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select owner_id = viewer_id or exists (
    select 1
    from public.duel_members a
    join public.duel_members b on b.duel_id = a.duel_id
    where a.user_id = owner_id
      and b.user_id = viewer_id
  );
$$;

create or replace function public.can_create_rescue(target_duel_id uuid, target_user_id uuid, cooldown_days int)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1
    from public.recovery_challenges rc
    where rc.duel_id = target_duel_id
      and rc.target_user_id = target_user_id
      and rc.status in ('approved', 'submitted', 'pending')
      and rc.created_at >= now() - make_interval(days => cooldown_days)
  );
$$;

create or replace function public.join_duel_by_code(join_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_duel_id uuid;
begin
  select id into target_duel_id
  from public.duels
  where invite_code = upper(trim(join_code));

  if target_duel_id is null then
    raise exception 'Invalid duel invite code';
  end if;

  insert into public.duel_members(duel_id, user_id, role)
  values (target_duel_id, auth.uid(), 'member')
  on conflict (duel_id, user_id) do nothing;

  return target_duel_id;
end;
$$;

alter table public.profiles enable row level security;
alter table public.duels enable row level security;
alter table public.duel_members enable row level security;
alter table public.seasons enable row level security;
alter table public.habits enable row level security;
alter table public.habit_checkins enable row level security;
alter table public.goals enable row level security;
alter table public.goal_milestones enable row level security;
alter table public.recovery_challenges enable row level security;
alter table public.challenge_evidence enable row level security;
alter table public.challenge_reviews enable row level security;
alter table public.posts enable row level security;
alter table public.library_folders enable row level security;
alter table public.notes enable row level security;
alter table public.flashcard_decks enable row level security;
alter table public.flashcards enable row level security;
alter table public.flashcard_reviews enable row level security;
alter table public.notifications enable row level security;
alter table public.activity_logs enable row level security;
alter table public.score_events enable row level security;

create policy "profiles readable by owner or duel peers" on public.profiles
for select using (id = auth.uid() or public.share_duel_with_user(id));
create policy "profiles insert own" on public.profiles
for insert with check (id = auth.uid());
create policy "profiles update own" on public.profiles
for update using (id = auth.uid()) with check (id = auth.uid());

create policy "duels readable by members" on public.duels
for select using (public.is_duel_member(id));
create policy "duels insert by creator" on public.duels
for insert with check (created_by = auth.uid());
create policy "duels update by creator" on public.duels
for update using (created_by = auth.uid()) with check (created_by = auth.uid());

create policy "duel members readable by members" on public.duel_members
for select using (public.is_duel_member(duel_id) or user_id = auth.uid());
create policy "duel members self join or creator add" on public.duel_members
for insert with check (
  user_id = auth.uid()
  or exists (select 1 from public.duels d where d.id = duel_id and d.created_by = auth.uid())
);
create policy "duel members self leave" on public.duel_members
for delete using (user_id = auth.uid());

create policy "seasons readable by duel members" on public.seasons
for select using (public.is_duel_member(duel_id));
create policy "seasons writable by duel creator" on public.seasons
for all using (exists (select 1 from public.duels d where d.id = duel_id and d.created_by = auth.uid()))
with check (exists (select 1 from public.duels d where d.id = duel_id and d.created_by = auth.uid()));

create policy "habits visible to owner or duel peers when shared" on public.habits
for select using (
  user_id = auth.uid()
  or (visibility <> 'private' and duel_id is not null and public.is_duel_member(duel_id))
);
create policy "habits insert own" on public.habits
for insert with check (user_id = auth.uid() and (duel_id is null or public.is_duel_member(duel_id)));
create policy "habits update own" on public.habits
for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "habits delete own" on public.habits
for delete using (user_id = auth.uid());

create policy "checkins visible through visible habit" on public.habit_checkins
for select using (
  user_id = auth.uid()
  or exists (
    select 1 from public.habits h
    where h.id = habit_id
      and h.visibility <> 'private'
      and h.duel_id is not null
      and public.is_duel_member(h.duel_id)
  )
);
create policy "checkins insert own" on public.habit_checkins
for insert with check (user_id = auth.uid());
create policy "checkins update own" on public.habit_checkins
for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "checkins delete own" on public.habit_checkins
for delete using (user_id = auth.uid());

create policy "goals visible by privacy" on public.goals
for select using (
  user_id = auth.uid()
  or (visibility <> 'private' and duel_id is not null and public.is_duel_member(duel_id))
);
create policy "goals write own" on public.goals
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "milestones visible through goals" on public.goal_milestones
for select using (exists (select 1 from public.goals g where g.id = goal_id and (g.user_id = auth.uid() or (g.visibility <> 'private' and g.duel_id is not null and public.is_duel_member(g.duel_id)))));
create policy "milestones writable by goal owner" on public.goal_milestones
for all using (exists (select 1 from public.goals g where g.id = goal_id and g.user_id = auth.uid()))
with check (exists (select 1 from public.goals g where g.id = goal_id and g.user_id = auth.uid()));

create policy "recovery challenges visible to duel members" on public.recovery_challenges
for select using (public.is_duel_member(duel_id));
create policy "recovery challenges create by rival" on public.recovery_challenges
for insert with check (
  creator_user_id = auth.uid()
  and public.is_duel_member(duel_id)
  and public.is_duel_member(duel_id, target_user_id)
  and target_user_id <> auth.uid()
  and public.can_create_rescue(
    duel_id,
    target_user_id,
    coalesce((select d.rescue_cooldown_days from public.duels d where d.id = duel_id), 14)
  )
);
create policy "recovery challenges update by creator or target submission" on public.recovery_challenges
for update using (creator_user_id = auth.uid() or target_user_id = auth.uid())
with check (creator_user_id = auth.uid() or target_user_id = auth.uid());

create policy "challenge evidence visible to duel members" on public.challenge_evidence
for select using (
  exists (
    select 1 from public.recovery_challenges rc
    where rc.id = challenge_id and public.is_duel_member(rc.duel_id)
  )
);
create policy "challenge evidence insert by target" on public.challenge_evidence
for insert with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.recovery_challenges rc
    where rc.id = challenge_id and rc.target_user_id = auth.uid()
  )
);
create policy "challenge evidence soft update by owner" on public.challenge_evidence
for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "challenge reviews visible to duel members" on public.challenge_reviews
for select using (
  exists (
    select 1 from public.recovery_challenges rc
    where rc.id = challenge_id and public.is_duel_member(rc.duel_id)
  )
);
create policy "challenge reviews insert by creator" on public.challenge_reviews
for insert with check (
  reviewer_id = auth.uid()
  and exists (
    select 1 from public.recovery_challenges rc
    where rc.id = challenge_id and rc.creator_user_id = auth.uid()
  )
);

create policy "posts visible by privacy" on public.posts
for select using (user_id = auth.uid() or (visibility <> 'private' and duel_id is not null and public.is_duel_member(duel_id)));
create policy "posts write own" on public.posts
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "folders own" on public.library_folders for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "notes visible by privacy" on public.notes
for select using (user_id = auth.uid() or (visibility <> 'private' and public.share_duel_with_user(user_id)));
create policy "notes write own" on public.notes for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "decks own" on public.flashcard_decks for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "flashcards own" on public.flashcards for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "flashcard reviews own" on public.flashcard_reviews for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "notifications own" on public.notifications for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "activity readable by actor or duel members" on public.activity_logs
for select using (actor_id = auth.uid() or (duel_id is not null and public.is_duel_member(duel_id)));
create policy "activity insert authenticated" on public.activity_logs
for insert with check (actor_id = auth.uid());
create policy "score visible by owner or duel peers" on public.score_events
for select using (user_id = auth.uid() or (duel_id is not null and public.is_duel_member(duel_id)));
create policy "score insert own" on public.score_events
for insert with check (
  user_id = auth.uid()
  or exists (
    select 1
    from public.recovery_challenges rc
    where rc.id = source_id
      and rc.duel_id = score_events.duel_id
      and rc.creator_user_id = auth.uid()
      and rc.target_user_id = score_events.user_id
      and source_type in ('recovery_challenge', 'recovery_penalty')
  )
);

create or replace function public.log_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.activity_logs(actor_id, duel_id, entity_type, entity_id, action, metadata)
  values (
    auth.uid(),
    case
      when tg_table_name in ('duels') then new.id
      when tg_table_name in ('habits') then new.duel_id
      when tg_table_name in ('recovery_challenges') then new.duel_id
      else null
    end,
    tg_table_name,
    new.id,
    lower(tg_op),
    jsonb_build_object('at', now())
  );
  return new;
end;
$$;

create trigger log_duels after insert or update on public.duels for each row execute function public.log_activity();
create trigger log_habits after insert or update on public.habits for each row execute function public.log_activity();
create trigger log_recovery_challenges after insert or update on public.recovery_challenges for each row execute function public.log_activity();

insert into storage.buckets (id, name, public)
values
  ('avatars', 'avatars', true),
  ('evidence', 'evidence', false),
  ('library', 'library', false)
on conflict (id) do nothing;

create policy "avatars readable" on storage.objects
for select using (bucket_id = 'avatars');
create policy "avatars own writes" on storage.objects
for insert with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "evidence duel member read" on storage.objects
for select using (
  bucket_id = 'evidence'
  and exists (
    select 1 from public.challenge_evidence ce
    join public.recovery_challenges rc on rc.id = ce.challenge_id
    where ce.file_path = name and public.is_duel_member(rc.duel_id)
  )
);
create policy "evidence owner upload" on storage.objects
for insert with check (bucket_id = 'evidence' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "library owner files" on storage.objects
for all using (bucket_id = 'library' and auth.uid()::text = (storage.foldername(name))[1])
with check (bucket_id = 'library' and auth.uid()::text = (storage.foldername(name))[1]);
