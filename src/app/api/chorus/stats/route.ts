import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { canUse } from "@/lib/feature-flags";
import { logInfo } from "@/lib/logger";

/**
 * GET /api/chorus/stats
 *
 * Retourne les statistiques Chorus Pro pour le dashboard.
 * Réservé aux plans pro/business.
 *
 * Réponse :
 * {
 *   total_chorus:        number,   — factures marquées chorus_pro
 *   total_envoyes:       number,   — factures déposées (tous statuts)
 *   total_acceptees:     number,
 *   total_rejetees:      number,
 *   total_en_attente:    number,   — depose + en_traitement
 *   montant_total_envoye: number,  — montant TTC total envoyé
 *   montant_accepte:      number,  — montant TTC des factures acceptées
 *   taux_acceptation:     number,  — % acceptées / envoyées
 *   taux_rejet:           number,  — % rejetées / envoyées
 *   queue_pending:        number,  — items en attente dans la queue
 * }
 */
export async function GET() {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    // ── Plan check ─────────────────────────────────────────────────────
    const { data: profile } = await supabase
      .from("users")
      .select("plan")
      .eq("id", user.id)
      .single();

    const plan = profile?.plan ?? "starter";

    if (!canUse(plan, "chorusDashboard")) {
      return NextResponse.json(
        { error: "Le tableau de bord Chorus est disponible à partir du plan Pro.", locked: true },
        { status: 403 },
      );
    }

    // ── Agréger les stats factures Chorus ─────────────────────────────
    const { data: rows } = await supabase
      .from("factures")
      .select("chorus_pro, chorus_status, montant_ttc")
      .eq("user_id", user.id)
      .eq("chorus_pro", true) as unknown as {
        data: Array<{
          chorus_pro: boolean;
          chorus_status: string | null;
          montant_ttc: number | null;
        }> | null;
      };

    const factures = rows ?? [];
    const envoyes = factures.filter((f) => f.chorus_status !== null);
    const acceptees = factures.filter((f) => f.chorus_status === "acceptee");
    const rejetees  = factures.filter((f) => f.chorus_status === "rejetee");
    const enAttente = factures.filter((f) =>
      f.chorus_status === "depose" || f.chorus_status === "en_traitement",
    );

    const sum = (arr: typeof factures) =>
      arr.reduce((s, f) => s + (Number(f.montant_ttc) || 0), 0);

    const totalEnvoyes = envoyes.length;
    const tauxAcceptation = totalEnvoyes > 0
      ? Math.round((acceptees.length / totalEnvoyes) * 100)
      : 0;
    const tauxRejet = totalEnvoyes > 0
      ? Math.round((rejetees.length / totalEnvoyes) * 100)
      : 0;

    // ── Items en queue ─────────────────────────────────────────────────
    const { count: queuePending } = await supabase
      .from("chorus_queue")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "pending") as unknown as { count: number | null };

    logInfo("CHORUS", "STATS", `Stats demandées par user ${user.id}`);

    return NextResponse.json({
      total_chorus:         factures.length,
      total_envoyes:        totalEnvoyes,
      total_acceptees:      acceptees.length,
      total_rejetees:       rejetees.length,
      total_en_attente:     enAttente.length,
      montant_total_envoye: Math.round(sum(envoyes)),
      montant_accepte:      Math.round(sum(acceptees)),
      taux_acceptation:     tauxAcceptation,
      taux_rejet:           tauxRejet,
      queue_pending:        queuePending ?? 0,
      plan,
    });
  } catch (err) {
    console.error("[chorus/stats]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
