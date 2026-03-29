import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import type { ClientRow, DevisRow, FactureRow, ChantierRow } from "@/lib/database.types";
import { classifyRequest } from "@/lib/ai/classifier";
import { routeAndStream } from "@/lib/ai/providers";
import { PLAN_LIMITS } from "@/lib/ai/plan-limits";

export const maxDuration = 30;

// ─── Types ─────────────────────────────────────────────────────────────────

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface AgentContext {
  type: "general" | "client" | "devis" | "facture" | "chantier";
  id?: string;
  label?: string;
  // Pre-loaded data (used for chantiers which have no API route)
  data?: Record<string, unknown>;
}

// ─── CRM data loaders ───────────────────────────────────────────────────────

async function loadClientContext(userId: string, clientId: string): Promise<string> {
  const supabase = await createServerClient();

  const [clientRes, devisRes, facturesRes, chantiersRes] = await Promise.all([
    supabase.from("clients").select("*").eq("id", clientId).eq("user_id", userId).single(),
    supabase.from("devis").select("numero,statut,objet,montant_ttc,date_emission,date_validite")
      .eq("client_id", clientId).eq("user_id", userId).order("date_emission", { ascending: false }).limit(5),
    supabase.from("factures").select("numero,statut,objet,montant_ttc,date_emission,date_echeance,date_paiement")
      .eq("client_id", clientId).eq("user_id", userId).order("date_emission", { ascending: false }).limit(5),
    supabase.from("chantiers").select("titre,statut,progression,date_debut,date_fin_prevue,budget_prevu,budget_reel")
      .eq("client_id", clientId).eq("user_id", userId).order("created_at", { ascending: false }).limit(3),
  ]);

  const c = clientRes.data as ClientRow | null;
  if (!c) return "Fiche client introuvable.";

  const clientName = c.prenom ? `${c.prenom} ${c.nom}` : c.raison_sociale || c.nom;
  const lines: string[] = [
    `## Client : ${clientName}`,
    `Type : ${c.type} | Statut : ${c.statut}`,
    `Email : ${c.email || "—"} | Tél : ${c.tel || "—"}`,
    `Adresse : ${[c.adresse, c.code_postal, c.ville].filter(Boolean).join(", ") || "—"}`,
    `CA total : ${c.ca_total?.toLocaleString("fr-FR")} €`,
    c.notes ? `Notes : ${c.notes}` : "",
    `Client depuis : ${new Date(c.created_at).toLocaleDateString("fr-FR")}`,
  ];

  if (devisRes.data?.length) {
    lines.push("\n### Devis récents :");
    for (const d of devisRes.data as Partial<DevisRow>[]) {
      lines.push(`  - ${d.numero} | ${d.objet} | ${d.montant_ttc?.toLocaleString("fr-FR")} € TTC | ${d.statut} | émis le ${d.date_emission}`);
    }
  } else {
    lines.push("\nAucun devis enregistré.");
  }

  if (facturesRes.data?.length) {
    lines.push("\n### Factures récentes :");
    for (const f of facturesRes.data as Partial<FactureRow>[]) {
      const paymentInfo = f.date_paiement ? `payée le ${f.date_paiement}` : `échéance ${f.date_echeance}`;
      lines.push(`  - ${f.numero} | ${f.objet} | ${f.montant_ttc?.toLocaleString("fr-FR")} € TTC | ${f.statut} | ${paymentInfo}`);
    }
  } else {
    lines.push("\nAucune facture enregistrée.");
  }

  if (chantiersRes.data?.length) {
    lines.push("\n### Chantiers :");
    for (const ch of chantiersRes.data as Partial<ChantierRow>[]) {
      lines.push(`  - ${ch.titre} | ${ch.statut} | progression ${ch.progression}% | budget prévu ${ch.budget_prevu?.toLocaleString("fr-FR") ?? "—"} €`);
    }
  }

  return lines.filter(Boolean).join("\n");
}

