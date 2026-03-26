/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Temporary production audit endpoint — measures real contribution of
 * official_registry, OSM, and website scraping in live environment.
 *
 * Protected by a one-time secret token.
 * TO REMOVE after audit is complete.
 */
import { NextRequest, NextResponse } from "next/server";

const AUDIT_SECRET = "4efe7e10edcd0ef4de8eb17515e54a39d0765d265f0a53f8";

// ─── All utilities (mirrored from search/route.ts) ────────────────────────────

type MatchMethod =
  | "address_exact"
  | "address_cp"
  | "address_proximity"
  | "name_high"
  | "name_medium"
  | "name_low"
  | "official_registry"
  | "website_tel_link"
  | "website_schema"
  | "website_text";

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function normalizePhone(raw: string): string | null {
  if (!raw?.trim()) return null;
  let d = raw.replace(/[^\d+]/g, "");
  if (!d) return null;
  if (d.startsWith("+33")) d = "0" + d.slice(3);
  if (d.startsWith("0033")) d = "0" + d.slice(4);
  if (d.startsWith("08")) return null;
  if (d.length === 10 && d.startsWith("0")) return `${d.slice(0,2)} ${d.slice(2,4)} ${d.slice(4,6)} ${d.slice(6,8)} ${d.slice(8,10)}`;
  if (d.length >= 9) return raw.trim();
  return null;
}

