/**
 * Suggestions de correction pour les rejets Chorus Pro.
 *
 * Analyse le motif de rejet retourné par Chorus (chorus_last_error)
 * et retourne une suggestion actionnable pour l'utilisateur.
 *
 * Usage (client ou serveur) :
 *   import { getChorusFixSuggestion } from "@/lib/chorus-fix";
 *   const fix = getChorusFixSuggestion(facture.chorus_last_error);
 */

export type FixField =
  | "siret_client"
  | "siret_artisan"
  | "montant"
  | "date"
  | "engagement"
  | "service"
  | "general";

export interface ChorusFixSuggestion {
  /** Champ à corriger (pour highlight UI) */
  field: FixField;
  /** Message explicatif affiché à l'utilisateur */
  message: string;
  /** Action concrète à effectuer */
  action: string;
  /** Gravité */
  severity: "error" | "warning";
}

// ─── Patterns de reconnaissance ──────────────────────────────────────────────

const PATTERNS: Array<{
  patterns: Array<string | RegExp>;
  suggestion: ChorusFixSuggestion;
}> = [
  {
    patterns: [
      /SIRET.*fournisseur|fournisseur.*SIRET|siret.*émetteur|émetteur.*invalide/i,
      "SIRET_FOURNISSEUR_INVALIDE",
      "SIRET_EMETTEUR",
    ],
    suggestion: {
      field: "siret_artisan",
      message: "Le SIRET de votre entreprise est invalide ou non reconnu par Chorus Pro.",
      action: "Vérifiez votre SIRET dans Paramètres → Profil entreprise",
      severity: "error",
    },
  },
  {
    patterns: [
      /SIRET.*destinataire|SIRET.*client|siret.*payeur|payeur.*invalide/i,
      "SIRET_DESTINATAIRE_INVALIDE",
      "SIRET_PAYEUR",
    ],
    suggestion: {
      field: "siret_client",
      message: "Le SIRET du client destinataire est invalide ou non reconnu par Chorus Pro.",
      action: "Mettez à jour le SIRET dans Clients → fiche client",
      severity: "error",
    },
  },
  {
    patterns: [
      /montant.*incohérent|HT.*TVA.*TTC|incohérence.*montant|montant.*invalide/i,
      "MONTANT_INCOHERENT",
      "MONTANT_TTC_INVALIDE",
    ],
    suggestion: {
      field: "montant",
      message: "Les montants de la facture sont incohérents (HT + TVA ≠ TTC).",
      action: "Vérifiez les lignes de la facture dans Modifier la facture",
      severity: "error",
    },
  },
  {
    patterns: [
      /engagement.*invalide|engagement.*obligatoire|numéro.*engagement|bon de commande/i,
      "ENGAGEMENT_OBLIGATOIRE",
      "NUMERO_ENGAGEMENT",
    ],
    suggestion: {
      field: "engagement",
      message: "Le numéro d'engagement juridique (bon de commande) est manquant ou invalide.",
      action: "Renseignez le N° d'engagement dans les options Chorus de la facture",
      severity: "warning",
    },
  },
  {
    patterns: [
      /service.*exécutant|code.*service|SERVICE_EXECUTANT/i,
      "CODE_SERVICE_INVALIDE",
    ],
    suggestion: {
      field: "service",
      message: "Le code du service exécutant chez le destinataire est incorrect.",
      action: "Vérifiez le code service dans les options Chorus",
      severity: "warning",
    },
  },
  {
    patterns: [
      /date.*invalide|format.*date|date.*incorrecte/i,
      "DATE_INVALIDE",
    ],
    suggestion: {
      field: "date",
      message: "La date d'émission de la facture est invalide ou dans un format incorrect.",
      action: "Vérifiez la date d'émission dans Modifier la facture",
      severity: "error",
    },
  },
];

// ─── Fonction principale ──────────────────────────────────────────────────────

/**
 * Analyse un message d'erreur Chorus Pro et retourne une suggestion de correction.
 * Fonctionne côté client ET serveur (aucune dépendance externe).
 *
 * @param error — chorus_last_error stocké en base
 * @returns suggestion actionnable avec le champ à corriger
 */
export function getChorusFixSuggestion(
  error: string | null | undefined,
): ChorusFixSuggestion {
  if (!error) {
    return {
      field: "general",
      message: "Chorus Pro a rejeté cette facture sans préciser le motif.",
      action: "Contactez le support Chorus Pro ou vérifiez les données de la facture",
      severity: "error",
    };
  }

  for (const { patterns, suggestion } of PATTERNS) {
    for (const p of patterns) {
      if (typeof p === "string" ? error.includes(p) : p.test(error)) {
        return suggestion;
      }
    }
  }

  return {
    field: "general",
    message: `Chorus Pro a rejeté cette facture : ${error}`,
    action: "Corrigez les données signalées et renvoyez la facture",
    severity: "error",
  };
}

/**
 * Retourne le label du champ à corriger pour affichage UI.
 */
export function getFieldLabel(field: FixField): string {
  const LABELS: Record<FixField, string> = {
    siret_client:  "SIRET client",
    siret_artisan: "SIRET fournisseur",
    montant:       "Montants facture",
    date:          "Date d'émission",
    engagement:    "N° engagement",
    service:       "Code service",
    general:       "Données facture",
  };
  return LABELS[field];
}
