import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export interface LeadResult {
  nom: string;
  activite: string;
  code_naf: string;
  adresse: string;
  ville: string;
  code_postal: string;
  telephone: string | null;
  email: string | null;
  site_web: string | null;
  siret: string | null;
  siren: string;
  distance_km: number;
  score: number;
  source: string;
}

interface GeoFeature {
  geometry: { coordinates: [number, number] };
  properties: { label: string; city: string; postcode: string; context: string };
}

interface EntrepriseSiege {
  siret?: string;
  adresse?: string;
  code_postal?: string;
  commune?: string;
  libelle_commune?: string;
  latitude?: string | number;
  longitude?: string | number;
  coordonnees?: string;
}

interface EntrepriseResult {
  siren: string;
  nom_complet?: string;
  activite_principale?: string;
  siege?: EntrepriseSiege;
  tranche_effectif_salarie?: string;
  categorie_entreprise?: string;
}

interface EntrepriseApiResponse {
  results: EntrepriseResult[];
  total_results: number;
  total_pages: number;
  page: number;
  per_page: number;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function scoreRelevance(activite: string, metier: string): number {
  if (!activite || !metier) return 0;
  const a = activite.toLowerCase();
  const m = metier.toLowerCase();
  if (a.includes(m)) return 30;
  const words = m.split(/\s+/).filter((w) => w.length > 3);
  const matches = words.filter((w) => a.includes(w));
  if (matches.length === 0) return 0;
  return Math.round((matches.length / words.length) * 20);
}

function extractCoords(siege: EntrepriseSiege): { lat: number; lon: number } | null {
  // Try latitude/longitude fields directly
  const rawLat = siege.latitude;
  const rawLon = siege.longitude;
  if (rawLat !== undefined && rawLon !== undefined) {
    const lat = typeof rawLat === "string" ? parseFloat(rawLat) : rawLat;
    const lon = typeof rawLon === "string" ? parseFloat(rawLon) : rawLon;
    if (!isNaN(lat) && !isNaN(lon) && lat !== 0 && lon !== 0) {
      return { lat, lon };
    }
  }
  // Try coordonnees "lat,lon"
  if (siege.coordonnees) {
    const parts = siege.coordonnees.split(",");
    if (parts.length === 2) {
      const lat = parseFloat(parts[0]);
      const lon = parseFloat(parts[1]);
      if (!isNaN(lat) && !isNaN(lon) && lat !== 0 && lon !== 0) {
        return { lat, lon };
      }
    }
  }
  return null;
}

function normalizeEntreprise(
  e: EntrepriseResult,
  originLat: number,
  originLon: number,
  rayonKm: number,
  metier: string
): LeadResult | null {
  if (!e.siege) return null;
  const coords = extractCoords(e.siege);
  if (!coords) return null;

  const distance_km = haversineKm(originLat, originLon, coords.lat, coords.lon);
  if (distance_km > rayonKm) return null;

  const activite = e.activite_principale ?? "";
  const proxScore = Math.max(0, 40 * (1 - distance_km / rayonKm));
  const contactScore =
    (e.siege.siret ? 0 : 0) +
    // telephone/email/site_web not available from this API directly — scored 0 here
    0;
  const relevanceScore = scoreRelevance(activite, metier);
  const score = Math.round(proxScore + contactScore + relevanceScore);

  return {
    nom: e.nom_complet ?? "—",
    activite: activite,
    code_naf: activite,
    adresse: e.siege.adresse ?? "",
    ville: e.siege.libelle_commune ?? e.siege.commune ?? "",
    code_postal: e.siege.code_postal ?? "",
    telephone: null,
    email: null,
    site_web: null,
    siret: e.siege.siret ?? null,
    siren: e.siren,
    distance_km: Math.round(distance_km * 10) / 10,
    score: Math.min(100, Math.max(0, score)),
    source: "annuaire-entreprises",
  };
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { adresse, metier, rayon_km } = body as {
      adresse: string;
      metier: string;
      rayon_km: number;
    };

    if (!adresse?.trim() || !metier?.trim() || !rayon_km) {
      return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
    }
    if (rayon_km < 1 || rayon_km > 500) {
      return NextResponse.json({ error: "Rayon invalide (1-500 km)" }, { status: 400 });
    }

    // 1. Geocode
    const geoUrl = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(adresse)}&limit=1`;
    const geoRes = await fetch(geoUrl, { signal: AbortSignal.timeout(10000) });
    if (!geoRes.ok) {
      return NextResponse.json({ error: "Erreur de géocodage" }, { status: 502 });
    }
    const geoData = (await geoRes.json()) as { features: GeoFeature[] };
    if (!geoData.features?.length) {
      return NextResponse.json({ error: "Adresse introuvable" }, { status: 422 });
    }
    const feature = geoData.features[0];
    const [lon, lat] = feature.geometry.coordinates;
    const geocodedAddress = feature.properties.label;

    // 2. Extract department from geocoding context ("75, Paris, Île-de-France" → "75")
    const context = feature.properties.context ?? "";
    const departement = context.split(",")[0].trim();

    // For wide radius, also look up departments at the N/S/E/W extremes of the circle
    const deptSet = new Set<string>([departement]);
    if (rayon_km > 30) {
      const R_EARTH = 111.32; // km per degree latitude
      const offsets = [
        [rayon_km / R_EARTH, 0],
        [-rayon_km / R_EARTH, 0],
        [0, rayon_km / (R_EARTH * Math.cos((lat * Math.PI) / 180))],
        [0, -rayon_km / (R_EARTH * Math.cos((lat * Math.PI) / 180))],
      ];
      await Promise.all(
        offsets.map(async ([dLat, dLon]) => {
          try {
            const geoR = await fetch(
              `https://geo.api.gouv.fr/communes?lat=${lat + dLat}&lon=${lon + dLon}&fields=codeDepartement&limit=1`,
              { signal: AbortSignal.timeout(5000) }
            );
            if (geoR.ok) {
              const arr = (await geoR.json()) as { codeDepartement?: string }[];
              if (arr[0]?.codeDepartement) deptSet.add(arr[0].codeDepartement);
            }
          } catch { /* skip */ }
        })
      );
    }

    // 3. Fetch entreprises — up to 3 pages per department
    const allResults: EntrepriseResult[] = [];
    const MAX_PAGES = 3;

    for (const dept of Array.from(deptSet)) {
      for (let page = 1; page <= MAX_PAGES; page++) {
        const url = `https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(
          metier
        )}&departement=${dept}&per_page=25&page=${page}`;
        try {
          const apiRes = await fetch(url, { signal: AbortSignal.timeout(10000) });
          if (!apiRes.ok) break;
          const data = (await apiRes.json()) as EntrepriseApiResponse;
          if (!data.results?.length) break;
          allResults.push(...data.results);
          if (page >= data.total_pages) break;
        } catch {
          break;
        }
      }
    }

    const total_before_filter = allResults.length;

    // 4. Deduplicate by siren
    const seen = new Set<string>();
    const unique = allResults.filter((e) => {
      if (seen.has(e.siren)) return false;
      seen.add(e.siren);
      return true;
    });

    // 4. Normalize, filter, score
    const leads: LeadResult[] = unique
      .map((e) => normalizeEntreprise(e, lat, lon, rayon_km, metier))
      .filter((l): l is LeadResult => l !== null)
      .sort((a, b) => b.score - a.score);

    return NextResponse.json({
      leads,
      geocoded_address: geocodedAddress,
      lat,
      lon,
      total_before_filter,
    });
  } catch (err) {
    console.error("[leads/search]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
