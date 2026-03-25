import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

// Display → DB enum
const STATUT_DB: Record<string, string> = {
  brouillon: "brouillon",
  envoyé: "envoye",
  accepté: "accepte",
  refusé: "refuse",
  "en attente": "expire",
};

// DB → Display
const STATUT_DISPLAY: Record<string, string> = {
  brouillon: "brouillon",
  envoye: "envoyé",
  accepte: "accepté",
  refuse: "refusé",
  expire: "en attente",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

interface LignePayload {
  quantite: number;
  prix_unitaire: number;
  tva: number;
  [key: string]: unknown;
}

/** Recalcule les montants côté serveur à partir des lignes + remise. */
function computeTotals(lignes: LignePayload[], remisePercent: number) {
  const htBrut = lignes.reduce((s, l) => s + Number(l.quantite) * Number(l.prix_unitaire), 0);
  const remise  = htBrut * (remisePercent / 100);
  const htNet   = htBrut - remise;
  const df      = 1 - remisePercent / 100; // discount factor
  const tva     = lignes.reduce(
    (s, l) => s + Number(l.quantite) * Number(l.prix_unitaire) * df * (Number(l.tva) / 100),
    0,
  );
  return { montant_ht: htNet, montant_tva: tva, montant_ttc: htNet + tva };
}

/** GET /api/devis/[id] — données complètes pour la modale d'édition */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { data, error } = await supabase
      .from("devis")
      .select("*, clients(id, nom, prenom, raison_sociale, email, type)")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single();

    if (error || !data) return NextResponse.json({ error: "Non trouvé" }, { status: 404 });

    return NextResponse.json({
      devis: {
        ...data,
        statut: STATUT_DISPLAY[data.statut] ?? data.statut,
      },
    });
  } catch (err) {
    console.error("[devis/[id]/GET]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

/** PATCH /api/devis/[id] — mise à jour partielle ou complète */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const body = await req.json();
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    // Champs simples
    if (body.objet              !== undefined) updates.objet              = body.objet;
    if (body.notes              !== undefined) updates.notes              = body.notes;
    if (body.statut             !== undefined) updates.statut             = STATUT_DB[body.statut] ?? body.statut;
    if (body.client_id          !== undefined) updates.client_id          = body.client_id;
    if (body.date_emission      !== undefined) updates.date_emission      = body.date_emission;
    if (body.date_validite      !== undefined) updates.date_validite      = body.date_validite;
    if (body.conditions_paiement !== undefined) updates.conditions_paiement = body.conditions_paiement ?? null;

    // Remise + acompte (avec clamp côté serveur)
    const remisePercent = body.remise_percent !== undefined
      ? Math.min(100, Math.max(0, Number(body.remise_percent)))
      : undefined;
    const acompte = body.acompte !== undefined
      ? Math.max(0, Number(body.acompte))
      : undefined;
    if (remisePercent !== undefined) updates.remise_percent = remisePercent;
    if (acompte       !== undefined) updates.acompte        = acompte;

    // Lignes + montants recalculés côté serveur
    if (body.lignes !== undefined) {
      updates.lignes = body.lignes;
      const rp = remisePercent ?? 0;
      const computed = computeTotals(body.lignes as LignePayload[], rp);
      updates.montant_ht  = computed.montant_ht;
      updates.montant_tva = computed.montant_tva;
      updates.montant_ttc = computed.montant_ttc;
    }

    console.log("[devis/PATCH]", params.id, Object.keys(updates));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rawData, error } = await supabase
      .from("devis")
      .update(updates)
      .eq("id", params.id)
      .eq("user_id", user.id)
      .select("*")
      .single() as unknown as { data: Record<string, unknown>; error: unknown };

    if (error) throw error;
    const data = rawData as Record<string, unknown>;

    const restantAPayer = Math.max(0, (Number(data.montant_ttc) || 0) - (Number(data.acompte) || 0));

    return NextResponse.json({
      devis: {
        ...data,
        statut: STATUT_DISPLAY[String(data.statut)] ?? data.statut,
        montant: `${Math.round(Number(data.montant_ht) || 0).toLocaleString("fr-FR")} €`,
        date: formatDate(String(data.date_emission)),
        validite: formatDate(String(data.date_validite)),
        restant_a_payer: `${Math.round(restantAPayer).toLocaleString("fr-FR")} €`,
      },
    });
  } catch (err) {
    console.error("[devis/[id]/PATCH]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
