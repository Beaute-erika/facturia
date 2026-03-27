-- ─── Document cross-references ───────────────────────────────────────────────

-- devis can produce a facture or a bon_de_commande
alter table devis
  add column if not exists facture_id uuid references factures(id) on delete set null,
  add column if not exists bon_commande_id uuid references bons_de_commande(id) on delete set null;

-- factures can be produced from devis, pro forma, or bon de livraison
alter table factures
  add column if not exists devis_id uuid references devis(id) on delete set null,
  add column if not exists pro_forma_id uuid references factures_pro_forma(id) on delete set null,
  add column if not exists bon_livraison_id uuid references bons_de_livraison(id) on delete set null;

-- bons_de_commande can come from a devis
alter table bons_de_commande
  add column if not exists devis_id uuid references devis(id) on delete set null;

-- bons_de_livraison can come from a bon_de_commande
alter table bons_de_livraison
  add column if not exists bon_commande_id uuid references bons_de_commande(id) on delete set null;
