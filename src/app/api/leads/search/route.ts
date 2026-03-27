import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

// ─── Types ────────────────────────────────────────────────────────────────────

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
  phone_match_method: string | null;
  phone_secondary: string | null;
  phone_page_url: string | null;
  google_places_id: string | null;  // Google Place ID — stored for attribution (ToS §3.2.3)
  email: string | null;
  site_web: string | null;
  siret: string | null;
  siren: string;
  distance_km: number;
  score: number;
  source: string;
  // Internal fields stripped before response
  _lat?: number;
  _lon?: number;
  _housenumber?: string;  // from numero_voie — more reliable than regex
  _street?: string;       // from libelle_voie
  _names?: string[];      // all commercial names to try for OSM matching
}

type MatchMethod =
  | "address_exact"       // housenumber + street → 80–92%
  | "address_cp"          // housenumber + postcode → 75–85%
  | "address_proximity"   // ≤30m + same postcode (no housenumber required) → 74–80%
  | "name_high"           // name sim ≥0.7, dist <150m → 68–85%
  | "name_medium"         // name sim 0.35–0.7 → 48–68%
  | "name_low"            // name sim 0.2–0.35 → 32–48%
  | "official_registry"   // annuaire-entreprises declared → 95%
  | "website_tel_link"    // <a href="tel:…"> → 85%
  | "website_schema"      // schema.org / itemprop → 82%
  | "website_text"        // text regex → 65%
  | "google_places_match";// Places API text search, name≥60% + postcode → 83–88%

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
  numero_voie?: string | number;
  type_voie?: string;
  libelle_voie?: string;
  nom_commercial?: string;
  liste_enseignes?: string[] | null;
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
  housenumber: string;
  street: string;
  postcode: string;
}

interface AnnuaireResponse {
  siege?: {
    telephone?: string | null;
    site_internet?: string | null;
    email?: string | null;
  };
  telephone?: string | null;
  site_internet?: string | null;
}

interface GooglePlacesPlace {
  id: string;
  displayName?: { text: string; languageCode?: string };
  internationalPhoneNumber?: string;
  nationalPhoneNumber?: string;
  addressComponents?: Array<{
    longText: string;
    shortText: string;
    types: string[];
  }>;
}

// ─── Utilities ────────────────────────────────────────────────────────────────

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

/** Normalize French phone → "0X XX XX XX XX". Rejects short/service numbers. */
function normalizePhone(raw: string): string | null {
  if (!raw?.trim()) return null;
  let d = raw.replace(/[^\d+]/g, "");
  if (!d) return null;
  if (d.startsWith("+33")) d = "0" + d.slice(3);
  if (d.startsWith("0033")) d = "0" + d.slice(4);
  if (d.startsWith("08")) return null;
  if (d.length === 10 && d.startsWith("0")) {
    return `${d.slice(0, 2)} ${d.slice(2, 4)} ${d.slice(4, 6)} ${d.slice(6, 8)} ${d.slice(8, 10)}`;
  }
  if (d.length >= 9) return raw.trim();
  return null;
}

