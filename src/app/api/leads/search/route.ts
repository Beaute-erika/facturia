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
  phone_source: string | null;
  phone_confidence: number | null;
  email: string | null;
  site_web: string | null;
  siret: string | null;
  siren: string;
  distance_km: number;
  score: number;
  source: string;
  // Internal coords for OSM matching — stripped before response if not needed
  _lat?: number;
  _lon?: number;
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
}

interface EntrepriseApiResponse {
  results: EntrepriseResult[];
  total_results: number;
  total_pages: number;
  page: number;
  per_page: number;
}

interface OSMEntry {
  lat: number;
  lon: number;
  name: string;
  phone: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

/** Normalize French phone to "0X XX XX XX XX". Returns null if invalid. */
function normalizePhone(raw: string): string | null {
  if (!raw?.trim()) return null;
  let digits = raw.replace(/[^\d+]/g, "");
  if (!digits) return null;
  if (digits.startsWith("+33")) digits = "0" + digits.slice(3);
  if (digits.startsWith("0033")) digits = "0" + digits.slice(4);
  if (digits.length === 10 && digits.startsWith("0")) {
    return `${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 6)} ${digits.slice(6, 8)} ${digits.slice(8, 10)}`;
  }
  // Accept if long enough even if format unknown
  if (digits.length >= 9) return raw.trim();
  return null;
}

/** Jaccard similarity on significant words (0–1). */
function nameSimilarity(a: string, b: string): number {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  const STOP = new Set(["les", "des", "une", "pas", "sur", "sarl", "eurl", "sas", "the", "par"]);
  const words = (s: string) =>
    new Set(norm(s).split(" ").filter((w) => w.length > 2 && !STOP.has(w)));

  const an = norm(a);
  const bn = norm(b);
  if (an === bn) return 1.0;
  if (an.includes(bn) || bn.includes(an)) return 0.85;

  const aw = words(a);
  const bw = words(b);
  if (!aw.size || !bw.size) return 0;

  const common = Array.from(aw).filter((w) => bw.has(w)).length;
  const union = new Set(Array.from(aw).concat(Array.from(bw))).size;
  return common / union;
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
  const rawLat = siege.latitude;
  const rawLon = siege.longitude;
  if (rawLat !== undefined && rawLon !== undefined) {
    const lat = typeof rawLat === "string" ? parseFloat(rawLat) : rawLat;
    const lon = typeof rawLon === "string" ? parseFloat(rawLon) : rawLon;
    if (!isNaN(lat) && !isNaN(lon) && lat !== 0 && lon !== 0) return { lat, lon };
  }
  if (siege.coordonnees) {
    const [p0, p1] = siege.coordonnees.split(",");
    const lat = parseFloat(p0);
    const lon = parseFloat(p1);
    if (!isNaN(lat) && !isNaN(lon) && lat !== 0 && lon !== 0) return { lat, lon };
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
  const relevanceScore = scoreRelevance(activite, metier);
  const score = Math.min(100, Math.max(0, Math.round(proxScore + relevanceScore)));

  return {
    nom: e.nom_complet ?? "—",
    activite,
    code_naf: activite,
    adresse: e.siege.adresse ?? "",
    ville: e.siege.libelle_commune ?? e.siege.commune ?? "",
    code_postal: e.siege.code_postal ?? "",
    telephone: null,
    phone_source: null,
    phone_confidence: null,
    email: null,
    site_web: null,
    siret: e.siege.siret ?? null,
    siren: e.siren,
    distance_km: Math.round(distance_km * 10) / 10,
    score,
    source: "annuaire-entreprises",
    _lat: coords.lat,
    _lon: coords.lon,
  };
}

// ─── Overpass phone enrichment ─────────────────────────────────────────────────

async function fetchOSMEntries(
  lat: number,
  lon: number,
  rayonKm: number
): Promise<OSMEntry[]> {
  // Cap bbox at 20km to keep Overpass fast
  const queryRadius = Math.min(rayonKm, 20);
  const delta = queryRadius / 111.32;
  const cosLat = Math.cos((lat * Math.PI) / 180);
  const south = lat - delta;
  const north = lat + delta;
  const west = lon - delta / cosLat;
  const east = lon + delta / cosLat;

  const query =
    `[out:json][timeout:20];` +
    `(node["phone"](${south},${west},${north},${east});` +
    `node["contact:phone"](${south},${west},${north},${east});` +
    `way["phone"](${south},${west},${north},${east});` +
    `way["contact:phone"](${south},${west},${north},${east});` +
    `);out center;`;

  const resp = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    body: `data=${encodeURIComponent(query)}`,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "Facturia/1.0",
    },
    signal: AbortSignal.timeout(25000),
  });
  if (!resp.ok) return [];

  const data = (await resp.json()) as {
    elements: Array<{
      lat?: number;
      lon?: number;
      center?: { lat: number; lon: number };
      tags?: Record<string, string>;
    }>;
  };

  return data.elements
    .map((e) => {
      const elat = e.lat ?? e.center?.lat;
      const elon = e.lon ?? e.center?.lon;
      const tags = e.tags ?? {};
      const rawPhone = tags.phone ?? tags["contact:phone"] ?? "";
      const phone = normalizePhone(rawPhone);
      const name = tags.name ?? tags.brand ?? "";
      if (!elat || !elon || !phone || !name) return null;
      return { lat: elat, lon: elon, name, phone };
    })
    .filter((e): e is OSMEntry => e !== null);
}

