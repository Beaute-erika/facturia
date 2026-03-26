import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export interface AgentSuggestion {
  id:       string;
  type:     "facture" | "devis" | "chantier";
  priority: "high" | "medium";
  label:    string;
  detail:   string;
  context: {
    type:  "facture" | "devis" | "chantier";
    id:    string;
    label: string;
  };
  prompt: string;
}

const DEVIS_STALE_DAYS = 7;
const CHANTIER_ALERT_DAYS = 7; // fin prévue dans moins de X jours

export async function GET() {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const now = new Date();
    const suggestions: AgentSuggestion[] = [];

    // ── 1. Factures en retard ──────────────────────────────────────────────
    const { data: facturesRetard } = await supabase
      .from("factures")
      .select("id, numero, objet, montant_ttc, date_echeance, clients(nom, prenom, raison_sociale)")
      .eq("user_id", user.id)
      .eq("statut",  "en_retard")
      .order("date_echeance", { ascending: true })
      .limit(3);

    for (const f of (facturesRetard ?? [])) {
      const joursRetard = f.date_echeance
        ? Math.floor((now.getTime() - new Date(f.date_echeance).getTime()) / 86400000)
        : 0;
      const client = f.clients as { nom: string; prenom: string | null; raison_sociale: string | null } | null;
      const clientName = client
        ? (client.prenom ? `${client.prenom} ${client.nom}` : client.raison_sociale || client.nom)
        : "Client";
      const label = `${f.numero} — ${clientName}`;

      suggestions.push({
        id:       `facture-retard-${f.id}`,
        type:     "facture",
        priority: joursRetard > 14 ? "high" : "medium",
        label:    `Facture en retard : ${label}`,
        detail:   `${joursRetard}j de retard · ${(f.montant_ttc as number).toLocaleString("fr-FR")} € TTC`,
        context:  { type: "facture", id: f.id as string, label },
        prompt:   joursRetard > 14
          ? "Cette facture est en retard depuis plus de 2 semaines. Rédige une relance ferme mais professionnelle."
          : "Cette facture n'a pas encore été payée. Rédige une relance de paiement cordiale.",
      });
    }

    // ── 2. Devis envoyés sans réponse depuis >7 jours ──────────────────────
    const staleDate = new Date(now.getTime() - DEVIS_STALE_DAYS * 86400000).toISOString().split("T")[0];
    const { data: devisSansReponse } = await supabase
      .from("devis")
      .select("id, numero, objet, montant_ttc, date_emission, clients(nom, prenom, raison_sociale)")
      .eq("user_id", user.id)
      .eq("statut",  "envoye")
      .lt("date_emission", staleDate)
      .order("date_emission", { ascending: true })
      .limit(3);

    for (const d of (devisSansReponse ?? [])) {
      const joursAttente = d.date_emission
        ? Math.floor((now.getTime() - new Date(d.date_emission).getTime()) / 86400000)
        : 0;
      const client = d.clients as { nom: string; prenom: string | null; raison_sociale: string | null } | null;
      const clientName = client
        ? (client.prenom ? `${client.prenom} ${client.nom}` : client.raison_sociale || client.nom)
        : "Client";
      const label = `${d.numero} — ${clientName}`;

      suggestions.push({
        id:       `devis-stale-${d.id}`,
        type:     "devis",
        priority: joursAttente > 21 ? "high" : "medium",
        label:    `Devis sans réponse : ${label}`,
        detail:   `Envoyé il y a ${joursAttente}j · ${(d.montant_ttc as number).toLocaleString("fr-FR")} € TTC`,
        context:  { type: "devis", id: d.id as string, label },
        prompt:   "Ce devis n'a pas encore reçu de réponse. Rédige une relance cordiale et professionnelle pour relancer l'intérêt du client.",
      });
    }

    // ── 3. Chantiers avec fin prévue imminente ─────────────────────────────
    const alertDate = new Date(now.getTime() + CHANTIER_ALERT_DAYS * 86400000).toISOString().split("T")[0];
    const { data: chantiersImminents } = await supabase
      .from("chantiers")
      .select("id, titre, statut, progression, date_fin_prevue, clients(nom, prenom, raison_sociale)")
      .eq("user_id", user.id)
      .eq("statut",  "en_cours")
      .not("date_fin_prevue", "is", null)
      .lte("date_fin_prevue", alertDate)
      .order("date_fin_prevue", { ascending: true })
      .limit(2);

    for (const ch of (chantiersImminents ?? [])) {
      const client = ch.clients as { nom: string; prenom: string | null; raison_sociale: string | null } | null;
      const clientName = client
        ? (client.prenom ? `${client.prenom} ${client.nom}` : client.raison_sociale || client.nom)
        : "Client";
      const finDate = new Date(ch.date_fin_prevue as string);
      const joursRestants = Math.ceil((finDate.getTime() - now.getTime()) / 86400000);
      const label = `${ch.titre as string} — ${clientName}`;

      suggestions.push({
        id:       `chantier-fin-${ch.id}`,
        type:     "chantier",
        priority: joursRestants <= 2 ? "high" : "medium",
        label:    `Point d'avancement : ${ch.titre as string}`,
        detail:   joursRestants > 0
          ? `Fin prévue dans ${joursRestants}j · ${ch.progression as number}% terminé`
          : `Date de fin dépassée · ${ch.progression as number}% terminé`,
        context:  { type: "chantier", id: ch.id as string, label },
        prompt:   "La fin de ce chantier approche. Prépare un message de point d'avancement à envoyer au client.",
      });
    }

    // Sort: high priority first
    suggestions.sort((a, b) => (a.priority === "high" ? -1 : 1) - (b.priority === "high" ? -1 : 1));

    return NextResponse.json({ suggestions });
  } catch (err) {
    console.error("[agent/suggestions]", err);
    return NextResponse.json({ suggestions: [] });
  }
}