function normalizeName(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[''`´]/g, "")
    .toLowerCase()
    .replace(/\b(sarl|sas|sasu|eurl|sci|snc|sa\b|sca|earl|auto[-\s]?entrepreneur)\b/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Jaccard similarity on significant words after normalization. */
function nameSimilarity(a: string, b: string): number {
  const STOP = new Set(["les", "des", "une", "pas", "sur", "par", "the", "chez", "aux", "avec"]);
  const words = (s: string): Set<string> => {
    const norm = normalizeName(s);
    return new Set(norm.split(" ").filter((w) => w.length > 2 && !STOP.has(w)));
  };
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (na === nb) return 1.0;
  if (na.includes(nb) || nb.includes(na)) return 0.85;
  const aw = words(a);
  const bw = words(b);
  if (!aw.size || !bw.size) return 0;
  const common = Array.from(aw).filter((w) => bw.has(w)).length;
  const union = new Set(Array.from(aw).concat(Array.from(bw))).size;
  return common / union;
}

/** Best similarity across all candidate names for a lead. */
function bestNameSimilarity(leadNames: string[], osmName: string): number {
  return Math.max(0, ...leadNames.map((n) => nameSimilarity(n, osmName)));
}

/**
 * For name_low (weakest match), validate the lead itself is coherent with the
 * searched trade before accepting a phone from a barely-matching OSM entity.
 * Checks the lead's company name + activité label against the metier.
 * Uses a 4-char prefix so "plombier"→"plom" matches "plomberie",
 * "serrurier"→"serr" matches "serrurerie", etc.
 *
 * This prevents cross-sector false positives (e.g. a vet clinic getting a
 * locksmith phone) while keeping legitimate leads whose name or NAF label
 * contains a trade signal.
 */
function isLeadTradeCoherent(lead: LeadResult, metier: string): boolean {
  const PREFIX_LEN = 4;
  const metierWords = normalizeName(metier)
    .split(/\s+/)
    .filter((w) => w.length >= PREFIX_LEN);
  if (!metierWords.length) return true; // too short to check — allow

  const haystack = normalizeName(
    [lead.nom, lead.activite, ...(lead._names ?? [])].filter(Boolean).join(" ")
  );
  return metierWords.some((w) => haystack.includes(w.slice(0, PREFIX_LEN)));
}

function scoreRelevance(activite: string, metier: string): number {
  if (!activite || !metier) return 0;
  const a = activite.toLowerCase();
  const m = metier.toLowerCase();
  if (a.includes(m)) return 30;
  const words = m.split(/\s+/).filter((w) => w.length > 3);
  const matches = words.filter((w) => a.includes(w));
  return matches.length === 0 ? 0 : Math.round((matches.length / words.length) * 20);
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

// Kept as fallback when API fields are absent
function parseHousenumber(addr: string): string {
  const m = addr.match(/^(\d+\s*(?:BIS|TER|QUATER)?)\s/i);
  return m ? m[1].replace(/\s/g, "").toUpperCase() : "";
}
function parseStreet(addr: string): string {
  return addr
    .replace(/^\d+\s*(?:BIS|TER|QUATER)?\s+/i, "")
    .replace(/\s+\d{5}.*$/, "")
    .trim();
}

// ─── Confidence calculation ───────────────────────────────────────────────────

function computeConfidence(method: MatchMethod, distM: number, nameSim: number): number {
  switch (method) {
    case "address_exact":     return Math.max(80, Math.min(92, 92 - Math.round(distM / 10)));
    case "address_cp":        return Math.max(75, Math.min(85, 85 - Math.round(distM / 12)));
    case "address_proximity": return Math.max(74, Math.min(80, 80 - Math.round(distM / 5)));
    case "name_high":         return Math.max(68, Math.min(85, Math.round((1 - distM / 200) * 40 + nameSim * 45)));
    case "name_medium":       return Math.max(48, Math.min(68, Math.round((1 - distM / 200) * 30 + nameSim * 38)));
    case "name_low":          return Math.max(32, Math.min(48, Math.round((1 - distM / 200) * 20 + nameSim * 28)));
    case "official_registry": return 95;
    case "website_tel_link":  return 85;
    case "website_schema":    return 82;
    case "website_text":         return 65;
    case "google_places_match":  return 83;
  }
}

// ─── Website phone scraping ───────────────────────────────────────────────────

/**
 * Extract phone numbers from HTML content.
 * Priority: tel: links → JSON-LD LocalBusiness → schema.org/itemprop → text regex.
 */
function extractPhonesFromHtml(html: string): { phones: string[]; method: MatchMethod } {
  // Cap size to avoid slow processing on bloated pages
  const content = html.length > 150_000 ? html.slice(0, 150_000) : html;
  const found = new Set<string>();
  let method: MatchMethod = "website_text";

  // Priority 1: tel: href links (company-intentional, most reliable)
  for (const m of Array.from(content.matchAll(/href=["']tel:([+\d\s\-\.()]{7,20})["']/gi))) {
    const phone = normalizePhone(m[1].trim());
    if (phone) { found.add(phone); method = "website_tel_link"; }
  }

  // Priority 2a: JSON-LD LocalBusiness / Organization — parses <script type="application/ld+json">
  for (const m of Array.from(content.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi))) {
    try {
      const json = JSON.parse(m[1]) as Record<string, unknown>;
      // Support top-level object, array, or @graph container
      const entries: Record<string, unknown>[] = Array.isArray(json)
        ? json as Record<string, unknown>[]
        : json["@graph"]
          ? json["@graph"] as Record<string, unknown>[]
          : [json];
      for (const entry of entries) {
        const raw = ((entry.telephone ?? entry.phone ?? "") as string).trim();
        const phone = normalizePhone(raw);
        if (phone) {
          found.add(phone);
          if (method === "website_text") method = "website_schema";
        }
      }
    } catch { /* malformed JSON-LD — skip */ }
  }

  // Priority 2b: itemprop="telephone" and inline JSON "telephone": "..."
  for (const m of Array.from(content.matchAll(/(?:itemprop=["']telephone["'][^>]*>([^<]{7,20})|["']telephone["']\s*:\s*["']([^"']{7,20})["'])/gi))) {
    const raw = (m[1] ?? m[2] ?? "").trim();
    const phone = normalizePhone(raw);
    if (phone) {
      found.add(phone);
      if (method === "website_text") method = "website_schema";
    }
  }

  // Priority 3: French phone patterns in stripped text
  const stripped = content
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ");

  // Standard format 0X XX XX XX XX — covers landlines (01-05,09) + mobiles (06,07)
  for (const m of Array.from(stripped.matchAll(/(?<!\d)(0[1-79](?:[\s.\-]?\d{2}){4})(?!\d)/g))) {
    const phone = normalizePhone(m[1]);
    if (phone) found.add(phone);
  }

  // International format +33 X XX XX XX XX — catches mobiles written as +33 6... / +33 7...
  for (const m of Array.from(stripped.matchAll(/(?<!\d)(\+33[\s.\-]?[1-79](?:[\s.\-]?\d{2}){4})(?!\d)/g))) {
    const phone = normalizePhone(m[1]);
    if (phone) found.add(phone);
  }

  return { phones: Array.from(found), method };
}

/**
 * Fetch a website and extract phone numbers.
 * Tries homepage, then /contact page.
 * Returns null if no phone found or site unreachable.
 */
async function scrapeWebsitePhone(
  siteUrl: string
): Promise<{ phone: string; secondary: string | null; method: MatchMethod; pageUrl: string } | null> {
  // Normalize URL
  let base: string;
  try {
    const raw = siteUrl.startsWith("http") ? siteUrl : `https://${siteUrl}`;
    base = new URL(raw).origin;
  } catch { return null; }

  const pagesToTry = [
    "",
    "/contact",
    "/nous-contacter",
    "/contactez-nous",
    "/coordonnees",
    "/a-propos",
    "/mentions-legales",
    "/contact.html",
  ];

  for (const path of pagesToTry) {
    const pageUrl = base + path;
    try {
      const resp = await fetch(pageUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; Facturia/2.0)",
          Accept: "text/html",
        },
        signal: AbortSignal.timeout(5000),
        redirect: "follow",
      });
      if (!resp.ok) continue;
      const ct = resp.headers.get("content-type") ?? "";
      if (!ct.includes("html")) continue;
      const html = await resp.text();
      const { phones, method } = extractPhonesFromHtml(html);
      if (phones.length > 0) {
        return {
          phone: phones[0],
          secondary: phones[1] ?? null,
          method,
          pageUrl,
        };
      }
    } catch { continue; }
  }
  return null;
}

