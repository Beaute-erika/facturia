import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

// Display → DB enum
const STATUT_DB: Record<string, string> = {
  brouillon: "brouillon",
  envoyée: "envoyee",
  payée: "payee",
  "en retard": "en_retard",
};

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const body = await req.json();
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (body.objet !== undefined) updates.objet = body.objet;
    if (body.notes !== undefined) updates.notes = body.notes;
    if (body.statut !== undefined) {
      updates.statut = STATUT_DB[body.statut] ?? body.statut;
    }

    console.log("[factures/PATCH]", params.id, updates);

    const { data, error } = await supabase
      .from("factures")
      .update(updates)
      .eq("id", params.id)
      .eq("user_id", user.id)
      .select("id, numero, objet, statut, notes")
      .single();

    if (error) throw error;
    return NextResponse.json({ facture: data });
  } catch (err) {
    console.error("[factures/[id]/PATCH]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
