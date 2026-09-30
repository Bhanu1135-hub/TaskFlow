create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  project text not null default 'Inbox',
  priority text not null default 'Medium' check (priority in ('High', 'Medium', 'Low')),
  status text not null default 'Todo' check (status in ('Todo', 'In progress', 'Done')),
  due text not null default 'Today',
  created_at timestamptz not null default now()
);

create index tasks_user_created_at_idx on public.tasks (user_id, created_at desc);

alter table public.tasks enable row level security;

grant select, insert, update, delete on public.tasks to authenticated;

create policy "Users can read their own tasks"
  on public.tasks for select to authenticated
  using (auth.uid() = user_id);

create policy "Users can create their own tasks"
  on public.tasks for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own tasks"
  on public.tasks for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own tasks"
  on public.tasks for delete to authenticated
  using (auth.uid() = user_id);
