import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

/** DELETE /api/clients/[id] — suppression sécurisée d'un client */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { id } = params;

    // ── Vérifier que le client appartient bien à cet utilisateur ──────────
    const { data: client, error: findErr } = await supabase
      .from("clients")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (findErr || !client) {
      return NextResponse.json({ error: "Client introuvable" }, { status: 404 });
    }

    // ── Vérifier les données liées (FK RESTRICT) ───────────────────────────
    const [facturesRes, devisRes, chantiersRes] = await Promise.all([
      supabase
        .from("factures")
        .select("id", { count: "exact", head: true })
        .eq("client_id", id)
        .eq("user_id", user.id),
      supabase
        .from("devis")
        .select("id", { count: "exact", head: true })
        .eq("client_id", id)
        .eq("user_id", user.id),
      supabase
        .from("chantiers")
        .select("id", { count: "exact", head: true })
        .eq("client_id", id)
        .eq("user_id", user.id),
    ]);

    const nbFactures  = facturesRes.count  ?? 0;
    const nbDevis     = devisRes.count     ?? 0;
    const nbChantiers = chantiersRes.count ?? 0;
    const total = nbFactures + nbDevis + nbChantiers;

    if (total > 0) {
      const parts: string[] = [];
      if (nbFactures  > 0) parts.push(`${nbFactures} facture${nbFactures  > 1 ? "s" : ""}`);
      if (nbDevis     > 0) parts.push(`${nbDevis} devis`);
      if (nbChantiers > 0) parts.push(`${nbChantiers} chantier${nbChantiers > 1 ? "s" : ""}`);

      return NextResponse.json(
        {
          error: `Impossible de supprimer ce client : il possède ${parts.join(", ")} associé${total > 1 ? "s" : ""}. Supprimez d'abord ces documents.`,
          blocked: true,
          counts: { factures: nbFactures, devis: nbDevis, chantiers: nbChantiers },
        },
        { status: 409 },
      );
    }

    // ── Suppression réelle ────────────────────────────────────────────────
    const { error: deleteErr } = await supabase
      .from("clients")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (deleteErr) throw deleteErr;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[clients/[id]/DELETE]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
