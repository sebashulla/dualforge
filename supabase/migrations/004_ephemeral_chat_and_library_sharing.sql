do $$
begin
  if not exists (select 1 from pg_type where typname = 'chat_attachment_kind') then
    create type public.chat_attachment_kind as enum ('image', 'audio', 'video', 'file');
  end if;
end;
$$;

create table if not exists public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles(id) on delete cascade,
  started_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  created_timezone text not null default 'UTC',
  updated_at timestamptz not null default now(),
  constraint chat_threads_valid_expiration check (expires_at > started_at)
);

create trigger chat_threads_updated_at
before update on public.chat_threads
for each row execute function public.set_updated_at();

create table if not exists public.chat_participants (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique (thread_id, user_id)
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text,
  attachment_kind public.chat_attachment_kind,
  attachment_path text,
  attachment_name text,
  attachment_mime text,
  attachment_size int check (attachment_size is null or attachment_size >= 0),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  deleted_at timestamptz,
  constraint chat_messages_has_content check (
    nullif(trim(coalesce(body, '')), '') is not null
    or attachment_path is not null
  )
);

create index if not exists chat_participants_user_idx on public.chat_participants(user_id);
create index if not exists chat_messages_thread_created_idx on public.chat_messages(thread_id, created_at);
create index if not exists chat_messages_expiration_idx on public.chat_messages(expires_at);

create or replace function public.is_chat_participant(target_thread_id uuid, target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.chat_participants cp
    join public.chat_threads ct on ct.id = cp.thread_id
    where cp.thread_id = target_thread_id
      and cp.user_id = target_user_id
      and ct.expires_at > now()
  );
$$;

create or replace function public.set_chat_message_expiration()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select ct.expires_at into new.expires_at
  from public.chat_threads ct
  where ct.id = new.thread_id;

  if new.expires_at is null then
    raise exception 'Chat thread not found';
  end if;

  return new;
end;
$$;

drop trigger if exists set_chat_message_expiration_on_insert on public.chat_messages;
create trigger set_chat_message_expiration_on_insert
before insert on public.chat_messages
for each row execute function public.set_chat_message_expiration();

create or replace function public.touch_chat_thread()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.chat_threads
  set updated_at = now()
  where id = new.thread_id;

  return new;
end;
$$;

drop trigger if exists touch_chat_thread_on_message on public.chat_messages;
create trigger touch_chat_thread_on_message
after insert on public.chat_messages
for each row execute function public.touch_chat_thread();

create or replace function public.purge_expired_chat_data()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.chat_messages where expires_at <= now();
  delete from public.chat_threads where expires_at <= now();
end;
$$;

alter table public.chat_threads enable row level security;
alter table public.chat_participants enable row level security;
alter table public.chat_messages enable row level security;

create policy "chat threads participant read" on public.chat_threads
for select using (created_by = auth.uid() or public.is_chat_participant(id));

create policy "chat threads create own" on public.chat_threads
for insert with check (created_by = auth.uid());

create policy "chat participants readable by members" on public.chat_participants
for select using (public.is_chat_participant(thread_id));

create policy "chat participants creator adds users" on public.chat_participants
for insert with check (
  user_id = auth.uid()
  or exists (
    select 1
    from public.chat_threads ct
    where ct.id = thread_id
      and ct.created_by = auth.uid()
      and ct.expires_at > now()
  )
);

create policy "chat messages participant read" on public.chat_messages
for select using (
  deleted_at is null
  and expires_at > now()
  and public.is_chat_participant(thread_id)
);

create policy "chat messages participant send" on public.chat_messages
for insert with check (
  sender_id = auth.uid()
  and public.is_chat_participant(thread_id)
);

create policy "chat messages sender soft delete" on public.chat_messages
for update using (sender_id = auth.uid()) with check (sender_id = auth.uid());

create table if not exists public.library_shares (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.library_courses(id) on delete cascade,
  owner_user_id uuid not null references public.profiles(id) on delete cascade,
  recipient_user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (course_id, recipient_user_id),
  constraint library_shares_distinct_users check (owner_user_id <> recipient_user_id)
);

