/**
 * Poller Chorus Pro — double rôle :
 *   1. pollChorusStatuses()  — met à jour les statuts des factures déposées
 *   2. processChorusQueue()  — traite les envois en attente (auto-send)
 *
 * Appelé toutes les 15 min par la route CRON /api/cron/chorus.
 * Utilise le client service role (pas de contexte utilisateur).
 */

import { getSupabaseAdmin } from "./supabase-server";
import { fetchChorusStatus } from "./chorus";
import { processChorusQueue } from "./chorus-queue";
import { createNotification } from "./chorus-send-service";
import { logInfo, logWarn, logError } from "./logger";

export interface PollResult {
  total: number;
  updated: number;
  unchanged: number;
  errors: number;
  transitions: Array<{ numero: string; from: string | null; to: string }>;
}

export interface CronRunResult {
  poll: PollResult;
  queue: { processed: number; succeeded: number; failed: number; skipped: number };
}

const MAX_CONCURRENT = 5;

// ─── 1. Polling des statuts ───────────────────────────────────────────────────

export async function pollChorusStatuses(): Promise<PollResult> {
  const supabase = getSupabaseAdmin();

  const { data: factures, error: fetchErr } = await supabase
    .from("factures")
    .select("id, user_id, numero, chorus_depot_id, chorus_status")
    .in("chorus_status", ["depose", "en_traitement"])
    .not("chorus_depot_id", "is", null) as unknown as {
      data: Array<{
        id: string;
        user_id: string;
        numero: string;
        chorus_depot_id: string;
        chorus_status: string | null;
      }> | null;
      error: unknown;
    };

  if (fetchErr) {
    logError("CHORUS", "POLL", "Erreur chargement factures en attente", fetchErr);
    return { total: 0, updated: 0, unchanged: 0, errors: 1, transitions: [] };
  }

  const rows = factures ?? [];
  logInfo("CHORUS", "POLL", `${rows.length} facture(s) en attente de polling`);

  if (rows.length === 0) {
    return { total: 0, updated: 0, unchanged: 0, errors: 0, transitions: [] };
  }

  const result: PollResult = {
    total: rows.length,
    updated: 0,
    unchanged: 0,
    errors: 0,
    transitions: [],
  };

  for (let i = 0; i < rows.length; i += MAX_CONCURRENT) {
    const batch = rows.slice(i, i + MAX_CONCURRENT);

    await Promise.all(
      batch.map(async (facture) => {
        try {
          const { statut, motifRejet } = await fetchChorusStatus(facture.chorus_depot_id);

          if (statut === facture.chorus_status) {
            result.unchanged++;
            return;
          }

          const updates: Record<string, unknown> = {
            chorus_status: statut,
            updated_at: new Date().toISOString(),
          };

          if (statut === "rejetee" && motifRejet) {
            updates.chorus_last_error = motifRejet;
          } else if (statut === "acceptee") {
            updates.chorus_last_error = null;
          }

          const { error: updateErr } = await supabase
            .from("factures")
            .update(updates)
            .eq("id", facture.id);

          if (updateErr) {
            logError("CHORUS", "POLL", `Erreur maj facture ${facture.numero}`, updateErr);
            result.errors++;
            return;
          }

          logInfo("CHORUS", "POLL", `Facture ${facture.numero} : ${facture.chorus_status} → ${statut}`);

          // Notification sur transitions terminales
          if (statut === "acceptee") {
            await createNotification(facture.user_id, {
              type: "chorus_acceptee",
              title: "Facture acceptée par Chorus Pro",
              message: `La facture ${facture.numero} a été acceptée et mise en paiement.`,
              data: { facture_id: facture.id },
            });
          } else if (statut === "rejetee") {
            await createNotification(facture.user_id, {
              type: "chorus_rejetee",
              title: "Facture rejetée par Chorus Pro",
              message: `La facture ${facture.numero} a été rejetée${motifRejet ? ` : ${motifRejet}` : "."} Cliquez pour corriger.`,
              data: { facture_id: facture.id, motif: motifRejet },
            });
          }

          result.updated++;
          result.transitions.push({
            numero: facture.numero,
            from: facture.chorus_status,
            to: statut,
          });
        } catch (err) {
          logError("CHORUS", "POLL", `Erreur statut facture ${facture.numero}`, err);
          result.errors++;
        }
      }),
    );
  }

  if (result.errors > 0) {
    logWarn("CHORUS", "POLL", `Polling terminé avec ${result.errors} erreur(s)`, {
      updated: result.updated, unchanged: result.unchanged, errors: result.errors,
    });
  } else {
    logInfo("CHORUS", "POLL", "Polling terminé", {
      updated: result.updated, unchanged: result.unchanged,
    });
  }

  return result;
}

// ─── 2. Run complet cron (poll + queue) ──────────────────────────────────────

/**
 * Exécute le run cron complet :
 *   1. Polling des statuts Chorus
 *   2. Traitement de la queue d'envoi (auto-send)
 */
export async function runChorusCron(): Promise<CronRunResult> {
  logInfo("CHORUS", "CRON", "=== Début run cron Chorus Pro ===");

  const poll = await pollChorusStatuses();
  const queue = await processChorusQueue();

  logInfo("CHORUS", "CRON", "=== Run cron terminé ===", {
    poll_updated: poll.updated,
    poll_errors: poll.errors,
    queue_succeeded: queue.succeeded,
    queue_failed: queue.failed,
  });

  return { poll, queue };
}