function normalizeName(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[''`´]/g, "").toLowerCase()
    .replace(/\b(sarl|sas|sasu|eurl|sci|snc|sa\b|sca|earl|auto[-\s]?entrepreneur)\b/g, "")
    .replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function nameSimilarity(a: string, b: string): number {
  const STOP = new Set(["les","des","une","pas","sur","par","the","chez","aux","avec"]);
  const words = (s: string) => new Set(normalizeName(s).split(" ").filter(w => w.length > 2 && !STOP.has(w)));
  const na = normalizeName(a), nb = normalizeName(b);
  if (na === nb) return 1.0;
  if (na.includes(nb) || nb.includes(na)) return 0.85;
  const aw = words(a), bw = words(b);
  if (!aw.size || !bw.size) return 0;
  const common = Array.from(aw).filter(w => bw.has(w)).length;
  return common / new Set([...Array.from(aw), ...Array.from(bw)]).size;
}

function bestNameSimilarity(names: string[], osmName: string): number {
  return Math.max(0, ...names.map(n => nameSimilarity(n, osmName)));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isLeadTradeCoherent(lead: any, metier: string): boolean {
  const mWords = normalizeName(metier).split(/\s+/).filter(w => w.length >= 4);
  if (!mWords.length) return true;
  const haystack = normalizeName([lead.nom, lead.activite, ...(lead._names ?? [])].filter(Boolean).join(" "));
  return mWords.some(w => haystack.includes(w.slice(0, 4)));
}

function scoreRelevance(activite: string, metier: string): number {
  if (!activite || !metier) return 0;
  const a = activite.toLowerCase(), m = metier.toLowerCase();
  if (a.includes(m)) return 30;
  const words = m.split(/\s+/).filter(w => w.length > 3);
  const matches = words.filter(w => a.includes(w));
  return matches.length === 0 ? 0 : Math.round((matches.length / words.length) * 20);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractCoords(siege: any): { lat: number; lon: number } | null {
  const rawLat = siege.latitude, rawLon = siege.longitude;
  if (rawLat !== undefined && rawLon !== undefined) {
    const lat = typeof rawLat === "string" ? parseFloat(rawLat) : rawLat;
    const lon = typeof rawLon === "string" ? parseFloat(rawLon) : rawLon;
    if (!isNaN(lat) && !isNaN(lon) && lat !== 0 && lon !== 0) return { lat, lon };
  }
  if (siege.coordonnees) {
    const [p0, p1] = siege.coordonnees.split(",");
    const lat = parseFloat(p0), lon = parseFloat(p1);
    if (!isNaN(lat) && !isNaN(lon) && lat !== 0 && lon !== 0) return { lat, lon };
  }
  return null;
}

function parseHousenumber(addr: string): string {
  const m = addr.match(/^(\d+\s*(?:BIS|TER|QUATER)?)\s/i);
  return m ? m[1].replace(/\s/g, "").toUpperCase() : "";
}
function parseStreet(addr: string): string {
  return addr.replace(/^\d+\s*(?:BIS|TER|QUATER)?\s+/i, "").replace(/\s+\d{5}.*$/, "").trim();
}

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
    case "website_text":      return 65;
  }
}

function extractPhonesFromHtml(html: string): { phones: string[]; method: MatchMethod } {
  const found = new Set<string>();
  let method: MatchMethod = "website_text";
  for (const m of Array.from(html.matchAll(/href=["']tel:([+\d\s\-\.()]{7,20})["']/gi))) {
    const phone = normalizePhone(m[1].trim());
    if (phone) { found.add(phone); method = "website_tel_link"; }
  }
  for (const m of Array.from(html.matchAll(/(?:itemprop=["']telephone["'][^>]*>([^<]{7,20})|["']telephone["']\s*:\s*["']([^"']{7,20})["'])/gi))) {
    const raw = (m[1] ?? m[2] ?? "").trim();
    const phone = normalizePhone(raw);
    if (phone) { found.add(phone); if (method === "website_text") method = "website_schema"; }
  }
  const stripped = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ").replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ").replace(/<[^>]+>/g, " ");
  for (const m of Array.from(stripped.matchAll(/(?<!\d)(0[1-79](?:[\s.\-]?\d{2}){4})(?!\d)/g))) {
    const phone = normalizePhone(m[1]);
    if (phone) found.add(phone);
  }
  return { phones: Array.from(found), method };
}

async function scrapeWebsitePhone(siteUrl: string): Promise<{ phone: string; secondary: string | null; method: MatchMethod; pageUrl: string } | null> {
  let base: string;
  try { const raw = siteUrl.startsWith("http") ? siteUrl : `https://${siteUrl}`; base = new URL(raw).origin; } catch { return null; }
  for (const path of ["", "/contact", "/nous-contacter", "/mentions-legales"]) {
    const pageUrl = base + path;
    try {
      const resp = await fetch(pageUrl, { headers: { "User-Agent": "Mozilla/5.0 (compatible; Facturia/2.0)", Accept: "text/html" }, signal: AbortSignal.timeout(5000), redirect: "follow" });
      if (!resp.ok) continue;
      if (!(resp.headers.get("content-type") ?? "").includes("html")) continue;
      const html = await resp.text();
      const { phones, method } = extractPhonesFromHtml(html);
      if (phones.length > 0) return { phone: phones[0], secondary: phones[1] ?? null, method, pageUrl };
    } catch { continue; }
  }
  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function enrichLeadWithAnnuaire(lead: any): Promise<void> {
  if (lead.telephone) return;
  try {
    const resp = await fetch(`https://api.annuaire-entreprises.data.gouv.fr/entreprise/${lead.siren}`, { signal: AbortSignal.timeout(5000) });
    if (!resp.ok) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await resp.json() as any;
    const regPhone = normalizePhone(data.siege?.telephone ?? data.telephone ?? "");
    if (regPhone) { lead.telephone = regPhone; lead.phone_source = "annuaire-entreprises"; lead.phone_confidence = 95; lead.phone_match_method = "official_registry"; return; }
    const siteUrl = data.siege?.site_internet ?? data.site_internet ?? "";
    if (!siteUrl) return;
    if (!lead.site_web) lead.site_web = siteUrl;
    const webResult = await scrapeWebsitePhone(siteUrl);
    if (webResult) { lead.telephone = webResult.phone; lead.phone_source = "website"; lead.phone_confidence = computeConfidence(webResult.method, 0, 0); lead.phone_match_method = webResult.method; lead.phone_secondary = webResult.secondary; lead.phone_page_url = webResult.pageUrl; }
  } catch { /* skip */ }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function enrichWithWebSources(leads: any[]): Promise<void> {
  const toEnrich = leads.filter(l => !l.telephone);
  if (!toEnrich.length) return;
  const CONCURRENCY = 8;
  for (let i = 0; i < toEnrich.length; i += CONCURRENCY) {
    await Promise.all(toEnrich.slice(i, i + CONCURRENCY).map(enrichLeadWithAnnuaire));
  }
}

const OVERPASS_MIRRORS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];

async function fetchOSMEntries(lat: number, lon: number, rayonKm: number) {
  const queryRadius = Math.min(rayonKm, 20);
  const delta = queryRadius / 111.32, cosLat = Math.cos((lat * Math.PI) / 180);
  const [s, n, w, e] = [lat - delta, lat + delta, lon - delta / cosLat, lon + delta / cosLat];
  const query = `[out:json][timeout:25];(node["phone"](${s},${w},${n},${e});node["contact:phone"](${s},${w},${n},${e});way["phone"](${s},${w},${n},${e});way["contact:phone"](${s},${w},${n},${e}););out center;`;
  for (const mirror of OVERPASS_MIRRORS) {
    try {
      const resp = await fetch(mirror, { method: "POST", body: `data=${encodeURIComponent(query)}`, headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "Facturia/2.0" }, signal: AbortSignal.timeout(25000) });
      if (!resp.ok) continue;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = await resp.json() as any;
      return data.elements.map((e: any) => {
        const elat = e.lat ?? e.center?.lat, elon = e.lon ?? e.center?.lon, tags = e.tags ?? {};
        const phone = normalizePhone(tags.phone ?? tags["contact:phone"] ?? "");
        if (!elat || !elon || !phone) return null;
        return { lat: elat, lon: elon, name: tags.name ?? tags.brand ?? "", phone, housenumber: (tags["addr:housenumber"] ?? "").toUpperCase(), street: tags["addr:street"] ?? "", postcode: tags["addr:postcode"] ?? "" };
      }).filter(Boolean);
    } catch { continue; }
  }
  return [];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function findPhoneMatch(lead: any, osmEntries: any[], metier: string) {
  if (lead._lat === undefined || lead._lon === undefined) return null;
  const { _lat: leadLat, _lon: leadLon } = lead;
  const leadNum = lead._housenumber ?? parseHousenumber(lead.adresse);
  const leadStreet = lead._street ?? parseStreet(lead.adresse);
  const leadNames = lead._names ?? [lead.nom];
  const candidates: { phone: string; method: MatchMethod; confidence: number; distM: number }[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const osm of osmEntries) {
    const distM = haversineKm(leadLat, leadLon, osm.lat, osm.lon) * 1000;
    if (distM > 350) continue;
    if (distM <= 300 && osm.housenumber && osm.street && leadNum && osm.housenumber === leadNum) {
      const ss = nameSimilarity(leadStreet, osm.street);
      if (ss >= 0.35) { candidates.push({ phone: osm.phone, method: "address_exact", confidence: computeConfidence("address_exact", distM, ss), distM }); continue; }
    }
    if (distM <= 250 && osm.housenumber && osm.postcode && leadNum && osm.housenumber === leadNum && osm.postcode === lead.code_postal) {
      candidates.push({ phone: osm.phone, method: "address_cp", confidence: computeConfidence("address_cp", distM, 0), distM }); continue;
    }
    if (distM <= 30 && osm.postcode && osm.postcode === lead.code_postal) {
      candidates.push({ phone: osm.phone, method: "address_proximity", confidence: computeConfidence("address_proximity", distM, 0), distM }); continue;
    }
    if (distM <= 200 && osm.name) {
      const sim = bestNameSimilarity(leadNames, osm.name);
      let method: MatchMethod | null = null;
      if (sim >= 0.70 && distM <= 150) method = "name_high";
      else if (sim >= 0.35 && distM <= 150) method = "name_medium";
      else if (sim >= 0.20 && distM <= 80 && isLeadTradeCoherent(lead, metier)) method = "name_low";
      if (method) candidates.push({ phone: osm.phone, method, confidence: computeConfidence(method, distM, sim), distM });
    }
  }
  if (!candidates.length) return null;
  candidates.sort((a, b) => b.confidence !== a.confidence ? b.confidence - a.confidence : a.distM - b.distM);
  const best = candidates[0];
  return { phone: best.phone, method: best.method, confidence: best.confidence, secondary: candidates.find(c => c.phone !== best.phone && c.confidence >= 40)?.phone ?? null };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function runScenario(adresse: string, metier: string, rayon_km: number): Promise<any> {
  const t0 = Date.now();

  // Geocode
  const geoRes = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(adresse)}&limit=1`, { signal: AbortSignal.timeout(10000) });
  const geoData = await geoRes.json() as { features: any[] };
  if (!geoData.features?.length) return { error: "Adresse introuvable" };
  const [lon, lat] = geoData.features[0].geometry.coordinates;
  const departement = (geoData.features[0].properties.context ?? "").split(",")[0].trim();

  // Entreprises + OSM
  const [entreprisesResult, osmResult] = await Promise.allSettled([
    (async () => {
      const all: any[] = [];
      for (let page = 1; page <= 3; page++) {
        try {
          const r = await fetch(`https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(metier)}&departement=${departement}&per_page=25&page=${page}`, { signal: AbortSignal.timeout(10000) });
          if (!r.ok) break;
          const d = await r.json() as any;
          if (!d.results?.length) break;
          all.push(...d.results);
          if (page >= d.total_pages) break;
        } catch { break; }
      }
      return all;
    })(),
    fetchOSMEntries(lat, lon, rayon_km).catch(() => []),
  ]);

  const allEntreprises = entreprisesResult.status === "fulfilled" ? entreprisesResult.value : [];
  const osmEntries = osmResult.status === "fulfilled" ? osmResult.value : [];

  const seen = new Set<string>();
  const leads = allEntreprises
    .filter((e: any) => { if (seen.has(e.siren)) return false; seen.add(e.siren); return true; })
    .map((e: any) => {
      if (!e.siege) return null;
      const coords = extractCoords(e.siege);
      if (!coords) return null;
      const distance_km = haversineKm(lat, lon, coords.lat, coords.lon);
      if (distance_km > rayon_km) return null;
      const activite = e.activite_principale ?? "";
      const score = Math.min(100, Math.max(0, Math.round(Math.max(0, 40 * (1 - distance_km / rayon_km)) + scoreRelevance(activite, metier))));
      const names = [e.nom_complet ?? ""];
      if (e.siege.nom_commercial) names.push(e.siege.nom_commercial);
      const num = e.siege.numero_voie != null ? String(e.siege.numero_voie).toUpperCase() : "";
      const street = [e.siege.type_voie, e.siege.libelle_voie].filter(Boolean).join(" ");
      return { nom: e.nom_complet ?? "—", activite, adresse: e.siege.adresse ?? "", ville: e.siege.libelle_commune ?? "", code_postal: e.siege.code_postal ?? "", telephone: null, phone_source: null, phone_confidence: null, phone_match_method: null, phone_secondary: null, phone_page_url: null, site_web: null, siret: e.siege.siret ?? null, siren: e.siren, distance_km: Math.round(distance_km * 10) / 10, score, _lat: coords.lat, _lon: coords.lon, _housenumber: num || undefined, _street: street || undefined, _names: names.filter(Boolean) };
    })
    .filter(Boolean);

  const totalCompanies = leads.length;

  // OSM enrichment
  for (const lead of leads as any[]) {
    const match = findPhoneMatch(lead, osmEntries, metier);
    if (!match) continue;
    lead.telephone = match.phone; lead.phone_source = "openstreetmap"; lead.phone_confidence = match.confidence; lead.phone_match_method = match.method; lead.phone_secondary = match.secondary;
  }
  const afterOSM = leads.filter((l: any) => l.telephone).length;

  // Web enrichment with 22s cap
  await Promise.race([enrichWithWebSources(leads), new Promise<void>(r => setTimeout(r, 22000))]);
  const afterWeb = leads.filter((l: any) => l.telephone).length;

  // Strict filter: phone required, name_low excluded
  const exploitable = leads.filter((l: any) => l.telephone !== null && l.phone_match_method !== "name_low");

  const bySource: Record<string, number> = {};
  const byMethod: Record<string, number> = {};
  exploitable.forEach((l: any) => {
    bySource[l.phone_source] = (bySource[l.phone_source] ?? 0) + 1;
    byMethod[l.phone_match_method] = (byMethod[l.phone_match_method] ?? 0) + 1;
  });

  const top5 = exploitable.slice(0, 5).map((l: any) => ({
    nom: l.nom,
    telephone: l.telephone,
    phone_secondary: l.phone_secondary ?? null,
    method: l.phone_match_method,
    confidence: l.phone_confidence,
    source: l.phone_source,
    adresse: `${l.adresse}, ${l.code_postal} ${l.ville}`,
    distance_km: l.distance_km,
    phone_page_url: l.phone_page_url ?? null,
  }));

  return {
    geocoded: geoData.features[0].properties.label,
    total_companies: totalCompanies,
    after_osm: afterOSM,
    after_web: afterWeb,
    exploitable: exploitable.length,
    osm_entries: osmEntries.length,
    high_confidence: exploitable.filter((l: any) => l.phone_confidence >= 80).length,
    probable: exploitable.filter((l: any) => l.phone_confidence >= 55 && l.phone_confidence < 80).length,
    by_source: bySource,
    by_method: byMethod,
    top5,
    duration_ms: Date.now() - t0,
  };
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== AUDIT_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const scenarios = [
    { label: "Paris / plombier / 10km",      adresse: "1 rue de Rivoli 75001 Paris",            metier: "plombier",   rayon_km: 10 },
    { label: "Lyon / serrurier / 10km",       adresse: "10 Rue de la République 69001 Lyon",      metier: "serrurier",  rayon_km: 10 },
    { label: "Marseille / boulanger / 10km",  adresse: "Quai du Port 13002 Marseille",             metier: "boulanger",  rayon_km: 10 },
  ];

  const results: Record<string, unknown> = {};
  for (const s of scenarios) {
    results[s.label] = await runScenario(s.adresse, s.metier, s.rayon_km);
    // Small pause between scenarios to avoid hammering external APIs
    await new Promise(r => setTimeout(r, 5000));
  }

  return NextResponse.json({ audit_date: new Date().toISOString(), results }, { status: 200 });
}
