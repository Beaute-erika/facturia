import { PLANS, type PlanId } from "@/lib/plans";

/**
 * AI message limits per plan — derived from the central plans config.
 * Keep this file as a thin bridge for the agent routes.
 */
export const PLAN_LIMITS: Record<string, number> = Object.fromEntries(
  (Object.keys(PLANS) as PlanId[]).map((id) => [id, PLANS[id].aiMessages])
);
