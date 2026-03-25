import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { validateChorusPayload, sendInvoiceToChorus } from "@/lib/chorus";
import { logInfo, logWarn, logError } from "@/lib/logger";

/**
 * POST /api/chorus/send/[factureId]
 *
 * Envoie une facture à Chorus Pro (PISTE) et enregistre le résultat en base.
 *
 * Prérequis :
 *   - Utilisateur authentifié
 *   - facture.chorus_pro === true
 *   - SIRET fournisseur renseigné dans le profil artisan
 *   - SIRET destinataire renseigné dans la fiche client
 *   - chorus_retry_count < 3 (si chorus_status === "rejetee")
 *
 * Réponse succès : { success: true, chorus_depot_id, chorus_status: "depose" }
 * Réponse erreur : { error: string }
 */

const MAX_RETRIES = 3;

export async function POST(
  _req: Request,
  { params }: { params: { factureId: string } },
) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // ── 1. Charger la facture avec son client ──────────────────────────────
    const { data: facture, error: fErr } = await supabase
      .from("factures")
      .select("*, clients(id, nom, siret, type)")
      .eq("id", params.factureId)
      .eq("user_id", user.id)
      .single() as unknown as {
        data: Record<string, unknown> & { clients: Record<string, unknown> | null };
        error: unknown;
      };

    if (fErr || !facture) {
      logWarn("CHORUS", "SEND", `Facture introuvable : ${params.factureId}`);
      return NextResponse.json({ error: "Facture introuvable" }, { status: 404 });
    }

    const factureNumero = String(facture.numero);

    // ── 2. Vérifier éligibilité Chorus Pro ────────────────────────────────
    if (!facture.chorus_pro) {
      logWarn("CHORUS", "SEND", `Facture ${factureNumero} non marquée Chorus Pro`);
      return NextResponse.json(
        { error: "Cette facture n'est pas marquée Chorus Pro" },
        { status: 400 },
      );
    }

    if (facture.chorus_status === "acceptee") {
      logWarn("CHORUS", "SEND", `Facture ${factureNumero} déjà acceptée — envoi bloqué`);
      return NextResponse.json(
        { error: "Cette facture a déjà été acceptée par Chorus Pro" },
        { status: 409 },
      );
    }

    // ── 3. Vérifier limite de retries ─────────────────────────────────────
    const retryCount = Number(facture.chorus_retry_count ?? 0);
    if (facture.chorus_status === "rejetee" && retryCount >= MAX_RETRIES) {
      logWarn("CHORUS", "SEND", `Facture ${factureNumero} — limite retries atteinte (${retryCount}/${MAX_RETRIES})`);
      return NextResponse.json(
        {
          error: `Limite de ${MAX_RETRIES} tentatives atteinte. Contactez le support Chorus Pro ou vérifiez les données de la facture.`,
          chorus_retry_count: retryCount,
        },
        { status: 429 },
      );
    }

    // ── 4. Charger le profil artisan (SIRET obligatoire) ──────────────────
    const { data: artisan, error: aErr } = await supabase
      .from("users")
      .select("siret, raison_sociale, prenom, nom")
      .eq("id", user.id)
      .single();

    if (aErr || !artisan) {
      logError("CHORUS", "SEND", `Profil artisan introuvable pour user ${user.id}`);
      return NextResponse.json({ error: "Profil artisan introuvable" }, { status: 500 });
    }

    if (!artisan.siret) {
      logWarn("CHORUS", "SEND", `Facture ${factureNumero} — SIRET fournisseur manquant`);
      return NextResponse.json(
        { error: "SIRET fournisseur manquant dans votre profil — renseignez-le dans Paramètres" },
        { status: 400 },
      );
    }

    // ── 5. Vérifier SIRET destinataire ────────────────────────────────────
    const client = facture.clients as { siret?: string | null } | null;
    if (!client?.siret) {
      logWarn("CHORUS", "SEND", `Facture ${factureNumero} — SIRET client manquant`);
      return NextResponse.json(
        { error: "SIRET destinataire manquant dans la fiche client — renseignez-le dans Clients" },
        { status: 400 },
      );
    }

    // ── 6. Construire et valider le payload (fail-fast) ────────────────────
    const engagementNum = facture.num_engagement_chorus
      ? String(facture.num_engagement_chorus)
      : undefined;

    const lignes = Array.isArray(facture.lignes) ? facture.lignes : [];

    const payload = {
      siretFournisseur: artisan.siret,
      siretDestinataire: client.siret,
      numeroFacture: factureNumero,
      dateFacture: String(facture.date_emission).split("T")[0],
      montantHTTotal: Number(facture.montant_ht ?? 0),
      montantTVATotal: Number(facture.montant_tva ?? 0),
      montantTTCTotal: Number(facture.montant_ttc ?? 0),
      numeroEngagementJuridique: engagementNum,
      designationFacture: String(facture.objet),
      nombreLignes: lignes.length,
    };

    try {
      validateChorusPayload(payload);
    } catch (validationErr) {
      const msg = validationErr instanceof Error ? validationErr.message : String(validationErr);
      logWarn("CHORUS", "SEND", `Facture ${factureNumero} — validation échouée`, { error: msg });
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    // ── 7. Appeler le service Chorus Pro ──────────────────────────────────
    logInfo("CHORUS", "SEND", `Facture ${factureNumero} → dépôt Chorus Pro (tentative ${retryCount + 1}/${MAX_RETRIES + 1})`, {
      siretFournisseur: payload.siretFournisseur,
      siretDestinataire: payload.siretDestinataire,
      montantTTC: payload.montantTTCTotal,
    });

    // [CHORUS TEST] Log payload pour tests/debug
    console.log("[CHORUS TEST] payload envoyé:", JSON.stringify(payload, null, 2));

    const result = await sendInvoiceToChorus(payload);

    // ── 8. Incrémenter retry_count dans tous les cas ───────────────────────
    const newRetryCount = retryCount + 1;

    // ── 9. Persister le résultat en base ──────────────────────────────────
    if (result.success) {
      await supabase
        .from("factures")
        .update({
          chorus_status: "depose",
          chorus_depot_id: result.chorus_depot_id ?? null,
          chorus_last_error: null,
          chorus_retry_count: newRetryCount,
          updated_at: new Date().toISOString(),
        } as unknown as Record<string, unknown>)
        .eq("id", params.factureId)
        .eq("user_id", user.id);

      logInfo("CHORUS", "SEND", `Facture ${factureNumero} → success`, {
        depot_id: result.chorus_depot_id,
        retry_count: newRetryCount,
      });

      return NextResponse.json({
        success: true,
        chorus_depot_id: result.chorus_depot_id,
        chorus_status: "depose",
        chorus_retry_count: newRetryCount,
      });
    } else {
      await supabase
        .from("factures")
        .update({
          chorus_last_error: result.error ?? "Erreur inconnue",
          chorus_retry_count: newRetryCount,
          updated_at: new Date().toISOString(),
        } as unknown as Record<string, unknown>)
        .eq("id", params.factureId)
        .eq("user_id", user.id);

      logError("CHORUS", "SEND", `Facture ${factureNumero} → échec (tentative ${newRetryCount})`, result.error);

      return NextResponse.json(
        {
          error: result.error ?? "Erreur Chorus Pro",
          chorus_retry_count: newRetryCount,
          retries_remaining: Math.max(0, MAX_RETRIES - newRetryCount),
        },
        { status: 502 },
      );
    }
  } catch (err) {
    logError("CHORUS", "SEND", "Exception non gérée", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
