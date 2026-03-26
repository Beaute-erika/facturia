-- ─── Bons de commande ────────────────────────────────────────────────────────

create type bon_commande_statut as enum ('brouillon', 'envoye', 'confirme', 'annule');

create table if not exists bons_de_commande (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references users(id) on delete cascade,
  numero               text not null,
  client_nom           text not null,
  client_email         text,
  objet                text not null,
  lignes               jsonb not null default '[]',
  taux_tva             numeric(5,2) not null default 20,
  montant_ht           numeric(12,2) not null default 0,
  montant_tva          numeric(12,2) not null default 0,
  montant_ttc          numeric(12,2) not null default 0,
  date_emission        date not null default current_date,
  date_livraison_prevue date,
  statut               bon_commande_statut not null default 'brouillon',
  notes                text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

alter table bons_de_commande enable row level security;

create policy "bons_de_commande: owner access"
  on bons_de_commande for all
  using  (user_id = auth.uid())
  with check (user_id = auth.uid());

create trigger set_updated_at
  before update on bons_de_commande
  for each row execute function set_updated_at();