async function loadDevisContext(userId: string, devisId: string): Promise<string> {
  const supabase = await createServerClient();

  const { data: d } = await supabase.from("devis").select("*, clients(nom,prenom,raison_sociale,email,tel)")
    .eq("id", devisId).eq("user_id", userId).single();

  if (!d) return "Devis introuvable.";
  const dv = d as DevisRow & { clients: { nom: string; prenom: string | null; raison_sociale: string | null; email: string | null; tel: string | null } | null };

  const clientName = dv.clients
    ? (dv.clients.prenom ? `${dv.clients.prenom} ${dv.clients.nom}` : dv.clients.raison_sociale || dv.clients.nom)
    : "Client inconnu";

  const lines = [
    `## Devis : ${dv.numero}`,
    `Client : ${clientName} | Email : ${dv.clients?.email || "—"} | Tél : ${dv.clients?.tel || "—"}`,
    `Statut : ${dv.statut} | Émis le : ${dv.date_emission} | Valide jusqu'au : ${dv.date_validite}`,
    `Objet : ${dv.objet}`,
    `Montant HT : ${dv.montant_ht.toLocaleString("fr-FR")} € | TVA : ${dv.montant_tva.toLocaleString("fr-FR")} € | TTC : ${dv.montant_ttc.toLocaleString("fr-FR")} €`,
    dv.remise_percent > 0 ? `Remise : ${dv.remise_percent}%` : "",
    dv.acompte > 0 ? `Acompte demandé : ${dv.acompte.toLocaleString("fr-FR")} €` : "",
    dv.notes ? `Notes : ${dv.notes}` : "",
    dv.conditions_paiement ? `Conditions : ${dv.conditions_paiement}` : "",
    "\n### Lignes :",
    ...dv.lignes.map((l) => `  - ${l.description} | qté ${l.quantite} ${l.unite} × ${l.prix_unitaire.toLocaleString("fr-FR")} € = ${l.total_ht.toLocaleString("fr-FR")} € HT`),
  ];

  return lines.filter(Boolean).join("\n");
}

async function loadFactureContext(userId: string, factureId: string): Promise<string> {
  const supabase = await createServerClient();

  const { data: f } = await supabase.from("factures").select("*, clients(nom,prenom,raison_sociale,email,tel)")
    .eq("id", factureId).eq("user_id", userId).single();

  if (!f) return "Facture introuvable.";
  const fv = f as FactureRow & { clients: { nom: string; prenom: string | null; raison_sociale: string | null; email: string | null; tel: string | null } | null };

  const clientName = fv.clients
    ? (fv.clients.prenom ? `${fv.clients.prenom} ${fv.clients.nom}` : fv.clients.raison_sociale || fv.clients.nom)
    : "Client inconnu";

  const joursRetard = fv.statut === "en_retard" && fv.date_echeance
    ? Math.floor((Date.now() - new Date(fv.date_echeance).getTime()) / 86400000)
    : 0;

  const lines = [
    `## Facture : ${fv.numero}`,
    `Client : ${clientName} | Email : ${fv.clients?.email || "—"} | Tél : ${fv.clients?.tel || "—"}`,
    `Statut : ${fv.statut}${joursRetard > 0 ? ` (${joursRetard} jours de retard)` : ""}`,
    `Émise le : ${fv.date_emission} | Échéance : ${fv.date_echeance}`,
    fv.date_paiement ? `Payée le : ${fv.date_paiement}` : "",
    `Objet : ${fv.objet}`,
    `Montant HT : ${fv.montant_ht.toLocaleString("fr-FR")} € | TVA : ${fv.montant_tva.toLocaleString("fr-FR")} € | TTC : ${fv.montant_ttc.toLocaleString("fr-FR")} €`,
    fv.acompte > 0 ? `Acompte versé : ${fv.acompte.toLocaleString("fr-FR")} € — Reste dû : ${(fv.montant_ttc - fv.acompte).toLocaleString("fr-FR")} €` : "",
    fv.notes ? `Notes : ${fv.notes}` : "",
    "\n### Lignes :",
    ...fv.lignes.map((l) => `  - ${l.description} | qté ${l.quantite} ${l.unite} × ${l.prix_unitaire.toLocaleString("fr-FR")} € = ${l.total_ht.toLocaleString("fr-FR")} € HT`),
  ];

  return lines.filter(Boolean).join("\n");
}

