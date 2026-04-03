-- Clara Portal: Initial Schema
-- Run this in your Supabase SQL Editor

-- ===========================================
-- 1. PROFILES TABLE
-- ===========================================
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'client' check (role in ('admin', 'client')),
  created_at timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    'client'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ===========================================
-- 2. CLIENT CONFIGS TABLE
-- ===========================================
create table public.client_configs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  admin_id uuid not null references public.profiles(id) on delete cascade,
  project_name text not null default 'My Project',
  system_prompt text not null default 'You are Clara, a helpful AI assistant.',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(client_id)
);

-- ===========================================
-- 3. CONVERSATIONS TABLE
-- ===========================================
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default 'New Conversation',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ===========================================
-- 4. MESSAGES TABLE
-- ===========================================
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  created_at timestamptz not null default now()
);

-- Index for fast message retrieval
create index idx_messages_conversation_id on public.messages(conversation_id);
create index idx_messages_created_at on public.messages(created_at);
create index idx_conversations_client_id on public.conversations(client_id);

-- ===========================================
-- 5. AUTO-UPDATE updated_at
-- ===========================================
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_client_configs_updated_at
  before update on public.client_configs
  for each row execute function public.update_updated_at();

create trigger update_conversations_updated_at
  before update on public.conversations
  for each row execute function public.update_updated_at();

-- ===========================================
-- 6. ROW LEVEL SECURITY
-- ===========================================

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.client_configs enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- Helper: check if current user is admin
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$ language plpgsql security definer;

-- PROFILES
create policy "Users can read own profile"
  on public.profiles for select
  using (id = auth.uid());

create policy "Admins can read all profiles"
  on public.profiles for select
  using (public.is_admin());

-- CLIENT CONFIGS
create policy "Admins can manage client configs"
  on public.client_configs for all
  using (admin_id = auth.uid());

create policy "Clients can read own config"
  on public.client_configs for select
  using (client_id = auth.uid());

-- CONVERSATIONS
create policy "Clients can manage own conversations"
  on public.conversations for all
  using (client_id = auth.uid());

create policy "Admins can read assigned client conversations"
  on public.conversations for select
  using (
    exists (
      select 1 from public.client_configs
      where client_configs.client_id = conversations.client_id
      and client_configs.admin_id = auth.uid()
    )
  );

-- MESSAGES
create policy "Clients can manage messages in own conversations"
  on public.messages for all
  using (
    exists (
      select 1 from public.conversations
      where conversations.id = messages.conversation_id
      and conversations.client_id = auth.uid()
    )
  );

create policy "Admins can read messages for assigned clients"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversations
      join public.client_configs on client_configs.client_id = conversations.client_id
      where conversations.id = messages.conversation_id
      and client_configs.admin_id = auth.uid()
    )
  );

-- ===========================================
-- 7. REALTIME (optional but useful)
-- ===========================================
-- Enable realtime for messages so admin can watch conversations live
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversations;
