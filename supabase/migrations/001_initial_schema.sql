-- ═══════════════════════════════════════════════════════════════════════════
-- Facturia — Schéma initial
-- Migration 001 — À exécuter dans Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm"; -- recherche full-text

-- ─── ENUMS ───────────────────────────────────────────────────────────────────

create type client_type    as enum ('particulier', 'professionnel');
create type client_statut  as enum ('actif', 'inactif', 'prospect');
create type devis_statut   as enum ('brouillon', 'envoye', 'accepte', 'refuse', 'expire');
create type facture_statut as enum ('brouillon', 'envoyee', 'payee', 'en_retard', 'annulee');
create type chantier_statut as enum ('planifie', 'en_cours', 'termine', 'suspendu');
create type avis_statut    as enum ('sans_reponse', 'repondu', 'signale');
create type auto_type      as enum ('relance_devis', 'relance_facture', 'rapport_hebdo', 'alerte_retard', 'confirmation_client');
create type plan_type      as enum ('starter', 'pro', 'business');

-- ─── TABLE : users (profils artisans) ────────────────────────────────────────
-- Étend auth.users de Supabase

create table public.users (
  id                uuid        primary key references auth.users(id) on delete cascade,
  email             text        not null unique,

  -- Identité
  prenom            text        not null default '',
  nom               text        not null default '',
  metier            text        not null default 'Artisan',
  raison_sociale    text,
  forme_juridique   text        not null default 'Auto-entrepreneur',

  -- Légal
  siret             text,
  tva_num           text,
  mentions_legales  text,

  -- Adresse
  adresse           text,
  code_postal       text,
  ville             text,

  -- Contact
  tel               text,
  site              text,

  -- Personnalisation
  logo_url          text,
  signature_email   text,

  -- Facturation
  devis_prefix      text        not null default 'DV',
  devis_next        integer     not null default 1,
  facture_prefix    text        not null default 'FA',
  facture_next      integer     not null default 1,
  tva_default       text        not null default '10%',
  delai_paiement    text        not null default '30 jours',
  iban              text,
  bic               text,
  penalite_retard   text,
  footer_facture    text,
  cgu               text,

  -- Abonnement
  plan              plan_type   not null default 'starter',
  stripe_customer_id text,
  stripe_sub_id     text,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Auto-créer un profil à l'inscription
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── TABLE : clients ──────────────────────────────────────────────────────────

create table public.clients (
  id              uuid          primary key default uuid_generate_v4(),
  user_id         uuid          not null references public.users(id) on delete cascade,

  type            client_type   not null default 'particulier',
  statut          client_statut not null default 'prospect',

  -- Identité
  nom             text          not null,
  prenom          text,
  raison_sociale  text,

  -- Contact
  email           text,
  tel             text,

  -- Adresse
  adresse         text,
  code_postal     text,
  ville           text,

  -- Pro
  siret           text,

  -- Métadonnées
  notes           text,
  ca_total        numeric(12,2) not null default 0,

  created_at      timestamptz   not null default now(),
  updated_at      timestamptz   not null default now()
);

create index idx_clients_user_id on public.clients(user_id);
create index idx_clients_statut  on public.clients(statut);

-- ─── TABLE : devis ────────────────────────────────────────────────────────────

create table public.devis (
  id              uuid          primary key default uuid_generate_v4(),
  user_id         uuid          not null references public.users(id) on delete cascade,
  client_id       uuid          not null references public.clients(id) on delete restrict,

  numero          text          not null,
  statut          devis_statut  not null default 'brouillon',
  objet           text          not null default '',

  date_emission   date          not null default current_date,
  date_validite   date          not null default (current_date + interval '30 days'),

  -- Lignes : [{id, description, quantite, unite, prix_unitaire, tva, total_ht}]
  lignes          jsonb         not null default '[]',

  tva_rate        numeric(5,2)  not null default 10,
  montant_ht      numeric(12,2) not null default 0,
  montant_tva     numeric(12,2) not null default 0,
  montant_ttc     numeric(12,2) not null default 0,

  notes           text,
  chorus_pro      boolean       not null default false,
  pdf_url         text,

  created_at      timestamptz   not null default now(),
  updated_at      timestamptz   not null default now(),

  unique(user_id, numero)
);

create index idx_devis_user_id   on public.devis(user_id);
create index idx_devis_client_id on public.devis(client_id);
create index idx_devis_statut    on public.devis(statut);

-- ─── TABLE : factures ─────────────────────────────────────────────────────────

create table public.factures (
  id                    uuid            primary key default uuid_generate_v4(),
  user_id               uuid            not null references public.users(id) on delete cascade,
  client_id             uuid            not null references public.clients(id) on delete restrict,
  devis_id              uuid            references public.devis(id) on delete set null,

  numero                text            not null,
  statut                facture_statut  not null default 'brouillon',
  objet                 text            not null default '',

  date_emission         date            not null default current_date,
  date_echeance         date            not null,
  date_paiement         date,

  -- Lignes identiques aux devis
  lignes                jsonb           not null default '[]',

  tva_rate              numeric(5,2)    not null default 10,
  montant_ht            numeric(12,2)   not null default 0,
  montant_tva           numeric(12,2)   not null default 0,
  montant_ttc           numeric(12,2)   not null default 0,

  notes                 text,
  chorus_pro            boolean         not null default false,
  num_engagement_chorus text,
  pdf_url               text,

  created_at            timestamptz     not null default now(),
  updated_at            timestamptz     not null default now(),

  unique(user_id, numero)
);

create index idx_factures_user_id   on public.factures(user_id);
create index idx_factures_client_id on public.factures(client_id);
create index idx_factures_statut    on public.factures(statut);
create index idx_factures_echeance  on public.factures(date_echeance);

-- Mise à jour auto du statut en_retard
create or replace function public.check_factures_retard()
returns void language sql security definer as $$
  update public.factures
  set statut = 'en_retard', updated_at = now()
  where statut = 'envoyee'
    and date_echeance < current_date;
$$;

-- ─── TABLE : chantiers ────────────────────────────────────────────────────────

create table public.chantiers (
  id                uuid            primary key default uuid_generate_v4(),
  user_id           uuid            not null references public.users(id) on delete cascade,
  client_id         uuid            not null references public.clients(id) on delete restrict,

  titre             text            not null,
  description       text,
  statut            chantier_statut not null default 'planifie',

  date_debut        date,
  date_fin_prevue   date,
  date_fin_reelle   date,
  adresse_chantier  text,

  progression       integer         not null default 0 check (progression between 0 and 100),
  budget_prevu      numeric(12,2),
  budget_reel       numeric(12,2),

  -- Étapes : [{id, titre, description, categorie, done, date_prevue}]
  etapes            jsonb           not null default '[]',
  -- Notes : [{id, contenu, created_at}]
  notes             jsonb           not null default '[]',

  created_at        timestamptz     not null default now(),
  updated_at        timestamptz     not null default now()
);

create index idx_chantiers_user_id   on public.chantiers(user_id);
create index idx_chantiers_client_id on public.chantiers(client_id);
create index idx_chantiers_statut    on public.chantiers(statut);

-- ─── TABLE : avis_google ──────────────────────────────────────────────────────

create table public.avis_google (
  id              uuid        primary key default uuid_generate_v4(),
  user_id         uuid        not null references public.users(id) on delete cascade,

  auteur          text        not null,
  note            smallint    not null check (note between 1 and 5),
  contenu         text        not null default '',
  date_avis       date        not null default current_date,

  reponse         text,
  date_reponse    date,
  statut          avis_statut not null default 'sans_reponse',

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_avis_user_id on public.avis_google(user_id);
create index idx_avis_statut  on public.avis_google(statut);

-- ─── TABLE : automatisations ──────────────────────────────────────────────────

create table public.automatisations (
  id                  uuid        primary key default uuid_generate_v4(),
  user_id             uuid        not null references public.users(id) on delete cascade,

  type                auto_type   not null,
  actif               boolean     not null default true,

  -- Config : {delai_jours, canal, template, heure, jour_semaine}
  config              jsonb       not null default '{}',

  derniere_execution  timestamptz,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  unique(user_id, type)
);

create index idx_auto_user_id on public.automatisations(user_id);

-- ─── UPDATED_AT trigger (partagé) ────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.users
  for each row execute procedure public.set_updated_at();
create trigger set_updated_at before update on public.clients
  for each row execute procedure public.set_updated_at();
create trigger set_updated_at before update on public.devis
  for each row execute procedure public.set_updated_at();
create trigger set_updated_at before update on public.factures
  for each row execute procedure public.set_updated_at();
create trigger set_updated_at before update on public.chantiers
  for each row execute procedure public.set_updated_at();
create trigger set_updated_at before update on public.avis_google
  for each row execute procedure public.set_updated_at();
create trigger set_updated_at before update on public.automatisations
  for each row execute procedure public.set_updated_at();

-- ─── ROW LEVEL SECURITY ───────────────────────────────────────────────────────
-- Chaque artisan ne voit que ses propres données

alter table public.users           enable row level security;
alter table public.clients         enable row level security;
alter table public.devis           enable row level security;
alter table public.factures        enable row level security;
alter table public.chantiers       enable row level security;
alter table public.avis_google     enable row level security;
alter table public.automatisations enable row level security;

-- users : lecture/écriture uniquement de son propre profil
create policy "users: own profile" on public.users
  for all using (auth.uid() = id);

-- clients
create policy "clients: own data" on public.clients
  for all using (auth.uid() = user_id);

-- devis
create policy "devis: own data" on public.devis
  for all using (auth.uid() = user_id);

-- factures
create policy "factures: own data" on public.factures
  for all using (auth.uid() = user_id);

-- chantiers
create policy "chantiers: own data" on public.chantiers
  for all using (auth.uid() = user_id);

-- avis_google
create policy "avis: own data" on public.avis_google
  for all using (auth.uid() = user_id);

-- automatisations
create policy "auto: own data" on public.automatisations
  for all using (auth.uid() = user_id);

-- ─── AUTOMATISATIONS PAR DÉFAUT ───────────────────────────────────────────────
-- Insérées à la création du profil artisan

create or replace function public.create_default_automatisations()
returns trigger language plpgsql security definer as $$
begin
  insert into public.automatisations (user_id, type, actif, config) values
    (new.id, 'relance_devis',        true,  '{"delai_jours": 7,  "canal": "email"}'),
    (new.id, 'relance_facture',      true,  '{"delai_jours": 1,  "canal": "email"}'),
    (new.id, 'rapport_hebdo',        true,  '{"canal": "email",  "heure": "08:00", "jour_semaine": 1}'),
    (new.id, 'alerte_retard',        true,  '{"delai_jours": 0,  "canal": "email"}'),
    (new.id, 'confirmation_client',  true,  '{"canal": "email"}');
  return new;
end;
$$;

create trigger on_user_created_setup_auto
  after insert on public.users
  for each row execute procedure public.create_default_automatisations();

-- ─── VUES UTILES ──────────────────────────────────────────────────────────────

-- Vue : factures avec nom du client
create view public.factures_with_client as
  select f.*, c.nom as client_nom, c.prenom as client_prenom,
         c.raison_sociale, c.type as client_type, c.email as client_email
  from public.factures f
  join public.clients c on c.id = f.client_id;

-- Vue : devis avec nom du client
create view public.devis_with_client as
  select d.*, c.nom as client_nom, c.prenom as client_prenom,
         c.raison_sociale, c.type as client_type, c.email as client_email
  from public.devis d
  join public.clients c on c.id = d.client_id;

-- Vue : CA par mois (12 derniers mois)
create view public.ca_mensuel as
  select
    user_id,
    date_trunc('month', date_emission) as mois,
    sum(montant_ttc) filter (where statut = 'payee')  as ca_encaisse,
    sum(montant_ttc) filter (where statut != 'annulee') as ca_facture,
    count(*) as nb_factures
  from public.factures
  where date_emission >= now() - interval '12 months'
  group by user_id, date_trunc('month', date_emission)
  order by mois;