async function loadDashboardContext(userId: string): Promise<string> {
  const supabase = await createServerClient();

  const [clientsRes, devisRes, facturesRes, chantiersRes] = await Promise.all([
    supabase.from("clients").select("statut", { count: "exact" }).eq("user_id", userId),
    supabase.from("devis").select("statut,montant_ttc,date_validite,objet,numero").eq("user_id", userId)
      .in("statut", ["envoye", "brouillon"]).order("date_emission", { ascending: false }).limit(10),
    supabase.from("factures").select("statut,montant_ttc,date_echeance,objet,numero").eq("user_id", userId)
      .in("statut", ["envoyee", "en_retard"]).order("date_echeance", { ascending: true }).limit(10),
    supabase.from("chantiers").select("titre,statut,progression,date_fin_prevue").eq("user_id", userId)
      .in("statut", ["en_cours", "planifie"]).order("date_debut", { ascending: false }).limit(5),
  ]);

  const clientCount = clientsRes.count ?? 0;
  const activeClients = (clientsRes.data ?? []).filter((c) => c.statut === "actif").length;

  const lines = [
    `## Tableau de bord CRM`,
    `Clients : ${clientCount} total, ${activeClients} actifs`,
  ];

  const devis = devisRes.data ?? [];
  if (devis.length) {
    const totalDevis = devis.reduce((s, d) => s + ((d as { montant_ttc: number }).montant_ttc || 0), 0);
    lines.push(`\n### Devis en cours (${devis.length}) — ${totalDevis.toLocaleString("fr-FR")} € TTC total :`);
    for (const d of devis as Array<{ numero: string; objet: string; statut: string; montant_ttc: number; date_validite: string }>) {
      const expired = d.date_validite && new Date(d.date_validite) < new Date();
      lines.push(`  - ${d.numero} | ${d.objet} | ${d.montant_ttc.toLocaleString("fr-FR")} € | ${d.statut}${expired ? " ⚠️ expiré" : ""}`);
    }
  } else {
    lines.push("\nAucun devis en cours.");
  }

  const factures = facturesRes.data ?? [];
  const enRetard = factures.filter((f) => (f as { statut: string }).statut === "en_retard");
  if (factures.length) {
    const totalDu = factures.reduce((s, f) => s + ((f as { montant_ttc: number }).montant_ttc || 0), 0);
    lines.push(`\n### Factures impayées (${factures.length}) — ${totalDu.toLocaleString("fr-FR")} € TTC à encaisser :`);
    if (enRetard.length) lines.push(`  ⚠️ ${enRetard.length} facture(s) en retard de paiement`);
    for (const f of factures as Array<{ numero: string; objet: string; statut: string; montant_ttc: number; date_echeance: string }>) {
      const jours = f.date_echeance ? Math.floor((Date.now() - new Date(f.date_echeance).getTime()) / 86400000) : 0;
      lines.push(`  - ${f.numero} | ${f.objet} | ${f.montant_ttc.toLocaleString("fr-FR")} € | ${f.statut}${jours > 0 ? ` (+${jours}j)` : ""}`);
    }
  } else {
    lines.push("\nAucune facture en attente de paiement.");
  }

  const chantiers = chantiersRes.data ?? [];
  if (chantiers.length) {
    lines.push(`\n### Chantiers actifs (${chantiers.length}) :`);
    for (const ch of chantiers as Array<{ titre: string; statut: string; progression: number; date_fin_prevue: string | null }>) {
      lines.push(`  - ${ch.titre} | ${ch.statut} | ${ch.progression}% terminé | fin prévue : ${ch.date_fin_prevue || "—"}`);
    }
  }

  return lines.join("\n");
}

// ─── System prompt builder ──────────────────────────────────────────────────

function buildSystemPrompt(contextData: string, contextType: string): string {
  const toneGuide = contextType === "facture"
    ? "Ton disponible selon la demande : cordial pour un premier rappel, standard, ou ferme pour une relance urgente."
    : "Ton : professionnel et clair, adapté à un artisan qui écrit à ses clients.";

  return `Tu es l'assistant IA de Facturia, un CRM pour artisans du bâtiment et des services.

Ton rôle : aider à la gestion CRM opérationnelle.
Tu aides sur : clients, devis, factures, chantiers, relances, administration.
Tu NE t'occupes PAS de prospection ni de génération de contacts.

Règles absolues :
- Tu bases tes réponses UNIQUEMENT sur les données fournies en contexte ci-dessous
- Tu distingues clairement les FAITS (données CRM réelles) des SUGGESTIONS que tu génères
- Tu n'inventes jamais de données absentes (montants, dates, noms) — si une info manque, tu le dis
- Tu ne modifies jamais les données du CRM, tu rédiges et suggères uniquement
- Quand tu génères un message ou email à envoyer, tu le mets entre les balises ---MESSAGE--- et ---FIN MESSAGE---
- Tes réponses sont en français, directes, sans remplissage inutile

${toneGuide}

Format pour les résumés :
**Faits clés :** [points issus des données réelles]
**Situation :** [interprétation]
**Action recommandée :** [suggestion concrète]

---
DONNÉES CRM ACTUELLES :

${contextData}
---`;
}

