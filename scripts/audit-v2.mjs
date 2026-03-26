/**
 * AUDIT V2 — Tests the complete new pipeline:
 * - OSM with improved address matching (numero_voie / libelle_voie)
 * - Annuaire-entreprises per SIREN (site_internet + telephone)
 * - Website scraping
 * - Strict filter (only leads with phone)
 *
 * Run: node scripts/audit-v2.mjs
 */

// ─── All utilities mirroring the new search/route.ts ─────────────────────────

function haversineKm(lat1,lon1,lat2,lon2){const R=6371;const dLat=((lat2-lat1)*Math.PI)/180;const dLon=((lon2-lon1)*Math.PI)/180;const a=Math.sin(dLat/2)**2+Math.cos((lat1*Math.PI)/180)*Math.cos((lat2*Math.PI)/180)*Math.sin(dLon/2)**2;return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));}

function normalizePhone(raw){if(!raw?.trim())return null;let d=raw.replace(/[^\d+]/g,"");if(!d)return null;if(d.startsWith("+33"))d="0"+d.slice(3);if(d.startsWith("0033"))d="0"+d.slice(4);if(d.startsWith("08"))return null;if(d.length===10&&d.startsWith("0"))return`${d.slice(0,2)} ${d.slice(2,4)} ${d.slice(4,6)} ${d.slice(6,8)} ${d.slice(8,10)}`;if(d.length>=9)return raw.trim();return null;}

