-- Touchie schema. The project document in `projects.schema` is the source of truth
-- the canvas edits. Pages and components are also stored as rows for querying.
-- Enable anonymous sign-in if you want the app to sync without a password.

create extension if not exists "pgcrypto";

create table if not exists public.projects (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  creation_type text not null,
  schema jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pages (
  project_id uuid not null references public.projects (id) on delete cascade,
  id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  sort_index int not null default 0,
  width int not null,
  height int not null,
  background text not null,
  primary key (project_id, id)
);

create table if not exists public.components (
  project_id uuid not null references public.projects (id) on delete cascade,
  id text not null,
  page_id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null,
  name text not null,
  frame jsonb not null,
  style jsonb not null,
  props jsonb not null default '{}'::jsonb,
  z_index int not null default 0,
  primary key (project_id, id)
);

create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid references public.projects (id) on delete cascade,
  path text not null,
  mime text,
  created_at timestamptz not null default now()
);

create table if not exists public.project_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  label text,
  snapshot jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.published_projects (
  slug text primary key,
  project_id uuid references public.projects (id) on delete set null,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  snapshot jsonb not null,
  published_at timestamptz not null default now()
);

alter table public.projects enable row level security;
alter table public.pages enable row level security;
alter table public.components enable row level security;
alter table public.assets enable row level security;
alter table public.project_versions enable row level security;
alter table public.ai_conversations enable row level security;
alter table public.published_projects enable row level security;

create policy "own projects" on public.projects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own pages" on public.pages
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own components" on public.components
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own assets" on public.assets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own versions" on public.project_versions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own conversations" on public.ai_conversations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own or public shares" on public.published_projects
  for select using (true);
create policy "own shares write" on public.published_projects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('assets', 'assets', true)
on conflict (id) do nothing;

create policy "own storage objects" on storage.objects
  for all using (bucket_id = 'assets' and auth.uid()::text = (storage.foldername(name))[1])
  with check (bucket_id = 'assets' and auth.uid()::text = (storage.foldername(name))[1]);
