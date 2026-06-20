create extension if not exists "citext";

alter table public.profiles
  add column if not exists username citext,
  add column if not exists description text not null default '';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_username_unique'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles add constraint profiles_username_unique unique (username);
  end if;
end;
$$;

create table if not exists public.profile_private (
  id uuid primary key references public.profiles(id) on delete cascade,
  full_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profile_private_updated_at
before update on public.profile_private
for each row execute function public.set_updated_at();

alter table public.profile_private enable row level security;

drop policy if exists "profile private own" on public.profile_private;
create policy "profile private own" on public.profile_private
for all using (id = auth.uid()) with check (id = auth.uid());

create or replace function public.normalize_username(input text)
returns citext
language sql
immutable
as $$
  select nullif(regexp_replace(lower(coalesce(input, '')), '[^a-z0-9_]', '', 'g'), '')::citext;
$$;

create or replace function public.is_username_available(input text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.normalize_username(input) is not null
    and not exists (
      select 1
      from public.profiles
      where username = public.normalize_username(input)
    );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_username citext;
  public_name text;
begin
  normalized_username := public.normalize_username(new.raw_user_meta_data->>'username');
  public_name := coalesce(
    nullif(new.raw_user_meta_data->>'display_name', ''),
    nullif(new.raw_user_meta_data->>'username', ''),
    split_part(new.email, '@', 1)
  );

  insert into public.profiles(id, display_name, username, avatar_url, motto, description, privacy)
  values (
    new.id,
    public_name,
    normalized_username,
    nullif(new.raw_user_meta_data->>'avatar_url', ''),
    coalesce(new.raw_user_meta_data->>'motto', ''),
    coalesce(new.raw_user_meta_data->>'description', ''),
    '{"goals":"shared_progress","posts":"duel","evidence":"duel"}'
  )
  on conflict (id) do update
    set display_name = excluded.display_name,
        username = excluded.username,
        description = excluded.description,
        updated_at = now();

  insert into public.profile_private(id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do update
    set full_name = excluded.full_name,
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.recovery_challenges
  add column if not exists continuation_status text not null default 'undecided'
    check (continuation_status in ('undecided', 'finished', 'continued')),
  add column if not exists decision_due_at timestamptz,
  add column if not exists continued_from_challenge_id uuid references public.recovery_challenges(id) on delete set null;

create index if not exists recovery_challenges_decision_due_idx
on public.recovery_challenges(decision_due_at)
where continuation_status = 'undecided';