function normalizeName(s){return s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[''`´]/g,"").toLowerCase().replace(/\b(sarl|sas|sasu|eurl|sci|snc|sa\b|sca|earl|auto[-\s]?entrepreneur)\b/g,"").replace(/[^a-z0-9\s]/g," ").replace(/\s+/g," ").trim();}

function nameSimilarity(a,b){const STOP=new Set(["les","des","une","pas","sur","par","the","chez","aux","avec"]);const words=(s)=>new Set(normalizeName(s).split(" ").filter(w=>w.length>2&&!STOP.has(w)));const na=normalizeName(a),nb=normalizeName(b);if(na===nb)return 1.0;if(na.includes(nb)||nb.includes(na))return 0.85;const aw=words(a),bw=words(b);if(!aw.size||!bw.size)return 0;const common=Array.from(aw).filter(w=>bw.has(w)).length;const union=new Set(Array.from(aw).concat(Array.from(bw))).size;return common/union;}

function bestNameSimilarity(names,osmName){return Math.max(0,...names.map(n=>nameSimilarity(n,osmName)));}

// Checks the LEAD's own name + activité against the metier (not the OSM entry).
// Prevents cross-sector false positives (e.g. vet clinic matched for "serrurier").
// 4-char prefix: "plombier"→"plom", "serrurier"→"serr", "boulanger"→"boul", etc.
function isLeadTradeCoherent(lead,metier){const PREFIX_LEN=4;const mWords=normalizeName(metier).split(/\s+/).filter(w=>w.length>=PREFIX_LEN);if(!mWords.length)return true;const haystack=normalizeName([lead.nom,lead.activite,...(lead._names??[])].filter(Boolean).join(" "));return mWords.some(w=>haystack.includes(w.slice(0,PREFIX_LEN)));}

function scoreRelevance(activite,metier){if(!activite||!metier)return 0;const a=activite.toLowerCase(),m=metier.toLowerCase();if(a.includes(m))return 30;const words=m.split(/\s+/).filter(w=>w.length>3);const matches=words.filter(w=>a.includes(w));return matches.length===0?0:Math.round((matches.length/words.length)*20);}

function extractCoords(siege){const rawLat=siege.latitude,rawLon=siege.longitude;if(rawLat!==undefined&&rawLon!==undefined){const lat=typeof rawLat==="string"?parseFloat(rawLat):rawLat;const lon=typeof rawLon==="string"?parseFloat(rawLon):rawLon;if(!isNaN(lat)&&!isNaN(lon)&&lat!==0&&lon!==0)return{lat,lon};}if(siege.coordonnees){const[p0,p1]=siege.coordonnees.split(",");const lat=parseFloat(p0),lon=parseFloat(p1);if(!isNaN(lat)&&!isNaN(lon)&&lat!==0&&lon!==0)return{lat,lon};}return null;}

function parseHousenumber(addr){const m=addr.match(/^(\d+\s*(?:BIS|TER|QUATER)?)\s/i);return m?m[1].replace(/\s/g,"").toUpperCase():"";}
function parseStreet(addr){return addr.replace(/^\d+\s*(?:BIS|TER|QUATER)?\s+/i,"").replace(/\s+\d{5}.*$/,"").trim();}

function computeConfidence(method,distM,nameSim){switch(method){case"address_exact":return Math.max(80,Math.min(92,92-Math.round(distM/10)));case"address_cp":return Math.max(75,Math.min(85,85-Math.round(distM/12)));case"address_proximity":return Math.max(74,Math.min(80,80-Math.round(distM/5)));case"name_high":return Math.max(68,Math.min(85,Math.round((1-distM/200)*40+nameSim*45)));case"name_medium":return Math.max(48,Math.min(68,Math.round((1-distM/200)*30+nameSim*38)));case"name_low":return Math.max(32,Math.min(48,Math.round((1-distM/200)*20+nameSim*28)));case"official_registry":return 95;case"website_tel_link":return 85;case"website_schema":return 82;case"website_text":return 65;}}

function extractPhonesFromHtml(html){
  const found=new Set();let method="website_text";
  for(const m of Array.from(html.matchAll(/href=["']tel:([+\d\s\-\.()]{7,20})["']/gi))){const p=normalizePhone(m[1].trim());if(p){found.add(p);method="website_tel_link";}}
  for(const m of Array.from(html.matchAll(/(?:itemprop=["']telephone["'][^>]*>([^<]{7,20})|["']telephone["']\s*:\s*["']([^"']{7,20})["'])/gi))){const raw=(m[1]??m[2]??"").trim();const p=normalizePhone(raw);if(p){found.add(p);if(method==="website_text")method="website_schema";}}
  const stripped=html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi," ").replace(/<script[^>]*>[\s\S]*?<\/script>/gi," ").replace(/<[^>]+>/g," ");
  for(const m of Array.from(stripped.matchAll(/(?<!\d)(0[1-79](?:[\s.\-]?\d{2}){4})(?!\d)/g))){const p=normalizePhone(m[1]);if(p)found.add(p);}
  return{phones:Array.from(found),method};
}

async function scrapeWebsitePhone(siteUrl){
  let base;
  try{const raw=siteUrl.startsWith("http")?siteUrl:`https://${siteUrl}`;base=new URL(raw).origin;}catch{return null;}
  for(const path of[""," /contact","/nous-contacter","/mentions-legales"]){
    const pageUrl=base+path.trim();
    try{
      const resp=await fetch(pageUrl,{headers:{"User-Agent":"Mozilla/5.0 (compatible; Facturia/2.0)",Accept:"text/html"},signal:AbortSignal.timeout(5000),redirect:"follow"});
      if(!resp.ok)continue;
      const ct=resp.headers.get("content-type")??"";
      if(!ct.includes("html"))continue;
      const html=await resp.text();
      const{phones,method}=extractPhonesFromHtml(html);
      if(phones.length>0)return{phone:phones[0],secondary:phones[1]??null,method,pageUrl};
    }catch{continue;}
  }
  return null;
}

async function enrichLeadWithAnnuaire(lead){
  if(lead.telephone)return;
  try{
    const resp=await fetch(`https://api.annuaire-entreprises.data.gouv.fr/entreprise/${lead.siren}`,{signal:AbortSignal.timeout(5000)});
    if(!resp.ok)return;
    const data=await resp.json();
    const regPhone=normalizePhone(data.siege?.telephone??data.telephone??"");
    if(regPhone){lead.telephone=regPhone;lead.phone_source="annuaire-entreprises";lead.phone_confidence=95;lead.phone_match_method="official_registry";return;}
    const siteUrl=data.siege?.site_internet??data.site_internet??"";
    if(!siteUrl)return;
    if(!lead.site_web)lead.site_web=siteUrl;
    const webResult=await scrapeWebsitePhone(siteUrl);
    if(webResult){lead.telephone=webResult.phone;lead.phone_source="website";lead.phone_confidence=computeConfidence(webResult.method,0,0);lead.phone_match_method=webResult.method;lead.phone_secondary=webResult.secondary;lead.phone_page_url=webResult.pageUrl;}
  }catch{}
}

async function enrichWithWebSources(leads){
  const toEnrich=leads.filter(l=>!l.telephone);
  if(!toEnrich.length)return;
  const CONCURRENCY=8;
  for(let i=0;i<toEnrich.length;i+=CONCURRENCY){
    const chunk=toEnrich.slice(i,i+CONCURRENCY);
    await Promise.all(chunk.map(enrichLeadWithAnnuaire));
  }
}

const OVERPASS_MIRRORS=["https://overpass-api.de/api/interpreter","https://overpass.kumi.systems/api/interpreter"];

async function fetchOSMEntries(lat,lon,rayonKm){
  const queryRadius=Math.min(rayonKm,20);const delta=queryRadius/111.32;const cosLat=Math.cos((lat*Math.PI)/180);
  const query=`[out:json][timeout:25];(node["phone"](${lat-delta},${lon-delta/cosLat},${lat+delta},${lon+delta/cosLat});node["contact:phone"](${lat-delta},${lon-delta/cosLat},${lat+delta},${lon+delta/cosLat});way["phone"](${lat-delta},${lon-delta/cosLat},${lat+delta},${lon+delta/cosLat});way["contact:phone"](${lat-delta},${lon-delta/cosLat},${lat+delta},${lon+delta/cosLat}););out center;`;
  for(const mirror of OVERPASS_MIRRORS){
    try{
      const resp=await fetch(mirror,{method:"POST",body:`data=${encodeURIComponent(query)}`,headers:{"Content-Type":"application/x-www-form-urlencoded","User-Agent":"Facturia/2.0"},signal:AbortSignal.timeout(25000)});
      if(!resp.ok)continue;
      const data=await resp.json();
      return data.elements.map(e=>{const elat=e.lat??e.center?.lat,elon=e.lon??e.center?.lon,tags=e.tags??{};const phone=normalizePhone(tags.phone??tags["contact:phone"]??"");if(!elat||!elon||!phone)return null;return{lat:elat,lon:elon,name:tags.name??tags.brand??"",phone,housenumber:(tags["addr:housenumber"]??"").toUpperCase(),street:tags["addr:street"]??"",postcode:tags["addr:postcode"]??""};}).filter(e=>e!==null);
    }catch{continue;}
  }
  return[];
}

function findPhoneMatch(lead,osmEntries,metier){
  if(lead._lat===undefined||lead._lon===undefined)return null;
  const leadLat=lead._lat,leadLon=lead._lon;
  const leadNum=lead._housenumber??parseHousenumber(lead.adresse);
  const leadStreet=lead._street??parseStreet(lead.adresse);
  const leadNames=lead._names??[lead.nom];
  const candidates=[];
  for(const osm of osmEntries){
    const distM=haversineKm(leadLat,leadLon,osm.lat,osm.lon)*1000;
    if(distM>350)continue;
    if(distM<=300&&osm.housenumber&&osm.street&&leadNum&&osm.housenumber===leadNum){const streetSim=nameSimilarity(leadStreet,osm.street);if(streetSim>=0.35){candidates.push({phone:osm.phone,method:"address_exact",confidence:computeConfidence("address_exact",distM,streetSim),distM});continue;}}
    if(distM<=250&&osm.housenumber&&osm.postcode&&leadNum&&osm.housenumber===leadNum&&osm.postcode===lead.code_postal){candidates.push({phone:osm.phone,method:"address_cp",confidence:computeConfidence("address_cp",distM,0),distM});continue;}
    if(distM<=30&&osm.postcode&&osm.postcode===lead.code_postal){candidates.push({phone:osm.phone,method:"address_proximity",confidence:computeConfidence("address_proximity",distM,0),distM});continue;}
    if(distM<=200&&osm.name){const sim=bestNameSimilarity(leadNames,osm.name);let method=null;if(sim>=0.70&&distM<=150)method="name_high";else if(sim>=0.35&&distM<=150)method="name_medium";else if(sim>=0.20&&distM<=80){if(isLeadTradeCoherent(lead,metier))method="name_low";}if(method)candidates.push({phone:osm.phone,method,confidence:computeConfidence(method,distM,sim),distM});}
  }
  if(!candidates.length)return null;
  candidates.sort((a,b)=>b.confidence!==a.confidence?b.confidence-a.confidence:a.distM-b.distM);
  const best=candidates[0];
  return{phone:best.phone,method:best.method,confidence:best.confidence,secondary:candidates.find(c=>c.phone!==best.phone&&c.confidence>=40)?.phone??null};
}

function enrichLeadsOSM(leads,osmEntries,metier){
  if(!osmEntries.length)return;
  for(const lead of leads){const match=findPhoneMatch(lead,osmEntries,metier);if(!match)continue;lead.telephone=match.phone;lead.phone_source="openstreetmap";lead.phone_confidence=match.confidence;lead.phone_match_method=match.method;lead.phone_secondary=match.secondary;}
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function runSearch(label, adresse, metier, rayon_km) {
  console.log(`\n${"═".repeat(65)}`);
  console.log(`🔍 ${label} | ${metier} | ${rayon_km} km`);
  console.log("═".repeat(65));

  const geoRes=await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(adresse)}&limit=1`);
  const geoData=await geoRes.json();
  if(!geoData.features?.length){console.log("❌ Adresse introuvable");return;}
  const feature=geoData.features[0];
  const[lon,lat]=feature.geometry.coordinates;
  const departement=(feature.properties.context??"").split(",")[0].trim();
  console.log(`📍 Géocodé: ${feature.properties.label} (dept ${departement})`);

  const deptSet=new Set([departement]);
  const t0=Date.now();
  const[entreprisesResult,osmResult]=await Promise.allSettled([
    (async()=>{
      const all=[];
      for(const dept of Array.from(deptSet)){
        for(let page=1;page<=3;page++){
          try{
            const r=await fetch(`https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(metier)}&departement=${dept}&per_page=25&page=${page}`);
            if(!r.ok)break;
            const data=await r.json();
            if(!data.results?.length)break;
            all.push(...data.results);
            if(page>=data.total_pages)break;
          }catch{break;}
        }
      }
      return all;
    })(),
    fetchOSMEntries(lat,lon,rayon_km).catch(()=>[]),
  ]);

  const allEntreprises=entreprisesResult.status==="fulfilled"?entreprisesResult.value:[];
  const osmEntries=osmResult.status==="fulfilled"?osmResult.value:[];
  const t1=Date.now();
  console.log(`⏱  Entreprises+OSM: ${t1-t0}ms — ${allEntreprises.length} brutes, ${osmEntries.length} OSM entries`);

  const seen=new Set();
  const unique=allEntreprises.filter(e=>{if(seen.has(e.siren))return false;seen.add(e.siren);return true;});

  const leads=unique.map(e=>{
    if(!e.siege)return null;
    const coords=extractCoords(e.siege);
    if(!coords)return null;
    const distance_km=haversineKm(lat,lon,coords.lat,coords.lon);
    if(distance_km>rayon_km)return null;
    const activite=e.activite_principale??"";
    const score=Math.min(100,Math.max(0,Math.round(Math.max(0,40*(1-distance_km/rayon_km))+scoreRelevance(activite,metier))));
    const names=[e.nom_complet??""];
    if(e.siege.nom_commercial)names.push(e.siege.nom_commercial);
    const num=e.siege.numero_voie!=null?String(e.siege.numero_voie).toUpperCase():"";
    const voie=e.siege.libelle_voie??"",typeVoie=e.siege.type_voie??"";
    return{nom:e.nom_complet??"—",activite,adresse:e.siege.adresse??"",ville:e.siege.libelle_commune??"",code_postal:e.siege.code_postal??"",telephone:null,phone_source:null,phone_confidence:null,phone_match_method:null,phone_secondary:null,phone_page_url:null,site_web:null,siret:e.siege.siret??null,siren:e.siren,distance_km:Math.round(distance_km*10)/10,score,_lat:coords.lat,_lon:coords.lon,_housenumber:num||undefined,_street:[typeVoie,voie].filter(Boolean).join(" ")||undefined,_names:names.filter(Boolean)};
  }).filter(l=>l!==null).sort((a,b)=>b.score-a.score);

  const totalCompanies=leads.length;
  const osmBefore=leads.filter(l=>l.telephone).length;

  // OSM enrichment (with trade coherence filter)
  const osmRawMatches=[];
  // Pass a counting wrapper to log filtered vs accepted
  enrichLeadsOSM(leads,osmEntries,metier);
  const afterOSM=leads.filter(l=>l.telephone).length;
  console.log(`📡 OSM enrichment: ${afterOSM} leads avec téléphone (${afterOSM-osmBefore} nouveaux, filtre cohérence métier actif)`);

  // Web enrichment with timeout
  const t2=Date.now();
  await Promise.race([
    enrichWithWebSources(leads),
    new Promise(r=>setTimeout(r,22000)),
  ]);
  const t3=Date.now();
  const afterWeb=leads.filter(l=>l.telephone).length;
  console.log(`🌐 Web enrichment: +${afterWeb-afterOSM} nouveaux en ${t3-t2}ms`);

  // Strict filter — phone required + name_low excluded (confidence 32–48%, not reliable enough)
  const exploitable=leads.filter(l=>l.telephone!==null&&l.phone_match_method!=="name_low");

  const withPhone=exploitable;
  const bySource={};const byMethod={};
  withPhone.forEach(l=>{
    bySource[l.phone_source]=(bySource[l.phone_source]??0)+1;
    byMethod[l.phone_match_method]=(byMethod[l.phone_match_method]??0)+1;
  });
  const highConf=withPhone.filter(l=>l.phone_confidence>=80).length;
  const medConf=withPhone.filter(l=>l.phone_confidence>=55&&l.phone_confidence<80).length;
  const lowConf=withPhone.filter(l=>l.phone_confidence<55).length;

  const pct=totalCompanies?Math.round(withPhone.length/totalCompanies*100):0;

  console.log(`\n📊 RÉSULTATS FINAUX:`);
  console.log(`   Entreprises analysées:       ${totalCompanies}`);
  console.log(`   Prospects exploitables:      ${withPhone.length} (${pct}% des entreprises)`);
  console.log(`   Fiable  (≥80%):              ${highConf}`);
  console.log(`   Probable (55-79%):           ${medConf}`);
  console.log(`   Incertain (<55%):            ${lowConf}`);
  console.log(`   Sources: OSM=${bySource.openstreetmap??0}, Registre=${bySource["annuaire-entreprises"]??0}, Site=${bySource.website??0}`);
  console.log(`   Méthodes OSM: addr_exact=${byMethod.address_exact??0}, addr_cp=${byMethod.address_cp??0}, addr_prox=${byMethod.address_proximity??0}, name_high=${byMethod.name_high??0}, name_med=${byMethod.name_medium??0}, name_low=${byMethod.name_low??0}`);
  console.log(`   Méthodes Web: registry=${byMethod.official_registry??0}, tel_link=${byMethod.website_tel_link??0}, schema=${byMethod.website_schema??0}, text=${byMethod.website_text??0}`);
  console.log(`   Durée totale: ${t3-t0}ms`);

  console.log(`\n🔎 5 PREMIERS EXEMPLES:`);
  withPhone.slice(0,5).forEach((l,i)=>{
    console.log(`  ${i+1}. ${l.nom}`);
    console.log(`     📞 ${l.telephone} | ${l.phone_match_method} | ${l.phone_confidence}% | src: ${l.phone_source}`);
    if(l.phone_secondary)console.log(`     📞 (alt) ${l.phone_secondary}`);
    if(l.phone_page_url)console.log(`     🌐 ${l.phone_page_url}`);
    console.log(`     📍 ${l.adresse}, ${l.code_postal} ${l.ville} — ${l.distance_km} km`);
  });
}

console.log("🚀 AUDIT V2 — " + new Date().toLocaleString("fr-FR"));
console.log("Pipeline: OSM (amélioré) + Annuaire-Entreprises + Scraping site web\n");

await runSearch("Paris / plombier", "1 rue de Rivoli 75001 Paris", "plombier", 10);
await new Promise(r=>setTimeout(r,8000));
await runSearch("Lyon / serrurier", "10 Rue de la République 69001 Lyon", "serrurier", 10);
await new Promise(r=>setTimeout(r,8000));
await runSearch("Marseille / boulanger", "Quai du Port 13002 Marseille", "boulanger", 10);

console.log(`\n${"═".repeat(65)}`);
console.log("✅ Audit terminé");
