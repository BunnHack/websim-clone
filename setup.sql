/**
 * DATABASE SCHEMA FOR WEBSIM CLONE
 * Run this in your Supabase SQL Editor to set up the necessary tables.
 */

-- Projects Table
create table websim_projects (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  author text default '@Anonymous',
  thumbnail text,
  is_public boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Versions Table
create table websim_versions (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references websim_projects(id) on delete cascade,
  prompt text,
  code text,
  summary text,
  stats jsonb,
  file_contents jsonb,
  created_at timestamp with time zone default now()
);

-- Assets Table
create table websim_assets (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references websim_projects(id) on delete cascade,
  name text not null,
  content text,
  type text,
  size text,
  updated_at timestamp with time zone default now(),
  unique(project_id, name)
);

-- Enable Row Level Security (RLS)
alter table websim_projects enable row level security;
alter table websim_versions enable row level security;
alter table websim_assets enable row level security;

-- Create Policies (Permissive for development with Anon Key)
create policy "Public Access - Projects" on websim_projects for all using (true) with check (true);
create policy "Public Access - Versions" on websim_versions for all using (true) with check (true);
create policy "Public Access - Assets" on websim_assets for all using (true) with check (true);

-- Comments Table
create table websim_comments (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references websim_projects(id) on delete cascade,
  author text default '@Anonymous',
  content text not null,
  created_at timestamp with time zone default now()
);

alter table websim_comments enable row level security;
create policy "Public Access - Comments" on websim_comments for all using (true) with check (true);