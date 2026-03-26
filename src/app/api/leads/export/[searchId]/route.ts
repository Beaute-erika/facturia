import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ searchId: string }> }
) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchId } = await params;

    type LeadRow = {
      nom: string | null;
      activite: string | null;
      adresse: string | null;
      ville: string | null;
      code_postal: string | null;
      telephone: string | null;
      phone_source: string | null;
      phone_confidence: number | null;
      phone_secondary: string | null;
      phone_match_method: string | null;
      phone_page_url: string | null;
      email: string | null;
      site_web: string | null;
      siret: string | null;
      distance_km: number | null;
      score: number | null;
      source: string | null;
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: leadsRaw, error } = await (supabase as any)
      .from("leads")
      .select(
        "nom, activite, adresse, ville, code_postal, telephone, phone_source, phone_confidence, phone_secondary, phone_match_method, phone_page_url, email, site_web, siret, distance_km, score, source"
      )
      .eq("search_id", searchId)
      .eq("user_id", user.id)
      .order("score", { ascending: false });
    const leads = leadsRaw as LeadRow[] | null;

    if (error) {
      console.error("[leads/export]", error);
      return NextResponse.json({ error: "Erreur" }, { status: 500 });
    }


    const headers = [
      "Nom",
      "Activité",
      "Adresse",
      "Ville",
      "CP",
      "Téléphone",
      "Téléphone secondaire",
      "Source téléphone",
      "Méthode matching",
      "Confiance tel. (%)",
      "URL source téléphone",
      "Site web",
      "Email",
      "SIRET",
      "Distance (km)",
      "Score",
      "Source entreprise",
    ];

    const rows = (leads ?? []).map((row) => [
        row.nom ?? "",
        row.activite ?? "",
        row.adresse ?? "",
        row.ville ?? "",
        row.code_postal ?? "",
        row.telephone ?? "",
        row.phone_secondary ?? "",
        row.phone_source ?? "",
        row.phone_match_method ?? "",
        row.phone_confidence != null ? String(row.phone_confidence) : "",
        row.phone_page_url ?? "",
        row.site_web ?? "",
        row.email ?? "",
        row.siret ?? "",
        row.distance_km != null ? String(Number(row.distance_km).toFixed(1)) : "",
        String(row.score ?? 0),
        row.source ?? "",
    ]);

    const csvContent = [headers, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    const date = new Date().toISOString().split("T")[0];

    return new NextResponse("\uFEFF" + csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="leads-${date}.csv"`,
      },
    });
  } catch (err) {
    console.error("[leads/export]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
