-- ─── Document sequences ──────────────────────────────────────────────────────

create table if not exists document_sequences (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references users(id) on delete cascade,
  type           text not null,
  year           int not null,
  current_number int not null default 0,
  created_at     timestamptz not null default now(),
  constraint document_sequences_user_type_year_key unique (user_id, type, year)
);

alter table document_sequences enable row level security;

create policy "document_sequences: owner access"
  on document_sequences for all
  using  (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Atomic increment function
create or replace function get_next_document_number(
  p_user_id uuid,
  p_type    text,
  p_year    int
) returns int language plpgsql security definer as $$
declare
  next_num int;
begin
  insert into document_sequences (user_id, type, year, current_number)
  values (p_user_id, p_type, p_year, 1)
  on conflict (user_id, type, year)
  do update set current_number = document_sequences.current_number + 1
  returning current_number into next_num;
  return next_num;
end;
$$;