/** Enrich leads with phones from OSM. Mutates the lead array in-place. */
function enrichLeadsWithOSMPhones(leads: LeadResult[], osmEntries: OSMEntry[]): void {
  if (!osmEntries.length) return;

  for (const lead of leads) {
    if (lead.telephone) continue;
    const leadLat = lead._lat;
    const leadLon = lead._lon;
    if (leadLat === undefined || leadLon === undefined) continue;

    let bestScore = -1;
    let bestPhone: string | null = null;
    let bestDist = 0;
    let bestSim = 0;

    for (const osm of osmEntries) {
      // Distance in meters
      const distM = haversineKm(leadLat, leadLon, osm.lat, osm.lon) * 1000;
      if (distM > 200) continue;

      const sim = nameSimilarity(lead.nom, osm.name);

      // Reject very low confidence: far + no name match
      if (distM > 80 && sim < 0.2) continue;
      if (distM > 150 && sim < 0.4) continue;

      // Combined score (higher = better)
      const matchScore = (1 - distM / 200) * 0.55 + sim * 0.45;

      if (matchScore > bestScore) {
        bestScore = matchScore;
        bestPhone = osm.phone;
        bestDist = distM;
        bestSim = sim;
      }
    }

    if (bestPhone && bestScore > 0.2) {
      lead.telephone = bestPhone;
      lead.phone_source = "openstreetmap";
      // Confidence 0-100 based on match quality
      const conf = Math.round(
        ((1 - bestDist / 200) * 0.55 + bestSim * 0.45) * 100
      );
      lead.phone_confidence = Math.min(99, Math.max(30, conf));
    }
  }
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
    if (!geoRes.ok) return NextResponse.json({ error: "Erreur de géocodage" }, { status: 502 });
    const geoData = (await geoRes.json()) as { features: GeoFeature[] };
    if (!geoData.features?.length) {
      return NextResponse.json({ error: "Adresse introuvable" }, { status: 422 });
    }
    const feature = geoData.features[0];
    const [lon, lat] = feature.geometry.coordinates;
    const geocodedAddress = feature.properties.label;

    // 2. Extract department + adjacent departments for wide radius
    const context = feature.properties.context ?? "";
    const departement = context.split(",")[0].trim();
    const deptSet = new Set<string>([departement]);

    if (rayon_km > 30) {
      const R_EARTH = 111.32;
      const offsets = [
        [rayon_km / R_EARTH, 0],
        [-rayon_km / R_EARTH, 0],
        [0, rayon_km / (R_EARTH * Math.cos((lat * Math.PI) / 180))],
        [0, -rayon_km / (R_EARTH * Math.cos((lat * Math.PI) / 180))],
      ];
      await Promise.all(
        offsets.map(async ([dLat, dLon]) => {
          try {
            const r = await fetch(
              `https://geo.api.gouv.fr/communes?lat=${lat + dLat}&lon=${lon + dLon}&fields=codeDepartement&limit=1`,
              { signal: AbortSignal.timeout(5000) }
            );
            if (r.ok) {
              const arr = (await r.json()) as { codeDepartement?: string }[];
              if (arr[0]?.codeDepartement) deptSet.add(arr[0].codeDepartement);
            }
          } catch { /* skip */ }
        })
      );
    }

    // 3. Fetch entreprises + Overpass phones in parallel
    const MAX_PAGES = 3;

    const [entreprisesResult, osmResult] = await Promise.allSettled([
      // — Entreprises search
      (async () => {
        const all: EntrepriseResult[] = [];
        for (const dept of Array.from(deptSet)) {
          for (let page = 1; page <= MAX_PAGES; page++) {
            try {
              const url = `https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(metier)}&departement=${dept}&per_page=25&page=${page}`;
              const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
              if (!r.ok) break;
              const data = (await r.json()) as EntrepriseApiResponse;
              if (!data.results?.length) break;
              all.push(...data.results);
              if (page >= data.total_pages) break;
            } catch { break; }
          }
        }
        return all;
      })(),
      // — Overpass phones
      fetchOSMEntries(lat, lon, rayon_km).catch(() => [] as OSMEntry[]),
    ]);

    const allEntreprises = entreprisesResult.status === "fulfilled" ? entreprisesResult.value : [];
    const osmEntries = osmResult.status === "fulfilled" ? osmResult.value : [];

    const total_before_filter = allEntreprises.length;

    // 4. Deduplicate by siren
    const seen = new Set<string>();
    const unique = allEntreprises.filter((e) => {
      if (seen.has(e.siren)) return false;
      seen.add(e.siren);
      return true;
    });

    // 5. Normalize + haversine filter + score
    const leads: LeadResult[] = unique
      .map((e) => normalizeEntreprise(e, lat, lon, rayon_km, metier))
      .filter((l): l is LeadResult => l !== null)
      .sort((a, b) => b.score - a.score);

    // 6. Enrich with OSM phones (mutates leads)
    enrichLeadsWithOSMPhones(leads, osmEntries);

    // 7. Strip internal coords before returning
    const response = leads.map(({ _lat, _lon, ...lead }) => {
      void _lat; void _lon;
      return lead;
    });

    return NextResponse.json({
      leads: response,
      geocoded_address: geocodedAddress,
      lat,
      lon,
      total_before_filter,
      osm_entries_checked: osmEntries.length,
      phone_enriched: response.filter((l) => l.telephone).length,
    });
  } catch (err) {
    console.error("[leads/search]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
