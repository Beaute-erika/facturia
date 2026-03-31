import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import type { ChantierStatus, Chantier } from "@/lib/chantiers-types";

const STATUT_DISPLAY: Record<string, ChantierStatus> = {
  planifie:  "planifié",
  en_cours:  "en cours",
  termine:   "terminé",
  suspendu:  "suspendu",
};

function rowToChantier(row: Record<string, unknown>): Chantier {
  const cl = row.clients as {
    id: string; nom: string; prenom: string | null; raison_sociale: string | null;
  } | null;
  const clientName =
    cl?.raison_sociale ||
    [cl?.prenom, cl?.nom].filter(Boolean).join(" ") ||
    "Client inconnu";

  return {
    id:               row.id as string,
    client_id:        row.client_id as string,
    client:           clientName,
    titre:            row.titre as string,
    description:      (row.description as string | null) ?? null,
    adresse_chantier: (row.adresse_chantier as string | null) ?? null,
    status:           STATUT_DISPLAY[row.statut as string] ?? "planifié",
    progression:      (row.progression as number) ?? 0,
    budget_prevu:     (row.budget_prevu as number | null) ?? null,
    budget_reel:      (row.budget_reel as number | null) ?? null,
    date_debut:       (row.date_debut as string | null) ?? null,
    date_fin_prevue:  (row.date_fin_prevue as string | null) ?? null,
    date_fin_reelle:  (row.date_fin_reelle as string | null) ?? null,
    etapes:           (row.etapes as Chantier["etapes"]) ?? [],
    notes:            (row.notes as Chantier["notes"]) ?? [],
    archived:         !!(row.archived_at as string | null),
    created_at:       row.created_at as string,
  };
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const showArchived = req.nextUrl.searchParams.get("archived") === "true";

    let query = supabase
      .from("chantiers")
      .select("*, clients(id, nom, prenom, raison_sociale)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (showArchived) {
      query = query.not("archived_at", "is", null);
    } else {
      query = query.is("archived_at", null);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ chantiers: (data ?? []).map(rowToChantier) });
  } catch (err) {
    console.error("[chantiers/GET]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
