-- ─── Bons de livraison ───────────────────────────────────────────────────────

create type bon_livraison_statut as enum ('brouillon', 'envoye', 'livre', 'annule');

create table if not exists bons_de_livraison (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references users(id) on delete cascade,
  numero          text not null,
  client_nom      text not null,
  client_email    text,
  objet           text not null,
  lignes          jsonb not null default '[]',
  date_emission   date not null default current_date,
  date_livraison  date,
  statut          bon_livraison_statut not null default 'brouillon',
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table bons_de_livraison enable row level security;

create policy "bons_de_livraison: owner access"
  on bons_de_livraison for all
  using  (user_id = auth.uid())
  with check (user_id = auth.uid());

create trigger set_updated_at
  before update on bons_de_livraison
  for each row execute function set_updated_at();