// ─── Annuaire-Entreprises enrichment ─────────────────────────────────────────

/**
 * For a lead without a phone:
 * 1. Call api.annuaire-entreprises.data.gouv.fr for telephone / site_internet
 * 2. If telephone found in registry → use it (confidence 95%)
 * 3. If site_internet found → scrape it for phone
 */
async function enrichLeadWithAnnuaire(lead: LeadResult): Promise<void> {
  if (lead.telephone) return; // already enriched
  try {
    const resp = await fetch(
      `https://api.annuaire-entreprises.data.gouv.fr/entreprise/${lead.siren}`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!resp.ok) return;
    const data = (await resp.json()) as AnnuaireResponse;

    // 1. Direct phone from official registry
    const regPhone = normalizePhone(
      data.siege?.telephone ?? data.telephone ?? ""
    );
    if (regPhone) {
      lead.telephone = regPhone;
      lead.phone_source = "annuaire-entreprises";
      lead.phone_confidence = computeConfidence("official_registry", 0, 0);
      lead.phone_match_method = "official_registry";
      return;
    }

    // 2. Website declared in registry → scrape it
    const siteUrl = data.siege?.site_internet ?? data.site_internet ?? "";
    if (!siteUrl) return;

    if (!lead.site_web) lead.site_web = siteUrl;

    const webResult = await scrapeWebsitePhone(siteUrl);
    if (webResult) {
      lead.telephone = webResult.phone;
      lead.phone_source = "website";
      lead.phone_confidence = computeConfidence(webResult.method, 0, 0);
      lead.phone_match_method = webResult.method;
      lead.phone_secondary = webResult.secondary;
      lead.phone_page_url = webResult.pageUrl;
    }
  } catch { /* network error — skip */ }
}

