/**
 * Feature flags — gating par plan SaaS.
 *
 * Plans :
 *   starter  — envoi manuel, badges basiques
 *   pro      — tout starter + auto-send, auto-sync, retry auto, dashboard, queue
 *   business — tout pro + (à venir : multi-utilisateurs, SLA, support dédié)
 *
 * Usage :
 *   import { canUse } from "@/lib/feature-flags";
 *   if (!canUse(user.plan, "chorusAutoSend")) return 403;
 */

export type Plan = "starter" | "pro" | "business";

// ─── Définition des features ─────────────────────────────────────────────────

const FEATURES = {
  /** Envoi automatique à Chorus quand la facture passe à "envoyée" */
  chorusAutoSend:  (p: Plan) => p !== "starter",
  /** Polling automatique des statuts Chorus (UI + cron) */
  chorusAutoSync:  (p: Plan) => p !== "starter",
  /** Retry automatique en cas de rejet passager */
  chorusRetryAuto: (p: Plan) => p !== "starter",
  /** Dashboard Chorus Pro (stats, taux acceptation) */
  chorusDashboard: (p: Plan) => p !== "starter",
  /** Queue d'envoi asynchrone */
  chorusQueue:     (p: Plan) => p !== "starter",
  /** Notifications in-app persistantes */
  notifications:   (p: Plan) => p !== "starter",
} as const;

export type Feature = keyof typeof FEATURES;

/**
 * Vérifie si un plan a accès à une feature.
 * Accepte null/undefined (défaut : "starter").
 */
export function canUse(plan: Plan | null | undefined, feature: Feature): boolean {
  return FEATURES[feature](plan ?? "starter");
}

/**
 * Renvoie un objet de toutes les features disponibles pour un plan.
 * Pratique pour envoyer au client sans exposer la logique.
 */
export function getFeaturesForPlan(plan: Plan | null | undefined): Record<Feature, boolean> {
  const p = plan ?? "starter";
  return Object.fromEntries(
    (Object.keys(FEATURES) as Feature[]).map((f) => [f, FEATURES[f](p)]),
  ) as Record<Feature, boolean>;
}

/**
 * Message d'erreur standardisé quand une feature est verrouillée.
 */
export function featureLockedMessage(feature: Feature): string {
  const MESSAGES: Partial<Record<Feature, string>> = {
    chorusAutoSend:  "L'envoi automatique Chorus est disponible à partir du plan Pro.",
    chorusDashboard: "Le tableau de bord Chorus est disponible à partir du plan Pro.",
    notifications:   "Les notifications sont disponibles à partir du plan Pro.",
  };
  return MESSAGES[feature] ?? "Cette fonctionnalité est disponible à partir du plan Pro.";
}
