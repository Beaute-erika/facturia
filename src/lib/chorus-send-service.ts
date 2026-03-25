/**
 * Service d'envoi Chorus Pro partagé.
 *
 * Logique métier centralisée utilisée par :
 *   - La route HTTP  POST /api/chorus/send/[factureId]
 *   - La queue       processChorusQueue() dans chorus-queue.ts
 *   - L'auto-send    déclenché par le PATCH /api/factures/[id]
 *
 * Crée automatiquement une notification après chaque envoi.
 */

import { getSupabaseAdmin } from "./supabase-server";
import { validateChorusPayload, sendInvoiceToChorus } from "./chorus";
import { logInfo, logWarn, logError } from "./logger";

const MAX_RETRIES = 3;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SendServiceResult {
  success: boolean;
  chorus_depot_id?: string;
  chorus_retry_count?: number;
  retries_remaining?: number;
  factureNumero?: string;
  error?: string;
}

interface NotificationPayload {
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

// ─── Helper : créer une notification ─────────────────────────────────────────

export async function createNotification(
  userId: string,
  payload: NotificationPayload,
): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    await supabase.from("notifications").insert({
      user_id: userId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      data: payload.data ?? null,
    });
  } catch (err) {
    // Ne pas faire échouer l'envoi si la notification échoue
    logError("NOTIF", "CREATE", "Erreur création notification", err);
  }
}

// ─── Service principal ────────────────────────────────────────────────────────

/**
 * Envoie une facture à Chorus Pro via le service role Supabase.
 * Utilisé par la queue et l'auto-send (hors contexte utilisateur HTTP).
 *
 * Gère :
 *   - Guards (chorus_pro, acceptee, retry limit)
 *   - Chargement artisan + client
 *   - Validation payload (fail-fast)
 *   - Appel API Chorus
 *   - Mise à jour DB
 *   - Notification in-app
 */
export async function triggerChorusSend(
  factureId: string,
  userId: string,
): Promise<SendServiceResult> {
  const supabase = getSupabaseAdmin();

  // ── 1. Charger la facture ──────────────────────────────────────────────
  const { data: facture } = await supabase
    .from("factures")
    .select("*, clients(id, nom, siret, type)")
    .eq("id", factureId)
    .eq("user_id", userId)
    .single() as unknown as {
      data: Record<string, unknown> & { clients: Record<string, unknown> | null };
    };

  if (!facture) {
    return { success: false, error: "Facture introuvable" };
  }

  const factureNumero = String(facture.numero);

  // ── 2. Guards ──────────────────────────────────────────────────────────
  if (!facture.chorus_pro) {
    return { success: false, error: "Facture non Chorus Pro", factureNumero };
  }
  if (facture.chorus_status === "acceptee") {
    return { success: false, error: "Facture déjà acceptée par Chorus", factureNumero };
  }

  const retryCount = Number(facture.chorus_retry_count ?? 0);
  if (facture.chorus_status === "rejetee" && retryCount >= MAX_RETRIES) {
    return {
      success: false,
      error: `Limite de ${MAX_RETRIES} tentatives atteinte`,
      chorus_retry_count: retryCount,
      retries_remaining: 0,
      factureNumero,
    };
  }

  // ── 3. Charger l'artisan ───────────────────────────────────────────────
  const { data: artisan } = await supabase
    .from("users")
    .select("siret, raison_sociale, prenom, nom")
    .eq("id", userId)
    .single();

  if (!artisan?.siret) {
    logWarn("CHORUS", "SEND_SVC", `Facture ${factureNumero} — SIRET fournisseur manquant`);
    return { success: false, error: "SIRET fournisseur manquant dans le profil", factureNumero };
  }

  const client = facture.clients as { siret?: string | null } | null;
  if (!client?.siret) {
    logWarn("CHORUS", "SEND_SVC", `Facture ${factureNumero} — SIRET destinataire manquant`);
    return { success: false, error: "SIRET destinataire manquant dans la fiche client", factureNumero };
  }

  // ── 4. Construire et valider le payload ───────────────────────────────
  const lignes = Array.isArray(facture.lignes) ? (facture.lignes as unknown[]) : [];

  const payload = {
    siretFournisseur: artisan.siret,
    siretDestinataire: client.siret,
    numeroFacture: factureNumero,
    dateFacture: String(facture.date_emission).split("T")[0],
    montantHTTotal: Number(facture.montant_ht ?? 0),
    montantTVATotal: Number(facture.montant_tva ?? 0),
    montantTTCTotal: Number(facture.montant_ttc ?? 0),
    numeroEngagementJuridique: facture.num_engagement_chorus
      ? String(facture.num_engagement_chorus)
      : undefined,
    designationFacture: String(facture.objet),
    nombreLignes: lignes.length,
  };

  try {
    validateChorusPayload(payload);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logWarn("CHORUS", "SEND_SVC", `Facture ${factureNumero} — validation échouée`);
    return { success: false, error: msg, factureNumero };
  }

  // ── 5. Appel API Chorus ────────────────────────────────────────────────
  logInfo("CHORUS", "SEND_SVC", `Facture ${factureNumero} → envoi (tentative ${retryCount + 1})`, {
    siretFournisseur: payload.siretFournisseur,
    montantTTC: payload.montantTTCTotal,
  });

  const result = await sendInvoiceToChorus(payload);
  const newRetryCount = retryCount + 1;

  // ── 6. Persister en base ───────────────────────────────────────────────
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
      .eq("id", factureId)
      .eq("user_id", userId);

    logInfo("CHORUS", "SEND_SVC", `Facture ${factureNumero} → déposée`, {
      depot_id: result.chorus_depot_id,
    });

    await createNotification(userId, {
      type: "chorus_depose",
      title: "Facture déposée sur Chorus Pro",
      message: `La facture ${factureNumero} a été déposée avec succès (id: ${result.chorus_depot_id})`,
      data: { facture_id: factureId, depot_id: result.chorus_depot_id },
    });

    return {
      success: true,
      chorus_depot_id: result.chorus_depot_id,
      chorus_retry_count: newRetryCount,
      retries_remaining: MAX_RETRIES - newRetryCount,
      factureNumero,
    };
  } else {
    await supabase
      .from("factures")
      .update({
        chorus_last_error: result.error ?? "Erreur inconnue",
        chorus_retry_count: newRetryCount,
        updated_at: new Date().toISOString(),
      } as unknown as Record<string, unknown>)
      .eq("id", factureId)
      .eq("user_id", userId);

    logError("CHORUS", "SEND_SVC", `Facture ${factureNumero} → échec`, result.error);

    await createNotification(userId, {
      type: "chorus_error",
      title: "Erreur dépôt Chorus Pro",
      message: `La facture ${factureNumero} n'a pas pu être envoyée : ${result.error}`,
      data: { facture_id: factureId, error: result.error, retry_count: newRetryCount },
    });

    return {
      success: false,
      error: result.error,
      chorus_retry_count: newRetryCount,
      retries_remaining: Math.max(0, MAX_RETRIES - newRetryCount),
      factureNumero,
    };
  }
}