/**
 * Enrich all leads that still lack a phone via annuaire-entreprises + website.
 * Runs with concurrency cap. Returns when done or after global timeout.
 */
async function enrichWithWebSources(leads: LeadResult[]): Promise<void> {
  const toEnrich = leads.filter((l) => !l.telephone);
  if (!toEnrich.length) return;

  const CONCURRENCY = 8;
  for (let i = 0; i < toEnrich.length; i += CONCURRENCY) {
    const chunk = toEnrich.slice(i, i + CONCURRENCY);
    await Promise.all(chunk.map(enrichLeadWithAnnuaire));
  }
}

// ─── Google Places enrichment ─────────────────────────────────────────────────

/**
 * For a lead without a phone, query the Google Places Text Search API.
 *
 * Billing: SKU "Text Search (Advanced)" = $30.00 / 1 000 requests.
 * Triggered because the field mask includes internationalPhoneNumber.
 *
 * Match rules (both must pass to avoid false positives):
 *   1. Postcode from Google addressComponents === lead.code_postal
 *   2. Name similarity between Google displayName and any lead name ≥ 0.60
 *
 * Confidence: 65 + nameSim × 30, capped at 88 (min 83 when nameSim = 0.60).
 * All results are in the "fiable" or "probable" tier — no uncertain leads.
 *
 * Attribution: google_places_id must be persisted (allowed by ToS §3.2.3).
 * The UI must display "via Google" when phone_source === "google_places".
 */
