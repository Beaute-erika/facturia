-- ─── Factures pro forma ──────────────────────────────────────────────────────

create type pro_forma_statut as enum ('brouillon', 'envoye', 'accepte', 'refuse', 'expire');

create table if not exists factures_pro_forma (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references users(id) on delete cascade,
  numero          text not null,
  client_nom      text not null,
  client_email    text,
  objet           text not null,
  lignes          jsonb not null default '[]',
  taux_tva        numeric(5,2) not null default 20,
  montant_ht      numeric(12,2) not null default 0,
  montant_tva     numeric(12,2) not null default 0,
  montant_ttc     numeric(12,2) not null default 0,
  date_emission   date not null default current_date,
  date_validite   date,
  statut          pro_forma_statut not null default 'brouillon',
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table factures_pro_forma enable row level security;

create policy "factures_pro_forma: owner access"
  on factures_pro_forma for all
  using  (user_id = auth.uid())
  with check (user_id = auth.uid());

create trigger set_updated_at
  before update on factures_pro_forma
  for each row execute function set_updated_at();
