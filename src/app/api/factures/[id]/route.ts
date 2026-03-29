import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { enqueueChorusSend } from "@/lib/chorus-queue";
import { canUse } from "@/lib/feature-flags";
import { logInfo } from "@/lib/logger";

// Display → DB enum
const STATUT_DB: Record<string, string> = {
  brouillon: "brouillon",
  envoyée: "envoyee",
  payée: "payee",
  "en retard": "en_retard",
};

// DB → Display
const STATUT_DISPLAY: Record<string, string> = {
  brouillon: "brouillon",
  envoyee: "envoyée",
  payee: "payée",
  en_retard: "en retard",
  annulee: "brouillon",
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

/** GET /api/factures/[id] — données complètes pour la modale d'édition */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { data, error } = await supabase
      .from("factures")
      .select("*, clients(id, nom, prenom, raison_sociale, email, type)")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single();

    if (error || !data) return NextResponse.json({ error: "Non trouvé" }, { status: 404 });

    return NextResponse.json({
      facture: {
        ...data,
        statut: STATUT_DISPLAY[data.statut] ?? data.statut,
      },
    });
  } catch (err) {
    console.error("[factures/[id]/GET]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

/** PATCH /api/factures/[id] — mise à jour partielle ou complète */
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
    if (body.auto_send_chorus    !== undefined) updates.auto_send_chorus    = Boolean(body.auto_send_chorus);
    if (body.objet               !== undefined) updates.objet               = body.objet;
    if (body.notes               !== undefined) updates.notes               = body.notes;
    if (body.client_id           !== undefined) updates.client_id           = body.client_id;
    if (body.date_emission       !== undefined) updates.date_emission       = body.date_emission;
    if (body.date_echeance       !== undefined) updates.date_echeance       = body.date_echeance;
    if (body.date_paiement       !== undefined) updates.date_paiement       = body.date_paiement;
    if (body.conditions_paiement !== undefined) updates.conditions_paiement = body.conditions_paiement ?? null;

    // Statut : mapping display → DB + auto date_paiement si passage à "payee"
    if (body.statut !== undefined) {
      const statutDB = STATUT_DB[body.statut] ?? body.statut;
      updates.statut = statutDB;
      // Si on marque comme payée et qu'aucune date_paiement n'est fournie, on l'auto-set
      if (statutDB === "payee" && body.date_paiement === undefined) {
        updates.date_paiement = new Date().toISOString().split("T")[0];
      }
    }

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

    const { data: rawData, error } = await supabase
      .from("factures")
      .update(updates)
      .eq("id", params.id)
      .eq("user_id", user.id)
      .select("*")
      .single() as unknown as { data: Record<string, unknown>; error: unknown };

    if (error) throw error;
    const data = rawData as Record<string, unknown>;

    // ── Auto-send Chorus (plan pro+) ──────────────────────────────────────
    // Déclenché quand le statut passe à "envoyee" ET que auto_send_chorus est actif
    const resolvedStatut = STATUT_DB[body.statut as string] ?? body.statut;
    if (
      resolvedStatut === "envoyee" &&
      data.chorus_pro &&
      data.auto_send_chorus &&
      !data.chorus_depot_id         // pas déjà envoyé
    ) {
      try {
        const { data: profile } = await supabase
          .from("users")
          .select("plan")
          .eq("id", user.id)
          .single();

        if (canUse(profile?.plan ?? "starter", "chorusAutoSend")) {
          await enqueueChorusSend(params.id, user.id);
          logInfo("CHORUS", "AUTO", `Facture ${String(data.numero)} → auto-send déclenché`);
        }
      } catch (qErr) {
        // Ne pas faire échouer le PATCH si la queue échoue
        logInfo("CHORUS", "AUTO", `Erreur enqueue auto-send facture ${params.id}`);
        console.error("[factures/PATCH auto-chorus]", qErr);
      }
    }

    const restantAPayer = Math.max(0, (Number(data.montant_ttc) || 0) - (Number(data.acompte) || 0));

    return NextResponse.json({
      facture: {
        ...data,
        statut: STATUT_DISPLAY[String(data.statut)] ?? data.statut,
        montant: `${Math.round(Number(data.montant_ht) || 0).toLocaleString("fr-FR")} €`,
        tva:     `${Math.round(Number(data.montant_tva) || 0).toLocaleString("fr-FR")} €`,
        total:   `${Math.round(Number(data.montant_ttc) || 0).toLocaleString("fr-FR")} €`,
        restant_a_payer: `${Math.round(restantAPayer).toLocaleString("fr-FR")} €`,
        date:     formatDate(String(data.date_emission)),
        echeance: formatDate(String(data.date_echeance)),
      },
    });
  } catch (err) {
    console.error("[factures/[id]/PATCH]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