// ─── Route handler ───────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY non configurée. Ajoutez votre clé dans les variables d'environnement." }, { status: 503 });
    }

    // ── Plan quota check ──────────────────────────────────────────────────────
    const yearMonth = new Date().toISOString().slice(0, 7);
    const [profileRes, usageRes] = await Promise.all([
      supabase.from("users").select("plan").eq("id", user.id).single(),
      supabase.from("agent_usage").select("message_count").eq("user_id", user.id).eq("year_month", yearMonth).single(),
    ]);
    const plan  = profileRes.data?.plan ?? "starter";
    const used  = usageRes.data?.message_count ?? 0;
    const limit = PLAN_LIMITS[plan] ?? 30;

    if (used >= limit) {
      return NextResponse.json({
        error: `Quota mensuel atteint (${used}/${limit} messages). Passez en plan supérieur pour continuer.`,
        quota: { used, limit, plan },
      }, { status: 429 });
    }

    // Atomically increment usage (fire before streaming to prevent abuse)
    await supabase.rpc("increment_agent_usage", { p_user_id: user.id, p_year_month: yearMonth });

    const body = await req.json() as { messages: ChatMessage[]; context?: AgentContext };
    const { messages, context } = body;

    if (!messages?.length) {
      return NextResponse.json({ error: "Messages manquants" }, { status: 400 });
    }

    // Load CRM context data
    let contextData = "Aucun contexte spécifique fourni. Tu peux répondre de façon générale.";
    const contextType = context?.type ?? "general";

    if (context?.type === "client" && context.id) {
      contextData = await loadClientContext(user.id, context.id);
    } else if (context?.type === "devis" && context.id) {
      contextData = await loadDevisContext(user.id, context.id);
    } else if (context?.type === "facture" && context.id) {
      contextData = await loadFactureContext(user.id, context.id);
    } else if (context?.type === "chantier" && context.data) {
      // Chantiers use pre-loaded data passed from client — compact text format
      const d = context.data;
      const lines = [`## Chantier : ${context.label || d.titre || "Chantier"}`];
      if (d.statut) lines.push(`Statut : ${d.statut}`);
      if (d.progression !== undefined) lines.push(`Progression : ${d.progression}%`);
      if (d.date_debut) lines.push(`Début : ${d.date_debut}`);
      if (d.date_fin_prevue) lines.push(`Fin prévue : ${d.date_fin_prevue}`);
      if (d.budget_prevu) lines.push(`Budget prévu : ${Number(d.budget_prevu).toLocaleString("fr-FR")} €`);
      if (d.budget_reel) lines.push(`Budget réel : ${Number(d.budget_reel).toLocaleString("fr-FR")} €`);
      if (d.description) lines.push(`Description : ${d.description}`);
      if (d.notes) lines.push(`Notes : ${d.notes}`);
      contextData = lines.join("\n");
    } else if (context?.type === "general" || !context) {
      contextData = await loadDashboardContext(user.id);
    }

    const systemPrompt = buildSystemPrompt(contextData, contextType);

    // Classify request to determine tier and history budget
    const lastMessage = messages[messages.length - 1]?.content ?? "";
    const classification = classifyRequest(lastMessage, contextType, contextData, messages.length);

    console.log(`[agent/chat] tier=${classification.tier} reason="${classification.reason}"`);

    // Trim history to budget
    const trimmedMessages = messages.slice(-classification.maxHistoryTurns).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    // Route to the right provider with fallback
    const { stream: readable, decision } = await routeAndStream(
      classification.tier,
      classification.reason,
      {
        systemPrompt,
        messages: trimmedMessages,
        maxTokens: classification.maxTokens,
      },
    );

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
        "X-AI-Provider": decision.provider,
        "X-AI-Model": decision.model,
        "X-AI-Tier": decision.tier + (decision.usedFallback ? "-fallback" : ""),
      },
    });
  } catch (err) {
    console.error("[agent/chat]", err);
    return NextResponse.json({ error: "Erreur serveur agent IA" }, { status: 500 });
  }
}
