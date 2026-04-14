-- ============================================================
-- 002: Task workspace
--
-- Extends tasks with description, due_date, parent_task_id so each
-- task becomes a full object with subtasks. Links conversations to
-- tasks so each task gets its own thread. Existing (global) brain-
-- dump conversation is the row with task_id IS NULL.
-- ============================================================

alter table public.tasks
  add column if not exists description text,
  add column if not exists due_date timestamptz,
  add column if not exists parent_task_id uuid
    references public.tasks(id) on delete cascade;

create index if not exists idx_tasks_parent
  on public.tasks(parent_task_id)
  where parent_task_id is not null;

alter table public.conversations
  add column if not exists task_id uuid
    references public.tasks(id) on delete cascade;

-- Distinct active thread per (user, task_id). task_id IS NULL is the
-- global brain-dump thread; anything else is a task's thread.
create index if not exists idx_conversations_user_task
  on public.conversations(user_id, task_id, started_at desc);

-- Tasks RLS already scopes by user_id, which covers subtasks since
-- they also have user_id set on insert. No new policies required.
