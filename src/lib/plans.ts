/**
 * Single source of truth for plan definitions, AI limits, and plan helpers.
 *
 * Plans:
 *   starter  — gratuit, limité
 *   pro      — 29€/mois, usage standard
 *   business — 49€/mois, quasi-illimité
 */

export type PlanId = "starter" | "pro" | "business";

export interface PlanConfig {
  id:          PlanId;
  name:        string;
  price:       number;    // euros/mois (0 = gratuit)
  period:      string;
  description: string;
  highlight:   boolean;
  aiMessages:  number;    // messages IA / mois (9999 = illimité pratique)
  ctaLabel:    string;
  ctaHref:     string;
  badge?:      string;
  features: { label: string; included: boolean }[];
}

export const PLANS: Record<PlanId, PlanConfig> = {
  starter: {
    id:          "starter",
    name:        "Starter",
    price:       0,
    period:      "pour toujours",
    description: "Pour démarrer sans risque",
    highlight:   false,
    aiMessages:  30,
    ctaLabel:    "Commencer gratuitement",
    ctaHref:     "/signup",
    features: [
      { label: "5 clients",                    included: true  },
      { label: "5 devis / mois",               included: true  },
      { label: "5 factures / mois",            included: true  },
      { label: "Export PDF",                   included: true  },
      { label: "Support email",                included: true  },
      { label: "Assistant IA — 30 msg/mois",   included: true  },
      { label: "Dashboard analytique",         included: false },
      { label: "Chorus Pro",                   included: false },
      { label: "Relances automatiques",        included: false },
      { label: "Utilisateurs multiples",       included: false },
    ],
  },

  pro: {
    id:          "pro",
    name:        "Pro",
    price:       29,
    period:      "/ mois",
    description: "Le plus populaire",
    highlight:   true,
    badge:       "Recommandé",
    aiMessages:  200,
    ctaLabel:    "Démarrer l'essai gratuit",
    ctaHref:     "/signup?plan=pro",
    features: [
      { label: "Clients illimités",            included: true  },
      { label: "Devis illimités",              included: true  },
      { label: "Factures illimitées",          included: true  },
      { label: "Export PDF + envoi email",     included: true  },
      { label: "Support prioritaire",          included: true  },
      { label: "Assistant IA — 200 msg/mois",  included: true  },
      { label: "Dashboard analytique",         included: true  },
      { label: "Chorus Pro",                   included: true  },
      { label: "Relances automatiques",        included: true  },
      { label: "Utilisateurs multiples",       included: false },
    ],
  },

  business: {
    id:          "business",
    name:        "Business",
    price:       49,
    period:      "/ mois",
    description: "Pour les équipes",
    highlight:   false,
    aiMessages:  9999,
    ctaLabel:    "Contacter l'équipe",
    ctaHref:     "mailto:contact@facturia.fr",
    features: [
      { label: "Clients illimités",            included: true },
      { label: "Devis illimités",              included: true },
      { label: "Factures illimitées",          included: true },
      { label: "Export PDF + envoi email",     included: true },
      { label: "Support SLA 99,9 %",           included: true },
      { label: "Assistant IA illimité",        included: true },
      { label: "Dashboard analytique avancé",  included: true },
      { label: "Chorus Pro",                   included: true },
      { label: "Relances automatiques",        included: true },
      { label: "Utilisateurs illimités",       included: true },
    ],
  },
};

export const PLAN_ORDER: PlanId[] = ["starter", "pro", "business"];
export const PLAN_LIST: PlanConfig[] = PLAN_ORDER.map((id) => PLANS[id]);

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Get plan config, defaults to starter for unknown values. */
export function getPlan(id: string | null | undefined): PlanConfig {
  return PLANS[(id as PlanId) ?? "starter"] ?? PLANS.starter;
}

/** AI message limit for a plan. */
export function getAiLimit(plan: string | null | undefined): number {
  return getPlan(plan).aiMessages;
}

/** Display label for a plan. */
export function planLabel(plan: string | null | undefined): string {
  return getPlan(plan).name;
}

/** True if userPlan is at least `required`. */
export function planAtLeast(
  userPlan: string | null | undefined,
  required: PlanId
): boolean {
  const userIdx     = PLAN_ORDER.indexOf((userPlan as PlanId) ?? "starter");
  const requiredIdx = PLAN_ORDER.indexOf(required);
  return userIdx >= requiredIdx;
}

/** True if `to` is a higher tier than `from`. */
export function isUpgrade(from: string | null | undefined, to: PlanId): boolean {
  return (
    PLAN_ORDER.indexOf(to) > PLAN_ORDER.indexOf((from as PlanId) ?? "starter")
  );
}

/** AI message limit as a display string (shows "Illimité" for business). */
export function aiLimitLabel(plan: string | null | undefined): string {
  const limit = getAiLimit(plan);
  return limit >= 9999 ? "Illimité" : `${limit} msg/mois`;
}

/** Plans the user can upgrade to from their current plan. */
export function upgradeOptions(currentPlan: string | null | undefined): PlanConfig[] {
  return PLAN_LIST.filter((p) => isUpgrade(currentPlan, p.id));
}
