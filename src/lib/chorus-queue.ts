/**
 * Queue d'envoi Chorus Pro — persistante via Supabase.
 *
 * Garantit :
 *   - Aucun double envoi (idempotence via chorus_depot_id)
 *   - Pas de perte en cas de crash (items en DB)
 *   - Rate limiting implicite (1 item / traitement cron, lots de 3 max)
 *   - Retry automatique jusqu'à MAX_QUEUE_RETRIES
 *
 * Usage :
 *   // Ajouter en queue (depuis PATCH facture) :
 *   await enqueueChorusSend(factureId, userId);
 *
 *   // Traiter la queue (depuis le cron) :
 *   const result = await processChorusQueue();
 */

import { getSupabaseAdmin } from "./supabase-server";
import { triggerChorusSend } from "./chorus-send-service";
import { logInfo, logWarn, logError } from "./logger";

const MAX_QUEUE_RETRIES = 2;   // Retries max dans la queue (distinct des retries Chorus)
const BATCH_SIZE        = 3;   // Items traités par exécution cron

// ─── Types ───────────────────────────────────────────────────────────────────

export interface QueueResult {
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
}

interface QueueRow {
  id: string;
  facture_id: string;
  user_id: string;
  status: string;
  retry_count: number;
  error_message: string | null;
}

// ─── Enqueue ─────────────────────────────────────────────────────────────────

/**
 * Ajoute une facture à la queue d'envoi Chorus.
 * Idempotent : n'ajoute pas si un item "pending" ou "processing" existe déjà.
 */
export async function enqueueChorusSend(
  factureId: string,
  userId: string,
): Promise<void> {
  const supabase = getSupabaseAdmin();

  // Vérifier si un item actif existe déjà pour éviter les doublons
  const { data: existing } = await supabase
    .from("chorus_queue")
    .select("id, status")
    .eq("facture_id", factureId)
    .in("status", ["pending", "processing"])
    .maybeSingle() as unknown as { data: { id: string; status: string } | null };

  if (existing) {
    logInfo("CHORUS", "QUEUE", `Facture ${factureId} déjà en queue (${existing.status}) — ignoré`);
    return;
  }

  const { error } = await supabase
    .from("chorus_queue")
    .insert({
      facture_id: factureId,
      user_id: userId,
      status: "pending",
    });

  if (error) {
    logError("CHORUS", "QUEUE", `Erreur enqueue facture ${factureId}`, error);
    throw new Error(`Impossible d'enqueuer la facture ${factureId}`);
  }

  logInfo("CHORUS", "QUEUE", `Facture ${factureId} ajoutée en queue`);
}

// ─── Process ─────────────────────────────────────────────────────────────────

/**
 * Traite les items en attente dans la queue (appelé par le cron).
 * Processus :
 *   1. Récupère les N prochains items "pending"
 *   2. Pour chacun : marque "processing" → envoie → marque "done" ou "error"
 *   3. Si erreur queue et retry_count < MAX : remet en "pending"
 */
export async function processChorusQueue(): Promise<QueueResult> {
  const supabase = getSupabaseAdmin();
  const result: QueueResult = { processed: 0, succeeded: 0, failed: 0, skipped: 0 };

  // ── 1. Récupérer les items en attente ────────────────────────────────
  const { data: items, error: fetchErr } = await supabase
    .from("chorus_queue")
    .select("id, facture_id, user_id, status, retry_count, error_message")
    .eq("status", "pending")
    .order("created_at")
    .limit(BATCH_SIZE) as unknown as { data: QueueRow[] | null; error: unknown };

  if (fetchErr) {
    logError("CHORUS", "QUEUE", "Erreur lecture queue", fetchErr);
    return result;
  }

  const rows = items ?? [];
  if (rows.length === 0) return result;

  logInfo("CHORUS", "QUEUE", `${rows.length} item(s) en attente dans la queue`);

  // ── 2. Traiter chaque item séquentiellement (rate limiting) ──────────
  for (const item of rows) {
    result.processed++;

    // Marquer comme "processing" (évite double traitement si cron parallèle)
    const { error: lockErr } = await supabase
      .from("chorus_queue")
      .update({ status: "processing" } as unknown as Record<string, unknown>)
      .eq("id", item.id)
      .eq("status", "pending"); // Condition de sécurité

    if (lockErr) {
      logWarn("CHORUS", "QUEUE", `Item ${item.id} — impossible de verrouiller, skippé`);
      result.skipped++;
      continue;
    }

    // ── 3. Exécuter l'envoi ──────────────────────────────────────────
    try {
      const sendResult = await triggerChorusSend(item.facture_id, item.user_id);

      if (sendResult.success) {
        await supabase
          .from("chorus_queue")
          .update({
            status: "done",
            processed_at: new Date().toISOString(),
          } as unknown as Record<string, unknown>)
          .eq("id", item.id);

        logInfo("CHORUS", "QUEUE", `Item ${item.id} — facture ${sendResult.factureNumero} déposée ✓`);
        result.succeeded++;
      } else {
        const shouldRetry = item.retry_count < MAX_QUEUE_RETRIES;
        await supabase
          .from("chorus_queue")
          .update({
            status: shouldRetry ? "pending" : "error",
            error_message: sendResult.error ?? "Erreur inconnue",
            retry_count: item.retry_count + 1,
            processed_at: shouldRetry ? null : new Date().toISOString(),
          } as unknown as Record<string, unknown>)
          .eq("id", item.id);

        if (shouldRetry) {
          logWarn("CHORUS", "QUEUE", `Item ${item.id} — échec, retry ${item.retry_count + 1}/${MAX_QUEUE_RETRIES}`);
        } else {
          logError("CHORUS", "QUEUE", `Item ${item.id} — abandon après ${MAX_QUEUE_RETRIES} tentatives`, sendResult.error);
        }
        result.failed++;
      }
    } catch (err) {
      await supabase
        .from("chorus_queue")
        .update({
          status: "error",
          error_message: err instanceof Error ? err.message : String(err),
          processed_at: new Date().toISOString(),
        } as unknown as Record<string, unknown>)
        .eq("id", item.id);

      logError("CHORUS", "QUEUE", `Item ${item.id} — exception`, err);
      result.failed++;
    }

    // Rate limiting : 1 seconde entre chaque appel Chorus
    if (rows.indexOf(item) < rows.length - 1) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  logInfo("CHORUS", "QUEUE", "Traitement queue terminé", result as unknown as Record<string, unknown>);
  return result;
}
