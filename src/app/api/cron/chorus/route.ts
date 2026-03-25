import { NextResponse } from "next/server";
import { runChorusCron } from "@/lib/chorus-poller";
import { logInfo, logError } from "@/lib/logger";

/**
 * GET /api/cron/chorus
 *
 * Route CRON Vercel — exécute le run complet :
 *   1. Polling des statuts Chorus (factures depose/en_traitement)
 *   2. Traitement de la queue d'auto-envoi
 *   3. Création de notifications sur transitions
 *
 * Planification (vercel.json) : toutes les 15 minutes.
 * Sécurité : header Authorization = Bearer CRON_SECRET (injecté par Vercel).
 *
 * Réponse : { success, poll: {...}, queue: {...} }
 */
export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      logError("CHORUS", "CRON", "Tentative d'appel cron non autorisée");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    logInfo("CHORUS", "CRON", "Déclenchement cron Chorus Pro");
    const result = await runChorusCron();
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    logError("CHORUS", "CRON", "Exception lors du run cron", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
