import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import type { ChantierStatus, Chantier } from "@/lib/chantiers-types";

const STATUT_DB: Record<ChantierStatus, string> = {
  "planifié": "planifie",
  "en cours": "en_cours",
  "terminé":  "termine",
  "suspendu": "suspendu",
};

const STATUT_DISPLAY: Record<string, ChantierStatus> = {
  planifie:  "planifié",
  en_cours:  "en cours",
  termine:   "terminé",
  suspendu:  "suspendu",
};

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const body = await req.json();
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (body.statut      !== undefined) updates.statut      = STATUT_DB[body.statut as ChantierStatus] ?? body.statut;
    if (body.progression !== undefined) updates.progression = Math.min(100, Math.max(0, Number(body.progression)));
    if (body.etapes      !== undefined) updates.etapes      = body.etapes;
    if (body.notes       !== undefined) updates.notes       = body.notes;
    if (body.titre       !== undefined) updates.titre       = body.titre;
    if (body.description !== undefined) updates.description = body.description;
    if (body.budget_prevu    !== undefined) updates.budget_prevu    = body.budget_prevu;
    if (body.budget_reel     !== undefined) updates.budget_reel     = body.budget_reel;
    if (body.date_debut      !== undefined) updates.date_debut      = body.date_debut;
    if (body.date_fin_prevue !== undefined) updates.date_fin_prevue = body.date_fin_prevue;
    if (body.archived !== undefined) updates.archived_at = body.archived ? new Date().toISOString() : null;

    const { data, error } = await supabase
      .from("chantiers")
      .update(updates)
      .eq("id", params.id)
      .eq("user_id", user.id)
      .select("*, clients(id, nom, prenom, raison_sociale)")
      .single();

    if (error) throw error;

    const cl = data.clients as {
      id: string;
      nom: string;
      prenom: string | null;
      raison_sociale: string | null;
    } | null;
    const clientName =
      cl?.raison_sociale ||
      [cl?.prenom, cl?.nom].filter(Boolean).join(" ") ||
      "Client inconnu";

    const chantier: Chantier = {
      id:               data.id,
      client_id:        data.client_id,
      client:           clientName,
      titre:            data.titre,
      description:      data.description ?? null,
      adresse_chantier: data.adresse_chantier ?? null,
      status:           STATUT_DISPLAY[data.statut] ?? "planifié",
      progression:      data.progression ?? 0,
      budget_prevu:     data.budget_prevu ?? null,
      budget_reel:      data.budget_reel ?? null,
      date_debut:       data.date_debut ?? null,
      date_fin_prevue:  data.date_fin_prevue ?? null,
      date_fin_reelle:  data.date_fin_reelle ?? null,
      etapes:           (data.etapes as Chantier["etapes"]) ?? [],
      notes:            (data.notes as Chantier["notes"]) ?? [],
      archived:         !!(data.archived_at as string | null),
      created_at:       data.created_at,
    };

    return NextResponse.json({ chantier });
  } catch (err) {
    console.error("[chantiers/[id]/PATCH]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
