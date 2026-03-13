-- Motivation Companion — Initial Schema
-- Run this in Supabase SQL Editor after creating the project

-- ============================================================
-- USERS PROFILE (extends Supabase auth.users)
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  stripe_customer_id text unique,
  subscription_status text default 'none' check (subscription_status in ('none', 'trialing', 'active', 'past_due', 'canceled', 'unpaid')),
  subscription_plan text check (subscription_plan in ('annual', 'monthly')),
  subscription_id text,
  trial_ends_at timestamptz,
  coaching_style text,
  checkin_time text,
  priority_area text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- ONBOARDING DATA
-- ============================================================
create table public.onboarding_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  bring_you_here text,
  look_like text[] default '{}',
  obstacles text[] default '{}',
  tried_before text[] default '{}',
  vision text,
  checkin_time text,
  priority_area text,
  coaching_style text,
  completed_at timestamptz default now()
);

-- ============================================================
-- CONVERSATIONS
-- ============================================================
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  mode text not null check (mode in ('text', 'voice')),
  started_at timestamptz default now(),
  ended_at timestamptz,
  message_count int default 0
);

-- ============================================================
-- MESSAGES
-- ============================================================
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz default now()
);

-- ============================================================
-- ACTION PLANS (extracted by Sam)
-- ============================================================
create table public.action_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete set null,
  vision_statement text,
  recommended_first_step text,
  created_at timestamptz default now()
);

-- ============================================================
-- TASKS (persistent, user-managed)
-- ============================================================
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  action_plan_id uuid references public.action_plans(id) on delete set null,
  list_type text not null check (list_type in ('issue', 'goal', 'task')),
  title text not null,
  timeframe text,
  status text default 'active' check (status in ('active', 'completed', 'snoozed', 'dismissed')),
  rank int default 0,
  theme text,
  urgency text check (urgency in ('high', 'medium', 'low')),
  importance text check (importance in ('high', 'medium', 'low')),
  completed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- DAILY CHECK-INS
-- ============================================================
create table public.checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete set null,
  checkin_date date not null default current_date,
  tasks_reviewed int default 0,
  tasks_completed int default 0,
  mood text,
  notes text,
  created_at timestamptz default now(),
  unique(user_id, checkin_date)
);

-- ============================================================
-- PUSH SUBSCRIPTIONS (for web push notifications)
-- ============================================================
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz default now(),
  unique(user_id, endpoint)
);

-- ============================================================
-- INDEXES
-- ============================================================
create index idx_conversations_user on public.conversations(user_id, started_at desc);
create index idx_messages_conversation on public.messages(conversation_id, created_at);
create index idx_tasks_user_status on public.tasks(user_id, status);
create index idx_tasks_user_list on public.tasks(user_id, list_type, rank);
create index idx_checkins_user_date on public.checkins(user_id, checkin_date desc);
create index idx_profiles_stripe on public.profiles(stripe_customer_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles enable row level security;
alter table public.onboarding_responses enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.action_plans enable row level security;
alter table public.tasks enable row level security;
alter table public.checkins enable row level security;
alter table public.push_subscriptions enable row level security;

-- Users can only read/write their own data
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

create policy "Users can view own onboarding" on public.onboarding_responses for select using (auth.uid() = user_id);
create policy "Users can insert own onboarding" on public.onboarding_responses for insert with check (auth.uid() = user_id);

create policy "Users can view own conversations" on public.conversations for select using (auth.uid() = user_id);
create policy "Users can insert own conversations" on public.conversations for insert with check (auth.uid() = user_id);
create policy "Users can update own conversations" on public.conversations for update using (auth.uid() = user_id);

create policy "Users can view own messages" on public.messages for select using (
  conversation_id in (select id from public.conversations where user_id = auth.uid())
);
create policy "Users can insert own messages" on public.messages for insert with check (
  conversation_id in (select id from public.conversations where user_id = auth.uid())
);

create policy "Users can view own action plans" on public.action_plans for select using (auth.uid() = user_id);
create policy "Users can insert own action plans" on public.action_plans for insert with check (auth.uid() = user_id);

create policy "Users can view own tasks" on public.tasks for select using (auth.uid() = user_id);
create policy "Users can insert own tasks" on public.tasks for insert with check (auth.uid() = user_id);
create policy "Users can update own tasks" on public.tasks for update using (auth.uid() = user_id);
create policy "Users can delete own tasks" on public.tasks for delete using (auth.uid() = user_id);

create policy "Users can view own checkins" on public.checkins for select using (auth.uid() = user_id);
create policy "Users can insert own checkins" on public.checkins for insert with check (auth.uid() = user_id);
create policy "Users can update own checkins" on public.checkins for update using (auth.uid() = user_id);

create policy "Users can view own push subs" on public.push_subscriptions for select using (auth.uid() = user_id);
create policy "Users can insert own push subs" on public.push_subscriptions for insert with check (auth.uid() = user_id);
create policy "Users can delete own push subs" on public.push_subscriptions for delete using (auth.uid() = user_id);

-- ============================================================
-- TRIGGER: auto-create profile on signup
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- TRIGGER: update updated_at timestamps
-- ============================================================
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.update_updated_at();

create trigger tasks_updated_at before update on public.tasks
  for each row execute function public.update_updated_at();
