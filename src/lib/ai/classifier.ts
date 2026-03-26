/**
 * Deterministic intent classifier for AI agent routing.
 * No LLM calls — pure keyword matching to keep routing cost-free.
 */

export type Tier = "economy" | "premium";

export interface ClassifierResult {
  tier: Tier;
  taskCategory: string;
  maxHistoryTurns: number;
  maxTokens: number;
  reason: string;
}

// Keywords that force premium tier (sensitive / complex / emotional context)
const PREMIUM_KEYWORDS = [
  "litige", "litigieux", "procédure", "huissier", "tribunal", "contentieux",
  "mécontent", "insatisfait", "colère", "furieux", "plainte",
  "ferme", "mise en demeure", "ultimatum",
  "urgent", "urgence", "bloqué", "critique",
  "retard de paiement", "impayé", "relance finale",
  "licencier", "rupture", "annuler le contrat",
];

// Keywords that are clearly economy-tier (simple, repeatable, low-sensitivity)
const ECONOMY_KEYWORDS = [
  "résumé", "résume", "synthèse", "récapitulatif",
  "rédige", "rédiger", "écris", "écrire",
  "email", "mail", "message", "courrier",
  "relance simple", "rappel de paiement", "première relance",
  "reformule", "améliore", "améliorer", "rewrite",
  "traduis", "traduire",
  "liste", "tableau",
];

export function classifyRequest(
  lastUserMessage: string,
  contextType: string,
  contextData: string,
  historyLength: number,
): ClassifierResult {
  const text = lastUserMessage.toLowerCase();

  // General context always gets premium (no specific CRM record = more open-ended)
  if (contextType === "general") {
    return {
      tier: "premium",
      taskCategory: "general",
      maxHistoryTurns: 12,
      maxTokens: 1024,
      reason: "Contexte général → modèle premium pour réponse polyvalente",
    };
  }

  // Long conversations get premium (more context needed for coherent continuation)
  if (historyLength > 8) {
    return {
      tier: "premium",
      taskCategory: "long_conversation",
      maxHistoryTurns: 12,
      maxTokens: 1024,
      reason: `Conversation longue (${historyLength} tours) → modèle premium`,
    };
  }

  // Detailed/complex request gets premium
  if (lastUserMessage.length > 250) {
    return {
      tier: "premium",
      taskCategory: "complex_request",
      maxHistoryTurns: 12,
      maxTokens: 1024,
      reason: "Requête détaillée (>250 caractères) → modèle premium",
    };
  }

  // Check premium keywords
  for (const kw of PREMIUM_KEYWORDS) {
    if (text.includes(kw)) {
      return {
        tier: "premium",
        taskCategory: "sensitive",
        maxHistoryTurns: 12,
        maxTokens: 1024,
        reason: `Mot-clé sensible détecté: "${kw}"`,
      };
    }
  }

  // Facture en retard + relance keywords → premium (sensitive financial context)
  if (contextType === "facture" && contextData.includes("jours de retard")) {
    const relanceKeywords = ["relance", "rappel", "email", "mail", "message", "écris", "rédige"];
    if (relanceKeywords.some((kw) => text.includes(kw))) {
      return {
        tier: "premium",
        taskCategory: "relance_retard",
        maxHistoryTurns: 12,
        maxTokens: 1024,
        reason: "Facture en retard + demande de relance → modèle premium",
      };
    }
  }

  // Check economy keywords
  for (const kw of ECONOMY_KEYWORDS) {
    if (text.includes(kw)) {
      return {
        tier: "economy",
        taskCategory: "simple_task",
        maxHistoryTurns: 6,
        maxTokens: 600,
        reason: `Tâche simple détectée: "${kw}"`,
      };
    }
  }

  // Short message on a specific record → economy (likely a simple question)
  if (lastUserMessage.length <= 80 && contextType !== "general") {
    return {
      tier: "economy",
      taskCategory: "simple_question",
      maxHistoryTurns: 6,
      maxTokens: 600,
      reason: "Message court sur fiche CRM → modèle économique",
    };
  }

  // Default: premium for anything unclassified
  return {
    tier: "premium",
    taskCategory: "default",
    maxHistoryTurns: 12,
    maxTokens: 1024,
    reason: "Non classifié → modèle premium par défaut",
  };
}
