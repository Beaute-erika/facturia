import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import type { ChantierStatus, Chantier } from "@/lib/chantiers-types";

const STATUT_DISPLAY: Record<string, ChantierStatus> = {
  planifie:  "planifié",
  en_cours:  "en cours",
  termine:   "terminé",
  suspendu:  "suspendu",
};

export async function GET() {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { data, error } = await supabase
      .from("chantiers")
      .select("*, clients(id, nom, prenom, raison_sociale)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const chantiers: Chantier[] = (data ?? []).map((row) => {
      const cl = row.clients as {
        id: string;
        nom: string;
        prenom: string | null;
        raison_sociale: string | null;
      } | null;
      const clientName =
        cl?.raison_sociale ||
        [cl?.prenom, cl?.nom].filter(Boolean).join(" ") ||
        "Client inconnu";

      return {
        id:               row.id,
        client_id:        row.client_id,
        client:           clientName,
        titre:            row.titre,
        description:      row.description ?? null,
        adresse_chantier: row.adresse_chantier ?? null,
        status:           STATUT_DISPLAY[row.statut] ?? "planifié",
        progression:      row.progression ?? 0,
        budget_prevu:     row.budget_prevu ?? null,
        budget_reel:      row.budget_reel ?? null,
        date_debut:       row.date_debut ?? null,
        date_fin_prevue:  row.date_fin_prevue ?? null,
        date_fin_reelle:  row.date_fin_reelle ?? null,
        etapes:           (row.etapes as Chantier["etapes"]) ?? [],
        notes:            (row.notes as Chantier["notes"]) ?? [],
        created_at:       row.created_at,
      };
    });

    return NextResponse.json({ chantiers });
  } catch (err) {
    console.error("[chantiers/GET]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
