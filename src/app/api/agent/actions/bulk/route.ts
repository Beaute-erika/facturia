import { NextRequest, NextResponse } from "next/server";
import { createServerClient, supabaseAdmin } from "@/lib/supabase-server";

type BulkActionType = "relancer_impayes" | "actions_urgentes" | "preparer_relances";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { action } = await req.json() as { action: BulkActionType };

    // Fetch relevant data based on action type
    const today = new Date().toISOString().split("T")[0];
    let summary = "";
    let items: unknown[] = [];

    if (action === "relancer_impayes") {
      const { data: factures } = await supabaseAdmin()
        .from("factures")
        .select("numero, objet, montant_ttc, date_echeance, clients(nom, prenom, raison_sociale, email)")
        .eq("user_id", user.id)
        .in("statut", ["envoyee", "en_retard"])
        .lte("date_echeance", today)
        .order("date_echeance", { ascending: true });

      items = factures ?? [];
      summary = `${items.length} facture(s) impayée(s) en retard`;

    } else if (action === "actions_urgentes") {
      const [facturesRes, devisRes] = await Promise.all([
        supabaseAdmin()
          .from("factures")
          .select("numero, objet, montant_ttc, date_echeance, clients(nom, prenom, raison_sociale)")
          .eq("user_id", user.id)
          .in("statut", ["en_retard"])
          .order("date_echeance", { ascending: true })
          .limit(5),
        supabaseAdmin()
          .from("devis")
          .select("numero, objet, montant_ttc, date_validite, clients(nom, prenom, raison_sociale)")
          .eq("user_id", user.id)
          .in("statut", ["envoye"])
          .lte("date_validite", today)
          .order("date_validite", { ascending: true })
          .limit(5),
      ]);

      items = [
        ...(facturesRes.data ?? []).map((f) => ({ ...f, _type: "facture" })),
        ...(devisRes.data ?? []).map((d) => ({ ...d, _type: "devis" })),
      ];
      summary = `${items.length} action(s) urgente(s) identifiée(s)`;

    } else if (action === "preparer_relances") {
      const { data: factures } = await supabaseAdmin()
        .from("factures")
        .select("numero, objet, montant_ttc, date_echeance, clients(nom, prenom, raison_sociale, email)")
        .eq("user_id", user.id)
        .in("statut", ["envoyee", "en_retard"])
        .order("date_echeance", { ascending: true })
        .limit(10);

      items = factures ?? [];
      summary = `${items.length} facture(s) à relancer`;
    }

    // Log action (graceful — table may not exist yet)
    try {
      await supabaseAdmin()
        .from("agent_actions_log")
        .insert({
          user_id:     user.id,
          action_type: action,
          target_type: "bulk",
          metadata:    { count: items.length, summary },
        });
    } catch {
      // Ignore if table doesn't exist yet
    }

    return NextResponse.json({ ok: true, action, summary, items, count: items.length });
  } catch (err) {
    console.error("[agent/actions/bulk]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
