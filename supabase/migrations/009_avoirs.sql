-- ─── Avoirs (credit notes) ───────────────────────────────────────────────────

create type avoir_statut as enum ('brouillon', 'emis', 'annule');

create table if not exists avoirs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references users(id) on delete cascade,
  facture_id      uuid references factures(id) on delete set null,
  numero          text not null,
  client_nom      text not null,
  client_email    text,
  objet           text not null,
  motif           text,
  lignes          jsonb not null default '[]',
  taux_tva        numeric(5,2) not null default 20,
  montant_ht      numeric(12,2) not null default 0,
  montant_tva     numeric(12,2) not null default 0,
  montant_ttc     numeric(12,2) not null default 0,
  date_emission   date not null default current_date,
  statut          avoir_statut not null default 'brouillon',
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- RLS
alter table avoirs enable row level security;

create policy "avoirs: owner access"
  on avoirs for all
  using  (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Auto-update updated_at
create trigger set_updated_at
  before update on avoirs
  for each row execute function set_updated_at();
