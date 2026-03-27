import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import type { LeadResult } from "../search/route";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json() as {
      adresse: string;
      metier: string;
      rayon_km: number;
      lat: number;
      lon: number;
      leads: LeadResult[];
      geocoded_address: string;
    };
    const { adresse, metier, rayon_km, lat, lon, leads } = body;

    if (!adresse || !metier || !rayon_km || !Array.isArray(leads)) {
      return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
    }

    // Insert lead_search
    const { data: search, error: searchError } = await supabase
      .from("lead_searches")
      .insert({
        user_id: user.id,
        adresse,
        metier,
        rayon_km,
        lat,
        lon,
        result_count: leads.length,
      })
      .select("id")
      .single();

    if (searchError || !search) {
      console.error("[leads/save] search insert error", searchError);
      return NextResponse.json({ error: "Erreur lors de la sauvegarde" }, { status: 500 });
    }

    const search_id = search.id;

    // Insert all leads
    if (leads.length > 0) {
      const leadsToInsert = leads.map((l) => ({
        user_id: user.id,
        search_id,
        nom: l.nom,
        activite: l.activite,
        code_naf: l.code_naf,
        adresse: l.adresse,
        ville: l.ville,
        code_postal: l.code_postal,
        telephone: l.telephone,
        phone_source: l.phone_source ?? null,
        phone_confidence: l.phone_confidence ?? null,
        phone_secondary: l.phone_secondary ?? null,
        phone_match_method: l.phone_match_method ?? null,
        phone_page_url: l.phone_page_url ?? null,
        google_places_id: l.google_places_id ?? null,
        email: l.email,
        site_web: l.site_web,
        siret: l.siret,
        siren: l.siren,
        distance_km: l.distance_km,
        score: l.score,
        source: l.source,
      }));

      const { error: leadsError } = await supabase.from("leads").insert(leadsToInsert);
      if (leadsError) {
        console.error("[leads/save] leads insert error", leadsError);
        return NextResponse.json({ error: "Erreur lors de la sauvegarde des leads" }, { status: 500 });
      }
    }

    return NextResponse.json({ search_id, saved_count: leads.length });
  } catch (err) {
    console.error("[leads/save]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
