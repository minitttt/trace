create extension if not exists "pgcrypto";

create type public.lesson_status as enum ('queued', 'processing', 'complete', 'failed');
create type public.processing_stage as enum ('uploading', 'reading_source', 'extracting_content', 'creating_material', 'preparing_tutor', 'complete');
create type public.source_type as enum ('video', 'pdf');
create type public.chat_role as enum ('user', 'assistant');

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Untitled lesson',
  source_type public.source_type not null,
  source_path text,
  public_url text,
  goal text not null,
  difficulty text not null,
  audience text not null,
  output_language text not null default 'English',
  status public.lesson_status not null default 'queued',
  processing_stage public.processing_stage not null default 'uploading',
  processing_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lessons_source_check check ((source_path is not null) <> (public_url is not null))
);

create table public.lesson_content (
  lesson_id uuid primary key references public.lessons(id) on delete cascade,
  title text not null,
  summary text not null,
  transcript jsonb not null default '[]'::jsonb,
  chapters jsonb not null default '[]'::jsonb,
  key_concepts jsonb not null default '[]'::jsonb,
  important_examples jsonb not null default '[]'::jsonb,
  learning_material jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.lesson_chat_messages (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.chat_role not null,
  content text not null,
  created_at timestamptz not null default now()
);

create index lessons_user_created_idx on public.lessons(user_id, created_at desc);
create index chat_messages_lesson_created_idx on public.lesson_chat_messages(lesson_id, created_at asc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger lessons_set_updated_at before update on public.lessons
for each row execute procedure public.set_updated_at();

create trigger lesson_content_set_updated_at before update on public.lesson_content
for each row execute procedure public.set_updated_at();

alter table public.lessons enable row level security;
alter table public.lesson_content enable row level security;
alter table public.lesson_chat_messages enable row level security;

create policy "Users can view their lessons" on public.lessons
for select using (auth.uid() = user_id);
create policy "Users can create their lessons" on public.lessons
for insert with check (auth.uid() = user_id);
create policy "Users can update their lessons" on public.lessons
for update using (auth.uid() = user_id);
create policy "Users can delete their lessons" on public.lessons
for delete using (auth.uid() = user_id);

create policy "Users can view their lesson content" on public.lesson_content
for select using (exists (select 1 from public.lessons where lessons.id = lesson_content.lesson_id and lessons.user_id = auth.uid()));
create policy "Users can create their lesson content" on public.lesson_content
for insert with check (exists (select 1 from public.lessons where lessons.id = lesson_content.lesson_id and lessons.user_id = auth.uid()));
create policy "Users can update their lesson content" on public.lesson_content
for update using (exists (select 1 from public.lessons where lessons.id = lesson_content.lesson_id and lessons.user_id = auth.uid()));
create policy "Users can delete their lesson content" on public.lesson_content
for delete using (exists (select 1 from public.lessons where lessons.id = lesson_content.lesson_id and lessons.user_id = auth.uid()));

create policy "Users can view their chat" on public.lesson_chat_messages
for select using (auth.uid() = user_id);
create policy "Users can create their chat" on public.lesson_chat_messages
for insert with check (
  auth.uid() = user_id and
  exists (select 1 from public.lessons where lessons.id = lesson_chat_messages.lesson_id and lessons.user_id = auth.uid())
);
create policy "Users can delete their chat" on public.lesson_chat_messages
for delete using (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('sources', 'sources', false)
on conflict (id) do nothing;

update storage.buckets
set public = false,
    file_size_limit = 524288000,
    allowed_mime_types = array['video/mp4', 'video/quicktime', 'video/webm', 'application/pdf']::text[]
where id = 'sources';

create policy "Users can upload their sources" on storage.objects
for insert to authenticated
with check (bucket_id = 'sources' and (storage.foldername(name))[1] = (auth.uid())::text);

create policy "Users can read their sources" on storage.objects
for select to authenticated
using (bucket_id = 'sources' and (storage.foldername(name))[1] = (auth.uid())::text);

create policy "Users can delete their sources" on storage.objects
for delete to authenticated
using (bucket_id = 'sources' and (storage.foldername(name))[1] = (auth.uid())::text);