async function findGooglePlacesPhone(
  lead: LeadResult,
  apiKey: string
): Promise<{ phone: string; placeId: string; confidence: number } | null> {
  if (lead._lat === undefined || lead._lon === undefined) return null;

  const names = lead._names ?? [lead.nom];
  // Targeted query: primary name + postcode + city for disambiguation
  const query = `${names[0]} ${lead.code_postal} ${lead.ville}`;

  // Field mask: only what we need. internationalPhoneNumber triggers Advanced SKU.
  const fieldMask = [
    "places.id",
    "places.displayName",
    "places.internationalPhoneNumber",
    "places.nationalPhoneNumber",
    "places.addressComponents",
  ].join(",");

  try {
    const resp = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": fieldMask,
      },
      body: JSON.stringify({
        textQuery: query,
        locationBias: {
          circle: {
            center: { latitude: lead._lat, longitude: lead._lon },
            radius: 200.0, // 200m around the lead's geocoded address
          },
        },
        maxResultCount: 5,
        languageCode: "fr",
        regionCode: "fr",
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (!resp.ok) return null;
    const data = (await resp.json()) as { places?: GooglePlacesPlace[] };
    const places = data.places ?? [];

    for (const place of places) {
      const phone = normalizePhone(
        place.internationalPhoneNumber ?? place.nationalPhoneNumber ?? ""
      );
      if (!phone) continue;

      // Gate 1: postcode must match exactly
      const placePostcode =
        place.addressComponents?.find((c) => c.types.includes("postal_code"))?.shortText ?? "";
      if (placePostcode !== lead.code_postal) continue;

      // Gate 2: name similarity ≥ 0.60 (Jaccard on normalised words)
      const placeName = place.displayName?.text ?? "";
      const nameSim = bestNameSimilarity(names, placeName);
      if (nameSim < 0.60) continue;

      // Confidence: 83–88% (always in the reliable tier)
      const confidence = Math.min(88, Math.round(65 + nameSim * 30));
      return { phone, placeId: place.id, confidence };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Enrich leads that still lack a phone after OSM matching.
 * Runs with concurrency cap of 5 to stay well within Google's QPS limits.
 */
async function enrichWithGooglePlaces(leads: LeadResult[], apiKey: string): Promise<void> {
  const toEnrich = leads.filter((l) => !l.telephone && l._lat !== undefined);
  if (!toEnrich.length) return;

  const CONCURRENCY = 5;
  for (let i = 0; i < toEnrich.length; i += CONCURRENCY) {
    const chunk = toEnrich.slice(i, i + CONCURRENCY);
    await Promise.all(
      chunk.map(async (lead) => {
        const result = await findGooglePlacesPhone(lead, apiKey);
        if (!result) return;
        lead.telephone = result.phone;
        lead.phone_source = "google_places";
        lead.phone_confidence = result.confidence;
        lead.phone_match_method = "google_places_match";
        lead.google_places_id = result.placeId;
      })
    );
  }
}

// ─── Overpass OSM fetcher ─────────────────────────────────────────────────────

const OVERPASS_MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

async function fetchOSMEntries(
  lat: number,
  lon: number,
  rayonKm: number
): Promise<OSMEntry[]> {
  const queryRadius = Math.min(rayonKm, 20);
  const delta = queryRadius / 111.32;
  const cosLat = Math.cos((lat * Math.PI) / 180);
  const south = lat - delta;
  const north = lat + delta;
  const west = lon - delta / cosLat;
  const east = lon + delta / cosLat;

  const query =
    `[out:json][timeout:25];` +
    `(node["phone"](${south},${west},${north},${east});` +
    `node["contact:phone"](${south},${west},${north},${east});` +
    `way["phone"](${south},${west},${north},${east});` +
    `way["contact:phone"](${south},${west},${north},${east});` +
    `);out center;`;

  for (const mirror of OVERPASS_MIRRORS) {
    try {
      const resp = await fetch(mirror, {
        method: "POST",
        body: `data=${encodeURIComponent(query)}`,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "Facturia/2.0",
        },
        signal: AbortSignal.timeout(25000),
      });
      if (!resp.ok) continue;
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
          if (!elat || !elon || !phone) return null;
          return {
            lat: elat,
            lon: elon,
            name: tags.name ?? tags.brand ?? "",
            phone,
            housenumber: (tags["addr:housenumber"] ?? "").toUpperCase(),
            street: tags["addr:street"] ?? "",
            postcode: tags["addr:postcode"] ?? "",
          };
        })
        .filter((e): e is OSMEntry => e !== null);
    } catch { continue; }
  }
  return [];
}

// ─── OSM phone matching pipeline ─────────────────────────────────────────────

function findPhoneMatch(
  lead: LeadResult,
  osmEntries: OSMEntry[],
  metier: string
): { phone: string; method: MatchMethod; confidence: number; secondary: string | null } | null {
  if (lead._lat === undefined || lead._lon === undefined) return null;

  const leadLat = lead._lat;
  const leadLon = lead._lon;
  // Use pre-parsed fields (from API) with fallback to regex parsing
  const leadNum = lead._housenumber ?? parseHousenumber(lead.adresse);
  const leadStreet = lead._street ?? parseStreet(lead.adresse);
  const leadNames = lead._names ?? [lead.nom];

  interface Candidate {
    phone: string;
    method: MatchMethod;
    confidence: number;
    distM: number;
  }

  const candidates: Candidate[] = [];

  for (const osm of osmEntries) {
    const distM = haversineKm(leadLat, leadLon, osm.lat, osm.lon) * 1000;
    if (distM > 350) continue;

    // Strategy 1: Address exact (housenumber + street)
    if (distM <= 300 && osm.housenumber && osm.street && leadNum) {
      if (osm.housenumber === leadNum) {
        const streetSim = nameSimilarity(leadStreet, osm.street);
        if (streetSim >= 0.35) {
          candidates.push({ phone: osm.phone, method: "address_exact", confidence: computeConfidence("address_exact", distM, streetSim), distM });
          continue;
        }
      }
    }

    // Strategy 2: Address postcode (housenumber + CP)
    if (distM <= 250 && osm.housenumber && osm.postcode && leadNum) {
      if (osm.housenumber === leadNum && osm.postcode === lead.code_postal) {
        candidates.push({ phone: osm.phone, method: "address_cp", confidence: computeConfidence("address_cp", distM, 0), distM });
        continue;
      }
    }

    // Strategy 2b: Proximity + postcode — catches OSM entries without addr:housenumber/street
    // Two geographic constraints (distance ≤30m + same CP) without relying on name
    if (distM <= 30 && osm.postcode && osm.postcode === lead.code_postal) {
      candidates.push({ phone: osm.phone, method: "address_proximity", confidence: computeConfidence("address_proximity", distM, 0), distM });
      continue;
    }

    // Strategy 3: Name similarity (multi-name: try nom_complet + nom_commercial)
    if (distM <= 200 && osm.name) {
      const sim = bestNameSimilarity(leadNames, osm.name);
      let method: MatchMethod | null = null;
      if (sim >= 0.70 && distM <= 150) method = "name_high";
      else if (sim >= 0.35 && distM <= 150) method = "name_medium";
      else if (sim >= 0.20 && distM <= 80) {
        // name_low is weak — require the lead itself to be trade-coherent
        // (checks lead nom + activité vs metier, not the OSM entry)
        if (isLeadTradeCoherent(lead, metier)) method = "name_low";
      }
      if (method) {
        candidates.push({ phone: osm.phone, method, confidence: computeConfidence(method, distM, sim), distM });
      }
    }
  }

  if (!candidates.length) return null;

  candidates.sort((a, b) =>
    b.confidence !== a.confidence ? b.confidence - a.confidence : a.distM - b.distM
  );

  const best = candidates[0];
  const secondary = candidates.find((c) => c.phone !== best.phone && c.confidence >= 40)?.phone ?? null;
  return { phone: best.phone, method: best.method, confidence: best.confidence, secondary };
}

function enrichLeadsOSM(leads: LeadResult[], osmEntries: OSMEntry[], metier: string): void {
  if (!osmEntries.length) return;
  for (const lead of leads) {
    const match = findPhoneMatch(lead, osmEntries, metier);
    if (!match) continue;
    lead.telephone = match.phone;
    lead.phone_source = "openstreetmap";
    lead.phone_confidence = match.confidence;
    lead.phone_match_method = match.method;
    lead.phone_secondary = match.secondary;
  }
}

// ─── Entreprise normalization ─────────────────────────────────────────────────

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
  const score = Math.min(100, Math.max(0, Math.round(
    Math.max(0, 40 * (1 - distance_km / rayonKm)) + scoreRelevance(activite, metier)
  )));

  // Build all names for OSM matching
  const names: string[] = [e.nom_complet ?? ""];
  if (e.siege.nom_commercial) names.push(e.siege.nom_commercial);
  if (Array.isArray(e.siege.liste_enseignes)) {
    for (const en of e.siege.liste_enseignes) {
      if (en && !names.includes(en)) names.push(en);
    }
  }

  // Build parsed address fields for reliable address matching
  const num = e.siege.numero_voie != null ? String(e.siege.numero_voie).toUpperCase() : "";
  const voie = e.siege.libelle_voie ?? "";
  const typeVoie = e.siege.type_voie ?? "";
  const street = [typeVoie, voie].filter(Boolean).join(" ");

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
    phone_match_method: null,
    phone_secondary: null,
    phone_page_url: null,
    google_places_id: null,
    email: null,
    site_web: null,
    siret: e.siege.siret ?? null,
    siren: e.siren,
    distance_km: Math.round(distance_km * 10) / 10,
    score,
    source: "annuaire-entreprises",
    _lat: coords.lat,
    _lon: coords.lon,
    _housenumber: num || undefined,
    _street: street || undefined,
    _names: names.filter(Boolean),
  };
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { adresse, metier, rayon_km } = body as {
      adresse: string; metier: string; rayon_km: number;
    };

    if (!adresse?.trim() || !metier?.trim() || !rayon_km) {
      return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
    }
    if (rayon_km < 1 || rayon_km > 500) {
      return NextResponse.json({ error: "Rayon invalide (1-500 km)" }, { status: 400 });
    }

    // 1. Geocode
    const geoRes = await fetch(
      `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(adresse)}&limit=1`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (!geoRes.ok) return NextResponse.json({ error: "Erreur de géocodage" }, { status: 502 });
    const geoData = (await geoRes.json()) as { features: GeoFeature[] };
    if (!geoData.features?.length) {
      return NextResponse.json({ error: "Adresse introuvable" }, { status: 422 });
    }
    const feature = geoData.features[0];
    const [lon, lat] = feature.geometry.coordinates;
    const geocodedAddress = feature.properties.label;

    // 2. Departments for wide-radius search
    const departement = (feature.properties.context ?? "").split(",")[0].trim();
    const deptSet = new Set<string>([departement]);
    if (rayon_km > 30) {
      const R_EARTH = 111.32;
      const offsets = [
        [rayon_km / R_EARTH, 0],
        [-rayon_km / R_EARTH, 0],
        [0, rayon_km / (R_EARTH * Math.cos((lat * Math.PI) / 180))],
        [0, -rayon_km / (R_EARTH * Math.cos((lat * Math.PI) / 180))],
      ];
      await Promise.all(offsets.map(async ([dLat, dLon]) => {
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
      }));
    }

    // 3. Fetch entreprises + Overpass in parallel
    const MAX_PAGES = 3;
    const [entreprisesResult, osmResult] = await Promise.allSettled([
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
      fetchOSMEntries(lat, lon, rayon_km).catch(() => [] as OSMEntry[]),
    ]);

    const allEntreprises = entreprisesResult.status === "fulfilled" ? entreprisesResult.value : [];
    const osmEntries = osmResult.status === "fulfilled" ? osmResult.value : [];

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

    const totalCompanies = leads.length;

    // 6. OSM enrichment (fast — in-memory loop)
    enrichLeadsOSM(leads, osmEntries, metier);

    // 7. Web enrichment (annuaire-entreprises + website scraping) with 22s cap
    await Promise.race([
      enrichWithWebSources(leads),
      new Promise<void>((resolve) => setTimeout(resolve, 22000)),
    ]);

    // 7b. Google Places enrichment — only for leads still without phone
    // SKU: Text Search (Advanced) = $30.00 / 1 000 requests
    const googleApiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (googleApiKey) {
      await Promise.race([
        enrichWithGooglePlaces(leads, googleApiKey),
        new Promise<void>((resolve) => setTimeout(resolve, 22000)),
      ]);
    }

    // 8. STRICT FILTER — only leads with a valid phone AND reliable match method
    // name_low (confidence 32–48%) is excluded: too weak for prospection
    const exploitable = leads.filter(
      (l) => l.telephone !== null && l.phone_match_method !== "name_low"
    );

    // 9. Strip internal fields before response
    const response = exploitable.map(
      ({ _lat, _lon, _housenumber, _street, _names, ...lead }) => {
        void _lat; void _lon; void _housenumber; void _street; void _names;
        return lead;
      }
    );

    // Diagnostics
    const byMethod: Record<string, number> = {};
    response.forEach((l) => {
      if (l.phone_match_method) byMethod[l.phone_match_method] = (byMethod[l.phone_match_method] ?? 0) + 1;
    });
    const bySource: Record<string, number> = {};
    response.forEach((l) => {
      if (l.phone_source) bySource[l.phone_source] = (bySource[l.phone_source] ?? 0) + 1;
    });
    const googlePlacesCalls = response.filter((l) => l.phone_source === "google_places").length;

    return NextResponse.json({
      leads: response,
      geocoded_address: geocodedAddress,
      lat,
      lon,
      total_companies: totalCompanies,
      phone_enriched: response.length,
      osm_entries_checked: osmEntries.length,
      phone_by_method: byMethod,
      phone_by_source: bySource,
      google_places_calls: googlePlacesCalls,
    });
  } catch (err) {
    console.error("[leads/search]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
