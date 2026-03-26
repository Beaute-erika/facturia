/**
 * Retry audit for Lyon/Marseille with proper addresses and longer waits between Overpass calls.
 */

// ─── Copy all utilities from audit-leads.mjs ─────────────────────────────────

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function normalizePhone(raw) {
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
function normalizeName(s) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[''`´]/g,"").toLowerCase()
    .replace(/\b(sarl|sas|sasu|eurl|sci|snc|sa\b|sca|earl|auto[-\s]?entrepreneur)\b/g,"")
    .replace(/[^a-z0-9\s]/g," ").replace(/\s+/g," ").trim();
}
function nameSimilarity(a, b) {
  const STOP = new Set(["les","des","une","pas","sur","par","the","chez","aux","avec"]);
  const words = (s) => new Set(normalizeName(s).split(" ").filter(w => w.length > 2 && !STOP.has(w)));
  const na = normalizeName(a), nb = normalizeName(b);
  if (na === nb) return 1.0;
  if (na.includes(nb) || nb.includes(na)) return 0.85;
  const aw = words(a), bw = words(b);
  if (!aw.size || !bw.size) return 0;
  const common = Array.from(aw).filter(w => bw.has(w)).length;
  const union = new Set(Array.from(aw).concat(Array.from(bw))).size;
  return common / union;
}
function scoreRelevance(activite, metier) {
  if (!activite || !metier) return 0;
  const a = activite.toLowerCase(), m = metier.toLowerCase();
  if (a.includes(m)) return 30;
  const words = m.split(/\s+/).filter(w => w.length > 3);
  const matches = words.filter(w => a.includes(w));
  return matches.length === 0 ? 0 : Math.round((matches.length / words.length) * 20);
}
function extractCoords(siege) {
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
function parseHousenumber(addr) {
  const m = addr.match(/^(\d+\s*(?:BIS|TER|QUATER)?)\s/i);
  return m ? m[1].replace(/\s/g,"").toUpperCase() : "";
}
function parseStreet(addr) {
  return addr.replace(/^\d+\s*(?:BIS|TER|QUATER)?\s+/i,"").replace(/\s+\d{5}.*$/,"").trim();
}
function computeConfidence(method, distM, nameSim) {
  switch (method) {
    case "address_exact": return Math.max(80, Math.min(92, 92 - Math.round(distM / 10)));
    case "address_cp":    return Math.max(75, Math.min(85, 85 - Math.round(distM / 12)));
    case "name_high":     return Math.max(68, Math.min(85, Math.round((1 - distM/200)*40 + nameSim*45)));
    case "name_medium":   return Math.max(48, Math.min(68, Math.round((1 - distM/200)*30 + nameSim*38)));
    case "name_low":      return Math.max(32, Math.min(48, Math.round((1 - distM/200)*20 + nameSim*28)));
  }
}
function findPhoneMatch(lead, osmEntries) {
  if (lead._lat === undefined || lead._lon === undefined) return null;
  const leadLat = lead._lat, leadLon = lead._lon;
  const leadNum = parseHousenumber(lead.adresse);
  const leadStreet = parseStreet(lead.adresse);
  const candidates = [];
  for (const osm of osmEntries) {
    const distM = haversineKm(leadLat, leadLon, osm.lat, osm.lon) * 1000;
    if (distM > 350) continue;
    if (distM <= 300 && osm.housenumber && osm.street && leadNum && osm.housenumber === leadNum) {
      const streetSim = nameSimilarity(leadStreet, osm.street);
      if (streetSim >= 0.35) { candidates.push({ phone: osm.phone, method: "address_exact", confidence: computeConfidence("address_exact", distM, streetSim), distM }); continue; }
    }
    if (distM <= 250 && osm.housenumber && osm.postcode && leadNum && osm.housenumber === leadNum && osm.postcode === lead.code_postal) {
      candidates.push({ phone: osm.phone, method: "address_cp", confidence: computeConfidence("address_cp", distM, 0), distM }); continue;
    }
    if (distM <= 200 && osm.name) {
      const sim = nameSimilarity(lead.nom, osm.name);
      let method = null;
      if (sim >= 0.70 && distM <= 150) method = "name_high";
      else if (sim >= 0.35 && distM <= 150) method = "name_medium";
      else if (sim >= 0.20 && distM <= 80) method = "name_low";
      if (method) candidates.push({ phone: osm.phone, method, confidence: computeConfidence(method, distM, sim), distM });
    }
  }
  if (!candidates.length) return null;
  candidates.sort((a,b) => b.confidence !== a.confidence ? b.confidence - a.confidence : a.distM - b.distM);
  const best = candidates[0];
  const secondary = candidates.find(c => c.phone !== best.phone && c.confidence >= 40)?.phone ?? null;
  return { phone: best.phone, method: best.method, confidence: best.confidence, secondary };
}
function enrichLeads(leads, osmEntries) {
  if (!osmEntries.length) return;
  for (const lead of leads) {
    const match = findPhoneMatch(lead, osmEntries);
    if (!match) continue;
    lead.telephone = match.phone;
    lead.phone_source = "openstreetmap";
    lead.phone_confidence = match.confidence;
    lead.phone_match_method = match.method;
    lead.phone_secondary = match.secondary;
  }
}

async function fetchOSMEntries(lat, lon, rayonKm) {
  const queryRadius = Math.min(rayonKm, 20);
  const delta = queryRadius / 111.32;
  const cosLat = Math.cos((lat * Math.PI) / 180);
  const query =
    `[out:json][timeout:25];` +
    `(node["phone"](${lat - delta},${lon - delta/cosLat},${lat + delta},${lon + delta/cosLat});` +
    `node["contact:phone"](${lat - delta},${lon - delta/cosLat},${lat + delta},${lon + delta/cosLat});` +
    `way["phone"](${lat - delta},${lon - delta/cosLat},${lat + delta},${lon + delta/cosLat});` +
    `way["contact:phone"](${lat - delta},${lon - delta/cosLat},${lat + delta},${lon + delta/cosLat});` +
    `);out center;`;
  const resp = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    body: `data=${encodeURIComponent(query)}`,
    headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "Facturia/1.0" },
  });
  if (!resp.ok) {
    const txt = await resp.text().catch(() => "");
    console.log(`   ⚠️ Overpass HTTP ${resp.status}: ${txt.slice(0,120)}`);
    return [];
  }
  const text = await resp.text();
  let data;
  try { data = JSON.parse(text); } catch { console.log(`   ⚠️ Overpass parse error`); return []; }
  return data.elements.map(e => {
    const elat = e.lat ?? e.center?.lat, elon = e.lon ?? e.center?.lon;
    const tags = e.tags ?? {};
    const phone = normalizePhone(tags.phone ?? tags["contact:phone"] ?? "");
    if (!elat || !elon || !phone) return null;
    return { lat: elat, lon: elon, name: tags.name ?? tags.brand ?? "", phone,
      housenumber: (tags["addr:housenumber"] ?? "").toUpperCase(), street: tags["addr:street"] ?? "", postcode: tags["addr:postcode"] ?? "" };
  }).filter(e => e !== null);
}

async function runSearch(label, adresse, metier, rayon_km) {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`🔍 ${label} | ${metier} | ${rayon_km} km`);
  console.log("═".repeat(60));

  const geoRes = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(adresse)}&limit=1`);
  const geoData = await geoRes.json();
  if (!geoData.features?.length) { console.log("❌ Adresse introuvable"); return; }
  const feature = geoData.features[0];
  const [lon, lat] = feature.geometry.coordinates;
  const geocodedAddress = feature.properties.label;
  const departement = (feature.properties.context ?? "").split(",")[0].trim();
  console.log(`📍 Géocodé: ${geocodedAddress} (dept ${departement})`);

  const deptSet = new Set([departement]);
  if (rayon_km > 30) {
    const R_EARTH = 111.32;
    const offsets = [[rayon_km/R_EARTH,0],[-rayon_km/R_EARTH,0],[0,rayon_km/(R_EARTH*Math.cos((lat*Math.PI)/180))],[0,-rayon_km/(R_EARTH*Math.cos((lat*Math.PI)/180))]];
    await Promise.all(offsets.map(async ([dLat, dLon]) => {
      try {
        const r = await fetch(`https://geo.api.gouv.fr/communes?lat=${lat+dLat}&lon=${lon+dLon}&fields=codeDepartement&limit=1`);
        if (r.ok) { const arr = await r.json(); if (arr[0]?.codeDepartement) deptSet.add(arr[0].codeDepartement); }
      } catch { /**/ }
    }));
  }

  const MAX_PAGES = 3;
  const t0 = Date.now();
  const [entreprisesResult, osmResult] = await Promise.allSettled([
    (async () => {
      const all = [];
      for (const dept of Array.from(deptSet)) {
        for (let page = 1; page <= MAX_PAGES; page++) {
          try {
            const r = await fetch(`https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(metier)}&departement=${dept}&per_page=25&page=${page}`);
            if (!r.ok) break;
            const data = await r.json();
            if (!data.results?.length) break;
            all.push(...data.results);
            if (page >= data.total_pages) break;
          } catch { break; }
        }
      }
      return all;
    })(),
    fetchOSMEntries(lat, lon, rayon_km).catch(() => []),
  ]);

  const elapsed = Date.now() - t0;
  const allEntreprises = entreprisesResult.status === "fulfilled" ? entreprisesResult.value : [];
  const osmEntries = osmResult.status === "fulfilled" ? osmResult.value : [];
  console.log(`⏱  APIs: ${elapsed}ms — ${allEntreprises.length} entreprises brutes, ${osmEntries.length} entrées OSM`);

  const seen = new Set();
  const unique = allEntreprises.filter(e => { if (seen.has(e.siren)) return false; seen.add(e.siren); return true; });

  const leads = unique.map(e => {
    if (!e.siege) return null;
    const coords = extractCoords(e.siege);
    if (!coords) return null;
    const distance_km = haversineKm(lat, lon, coords.lat, coords.lon);
    if (distance_km > rayon_km) return null;
    const activite = e.activite_principale ?? "";
    const score = Math.min(100, Math.max(0, Math.round(Math.max(0, 40*(1-distance_km/rayon_km)) + scoreRelevance(activite, metier))));
    return { nom: e.nom_complet ?? "—", activite, adresse: e.siege.adresse ?? "",
      ville: e.siege.libelle_commune ?? e.siege.commune ?? "", code_postal: e.siege.code_postal ?? "",
      telephone: null, phone_source: null, phone_confidence: null, phone_match_method: null, phone_secondary: null,
      siret: e.siege.siret ?? null, siren: e.siren,
      distance_km: Math.round(distance_km * 10) / 10, score, source: "annuaire-entreprises",
      _lat: coords.lat, _lon: coords.lon };
  }).filter(l => l !== null).sort((a,b) => b.score - a.score);

  enrichLeads(leads, osmEntries);

  const withPhone = leads.filter(l => l.telephone);
  const highConf = withPhone.filter(l => l.phone_confidence >= 80);
  const medConf = withPhone.filter(l => l.phone_confidence >= 55 && l.phone_confidence < 80);
  const lowConf = withPhone.filter(l => l.phone_confidence < 55);
  const byMethod = {};
  withPhone.forEach(l => { byMethod[l.phone_match_method] = (byMethod[l.phone_match_method] ?? 0) + 1; });

  console.log(`\n📊 RÉSULTATS:`);
  console.log(`   Total leads:        ${leads.length}`);
  console.log(`   Avec téléphone:     ${withPhone.length} (${leads.length ? Math.round(withPhone.length/leads.length*100) : 0}%)`);
  console.log(`   Fiable  (≥80%):     ${highConf.length}`);
  console.log(`   Probable (55-79%):  ${medConf.length}`);
  console.log(`   Incertain (<55%):   ${lowConf.length}`);
  console.log(`   Sources OSM:        address_exact=${byMethod.address_exact??0}, address_cp=${byMethod.address_cp??0}, name_high=${byMethod.name_high??0}, name_medium=${byMethod.name_medium??0}, name_low=${byMethod.name_low??0}`);

  console.log(`\n🔎 5 PREMIERS EXEMPLES (avec téléphone):`);
  withPhone.slice(0, 5).forEach((l, i) => {
    console.log(`  ${i+1}. ${l.nom}`);
    console.log(`     📞 ${l.telephone} | méthode: ${l.phone_match_method} | confiance: ${l.phone_confidence}%`);
    if (l.phone_secondary) console.log(`     📞 (alt) ${l.phone_secondary}`);
    console.log(`     📍 ${l.adresse}, ${l.code_postal} ${l.ville} — ${l.distance_km} km`);
  });

  if (leads.length > 0 && withPhone.length === 0) {
    console.log(`\n⚠️  Aucun téléphone trouvé (${osmEntries.length} entrées OSM). 3 leads sans téléphone:`);
    leads.slice(0, 3).forEach((l, i) => console.log(`  ${i+1}. ${l.nom} — ${l.adresse}, ${l.ville} (${l.distance_km} km)`));
  }
}

// ─── Run ─────────────────────────────────────────────────────────────────────

console.log("🚀 AUDIT LEADS (retry) — " + new Date().toLocaleString("fr-FR"));
console.log("Pause 15s pour laisser Overpass récupérer...");
await new Promise(r => setTimeout(r, 15000));

await runSearch("Lyon / Place Bellecour", "Place Bellecour 69002 Lyon", "serrurier", 10);
console.log("\nPause 15s...");
await new Promise(r => setTimeout(r, 15000));
await runSearch("Marseille / Vieux-Port", "Quai du Port 13002 Marseille", "boulanger", 10);

console.log(`\n${"═".repeat(60)}`);
console.log("✅ Audit retry terminé");
