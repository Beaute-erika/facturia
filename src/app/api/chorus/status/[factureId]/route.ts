import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { fetchChorusStatus } from "@/lib/chorus";
import { logInfo, logError } from "@/lib/logger";

/**
 * GET /api/chorus/status/[factureId]
 *
 * Interroge Chorus Pro pour le statut d'une facture déposée,
 * met à jour la base (chorus_status + chorus_last_error si rejet),
 * et retourne le statut courant avec le motif d'erreur éventuel.
 *
 * Réponse : { chorus_status, chorus_depot_id, chorus_last_error? }
 */
export async function GET(
  _req: Request,
  { params }: { params: { factureId: string } },
) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // ── 1. Lire la facture ────────────────────────────────────────────────
    const { data: facture } = await supabase
      .from("factures")
      .select("chorus_depot_id, chorus_status, chorus_last_error, numero")
      .eq("id", params.factureId)
      .eq("user_id", user.id)
      .single() as unknown as {
        data: {
          chorus_depot_id: string | null;
          chorus_status: string | null;
          chorus_last_error: string | null;
          numero: string;
        } | null;
      };

    if (!facture) {
      return NextResponse.json({ error: "Facture introuvable" }, { status: 404 });
    }

    // ── 2. Facture non encore déposée ────────────────────────────────────
    if (!facture.chorus_depot_id) {
      return NextResponse.json({
        chorus_status: null,
        chorus_depot_id: null,
        chorus_last_error: null,
        message: "Facture non encore déposée sur Chorus Pro",
      });
    }

    // ── 3. Interroger Chorus Pro ──────────────────────────────────────────
    const { statut, motifRejet } = await fetchChorusStatus(facture.chorus_depot_id);

    // ── 4. Mettre à jour la base si statut a changé ───────────────────────
    const updates: Record<string, unknown> = {
      chorus_status: statut,
      updated_at: new Date().toISOString(),
    };

    if (statut === "rejetee" && motifRejet) {
      updates.chorus_last_error = motifRejet;
    } else if (statut === "acceptee") {
      updates.chorus_last_error = null;
    }

    await supabase
      .from("factures")
      .update(updates)
      .eq("id", params.factureId)
      .eq("user_id", user.id);

    if (statut !== facture.chorus_status) {
      logInfo("CHORUS", "STATUS", `Facture ${facture.numero} : ${facture.chorus_status} → ${statut}`);
    }

    return NextResponse.json({
      chorus_status: statut,
      chorus_depot_id: facture.chorus_depot_id,
      chorus_last_error: statut === "rejetee"
        ? (motifRejet ?? facture.chorus_last_error)
        : null,
    });
  } catch (err) {
    logError("CHORUS", "STATUS", "Erreur consultation statut", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
