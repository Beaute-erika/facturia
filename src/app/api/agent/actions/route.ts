import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

// Valid statut transitions per context type
const VALID_STATUTS: Record<string, string[]> = {
  devis:    ["envoye", "accepte", "refuse", "expire"],
  facture:  ["envoyee", "payee", "annulee"],
  chantier: ["en_cours", "termine", "suspendu"],
};

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const body = await req.json() as {
      action:      "add_note" | "update_statut";
      contextType: string;
      contextId:   string;
      content?:    string;   // for add_note
      statut?:     string;   // for update_statut
    };

    const { action, contextType, contextId, content, statut } = body;

    if (!contextId) return NextResponse.json({ error: "contextId manquant" }, { status: 400 });

    // ── add_note ────────────────────────────────────────────────────────────
    if (action === "add_note") {
      if (contextType !== "client") {
        return NextResponse.json({ error: "add_note uniquement sur client" }, { status: 400 });
      }
      if (!content?.trim()) {
        return NextResponse.json({ error: "Contenu vide" }, { status: 400 });
      }

      const { data: client, error: fetchErr } = await supabase
        .from("clients")
        .select("notes")
        .eq("id", contextId)
        .eq("user_id", user.id)
        .single();

      if (fetchErr || !client) {
        return NextResponse.json({ error: "Client introuvable" }, { status: 404 });
      }

      const date    = new Date().toLocaleDateString("fr-FR");
      const newNote = [
        client.notes?.trim() ?? "",
        `[IA – ${date}]\n${content.trim()}`,
      ].filter(Boolean).join("\n\n");

      const { error: updateErr } = await supabase
        .from("clients")
        .update({ notes: newNote })
        .eq("id", contextId)
        .eq("user_id", user.id);

      if (updateErr) return NextResponse.json({ error: "Erreur mise à jour" }, { status: 500 });

      return NextResponse.json({ ok: true, message: "Note ajoutée au client" });
    }

    // ── update_statut ────────────────────────────────────────────────────────
    if (action === "update_statut") {
      const allowed = VALID_STATUTS[contextType];
      if (!allowed) return NextResponse.json({ error: "Type de contexte non supporté" }, { status: 400 });
      if (!statut || !allowed.includes(statut)) {
        return NextResponse.json({ error: `Statut invalide. Valeurs autorisées : ${allowed.join(", ")}` }, { status: 400 });
      }

      const table = contextType === "devis" ? "devis" : contextType === "facture" ? "factures" : "chantiers";

      const { error: updateErr } = await supabase
        .from(table)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update({ statut } as any)
        .eq("id", contextId)
        .eq("user_id", user.id);

      if (updateErr) return NextResponse.json({ error: "Erreur mise à jour statut" }, { status: 500 });

      const labels: Record<string, string> = {
        envoye: "marqué envoyé", accepte: "marqué accepté", refuse: "marqué refusé",
        expire: "marqué expiré", envoyee: "marquée envoyée", payee: "marquée payée",
        annulee: "annulée", en_cours: "passé en cours", termine: "marqué terminé",
        suspendu: "mis en pause",
      };

      return NextResponse.json({ ok: true, message: `${contextType === "facture" ? "Facture" : contextType === "devis" ? "Devis" : "Chantier"} ${labels[statut] ?? statut}` });
    }

    return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
  } catch (err) {
    console.error("[agent/actions]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
