-- ─── Agent actions log ───────────────────────────────────────────────────────

create table if not exists agent_actions_log (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  action_type text not null,
  target_type text,
  target_id   text,
  metadata    jsonb,
  created_at  timestamptz not null default now()
);

alter table agent_actions_log enable row level security;

create policy "agent_actions_log: owner access"
  on agent_actions_log for all
  using  (user_id = auth.uid())
  with check (user_id = auth.uid());
