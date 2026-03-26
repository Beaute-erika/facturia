-- ─── Factures récurrentes ─────────────────────────────────────────────────────

create type recurrence_periodicite as enum ('mensuelle', 'trimestrielle', 'semestrielle', 'annuelle');
create type recurrence_statut as enum ('actif', 'suspendu', 'termine');

create table if not exists factures_recurrentes (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references users(id) on delete cascade,
  client_nom            text not null,
  client_email          text,
  objet                 text not null,
  lignes                jsonb not null default '[]',
  taux_tva              numeric(5,2) not null default 20,
  montant_ht            numeric(12,2) not null default 0,
  montant_tva           numeric(12,2) not null default 0,
  montant_ttc           numeric(12,2) not null default 0,
  periodicite           recurrence_periodicite not null default 'mensuelle',
  date_debut            date not null default current_date,
  date_fin              date,
  prochaine_generation  date not null default current_date,
  statut                recurrence_statut not null default 'actif',
  notes                 text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- RLS
alter table factures_recurrentes enable row level security;

create policy "factures_recurrentes: owner access"
  on factures_recurrentes for all
  using  (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Auto-update updated_at
create trigger set_updated_at
  before update on factures_recurrentes
  for each row execute function set_updated_at();