create index if not exists library_shares_recipient_idx on public.library_shares(recipient_user_id);

alter table public.library_shares enable row level security;

create policy "library shares visible to involved users" on public.library_shares
for select using (owner_user_id = auth.uid() or recipient_user_id = auth.uid());

create policy "library shares owner creates" on public.library_shares
for insert with check (
  owner_user_id = auth.uid()
  and exists (
    select 1
    from public.library_courses lc
    where lc.id = course_id and lc.user_id = auth.uid()
  )
);

create policy "library shares owner deletes" on public.library_shares
for delete using (owner_user_id = auth.uid());

drop policy if exists "library courses visible" on public.library_courses;
create policy "library courses visible" on public.library_courses
for select using (
  user_id = auth.uid()
  or visibility = 'public'
  or exists (
    select 1
    from public.library_shares ls
    where ls.course_id = id
      and ls.recipient_user_id = auth.uid()
  )
);

drop policy if exists "library topics visible through course" on public.library_topics;
create policy "library topics visible through course" on public.library_topics
for select using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.library_courses c
    where c.id = course_id
      and (
        c.visibility = 'public'
        or exists (
          select 1
          from public.library_shares ls
          where ls.course_id = c.id
            and ls.recipient_user_id = auth.uid()
        )
      )
  )
);

drop policy if exists "library topics own write" on public.library_topics;
create policy "library topics own insert" on public.library_topics
for insert with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.library_courses c
    where c.id = course_id and c.user_id = auth.uid()
  )
);
create policy "library topics own update" on public.library_topics
for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "library topics own delete" on public.library_topics
for delete using (user_id = auth.uid());

drop policy if exists "library notes own" on public.library_topic_notes;
create policy "library notes visible through shared course" on public.library_topic_notes
for select using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.library_topics t
    join public.library_courses c on c.id = t.course_id
    where t.id = topic_id
      and (
        c.visibility = 'public'
        or exists (
          select 1
          from public.library_shares ls
          where ls.course_id = c.id
            and ls.recipient_user_id = auth.uid()
        )
      )
  )
);
create policy "library notes own insert" on public.library_topic_notes
for insert with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.library_topics t
    join public.library_courses c on c.id = t.course_id
    where t.id = topic_id and c.user_id = auth.uid()
  )
);
create policy "library notes own update" on public.library_topic_notes
for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "library notes own delete" on public.library_topic_notes
for delete using (user_id = auth.uid());

drop policy if exists "library flashcards own" on public.library_topic_flashcards;
create policy "library flashcards visible through shared course" on public.library_topic_flashcards
for select using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.library_topics t
    join public.library_courses c on c.id = t.course_id
    where t.id = topic_id
      and (
        c.visibility = 'public'
        or exists (
          select 1
          from public.library_shares ls
          where ls.course_id = c.id
            and ls.recipient_user_id = auth.uid()
        )
      )
  )
);
create policy "library flashcards own insert" on public.library_topic_flashcards
for insert with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.library_topics t
    join public.library_courses c on c.id = t.course_id
    where t.id = topic_id and c.user_id = auth.uid()
  )
);
create policy "library flashcards own update" on public.library_topic_flashcards
for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "library flashcards own delete" on public.library_topic_flashcards
for delete using (user_id = auth.uid());

insert into storage.buckets (id, name, public)
values ('chat-media', 'chat-media', false)
on conflict (id) do nothing;

create policy "chat media participant read" on storage.objects
for select using (
  bucket_id = 'chat-media'
  and exists (
    select 1
    from public.chat_threads ct
    join public.chat_participants cp on cp.thread_id = ct.id
    where ct.id::text = (storage.foldername(name))[1]
      and cp.user_id = auth.uid()
      and ct.expires_at > now()
  )
);

create policy "chat media participant upload" on storage.objects
for insert with check (
  bucket_id = 'chat-media'
  and auth.uid()::text = (storage.foldername(name))[2]
  and exists (
    select 1
    from public.chat_threads ct
    join public.chat_participants cp on cp.thread_id = ct.id
    where ct.id::text = (storage.foldername(name))[1]
      and cp.user_id = auth.uid()
      and ct.expires_at > now()
  )
);
