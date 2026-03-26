"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Zap, Crown, Star, ArrowRight, Loader2, AlertCircle, TrendingUp, Settings } from "lucide-react";
import { clsx } from "clsx";
import { PLAN_LIST, getPlan, isUpgrade, aiLimitLabel, type PlanId } from "@/lib/plans";
import Badge from "@/components/ui/Badge";

interface BillingPlan {
  plan:                   string;
  aiUsed:                 number;
  aiLimit:                number;
  yearMonth:              string;
  hasStripeSubscription:  boolean;
  stripeCustomerId:       string | null;
  subscriptionStatus:     string | null;
  subscriptionPeriodEnd:  string | null;
}

export default function SubscriptionSection() {
  const [data,        setData]      = useState<BillingPlan | null>(null);
  const [loading,     setLoading]   = useState(true);
  const [error,       setError]     = useState<string | null>(null);
  const [upgrading,   setUpgrading] = useState<PlanId | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [feedback,    setFeedback]  = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const searchParams = useSearchParams();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/plan");
      if (!res.ok) throw new Error("Impossible de charger le plan");
      setData(await res.json() as BillingPlan);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Show feedback from Stripe redirect (?payment=success|cancelled)
  useEffect(() => {
    const payment = searchParams.get("payment");
    if (payment === "success") {
      setFeedback({ type: "success", msg: "Paiement validé — votre plan a été mis à jour !" });
    } else if (payment === "cancelled") {
      setFeedback({ type: "error", msg: "Paiement annulé. Votre plan reste inchangé." });
    }
  }, [searchParams]);

  const handleUpgrade = async (targetPlan: PlanId) => {
    setUpgrading(targetPlan);
    setFeedback(null);
    try {
      const res  = await fetch("/api/billing/upgrade", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ targetPlan }),
      });
      const json = await res.json() as { ok?: boolean; newPlan?: string; checkoutUrl?: string; error?: string };

      if (json.checkoutUrl) {
        // Stripe checkout — redirect
        window.location.href = json.checkoutUrl;
        return;
      }
      if (!res.ok || !json.ok) {
        setFeedback({ type: "error", msg: json.error ?? "Erreur mise à jour" });
      } else {
        setFeedback({ type: "success", msg: `Plan mis à jour : ${getPlan(json.newPlan).name}` });
        await load(); // Refresh data
      }
    } catch {
      setFeedback({ type: "error", msg: "Erreur réseau" });
    } finally {
      setUpgrading(null);
    }
  };

  const handlePortal = async () => {
    setPortalLoading(true);
    setFeedback(null);
    try {
      const res  = await fetch("/api/billing/portal", { method: "POST" });
      const json = await res.json() as { portalUrl?: string; error?: string };
      if (json.portalUrl) {
        window.location.href = json.portalUrl;
      } else {
        setFeedback({ type: "error", msg: json.error ?? "Impossible d'accéder au portail Stripe." });
      }
    } catch {
      setFeedback({ type: "error", msg: "Erreur réseau" });
    } finally {
      setPortalLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 gap-3 text-text-muted">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Chargement de votre abonnement…</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-xl bg-status-error/10 border border-status-error/20 text-status-error">
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <p className="text-sm">{error ?? "Impossible de charger les données de plan."}</p>
      </div>
    );
  }

  const currentPlan = getPlan(data.plan);
  const aiPct       = Math.min(100, Math.round((data.aiUsed / data.aiLimit) * 100));
  const isAiHigh    = aiPct >= 80;
  const isStarter   = data.plan === "starter";

  return (
    <div className="space-y-8">

      {/* Feedback */}
      {feedback && (
        <div className={clsx(
          "flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium",
          feedback.type === "success"
            ? "bg-status-success/10 border border-status-success/20 text-status-success"
            : "bg-status-error/10 border border-status-error/20 text-status-error"
        )}>
          {feedback.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {feedback.msg}
        </div>
      )}

      {/* Current plan summary */}
      <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Crown className="w-4 h-4 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-text-primary">Plan {currentPlan.name}</p>
                <Badge variant="success" size="sm">Actif</Badge>
              </div>
              <p className="text-xs text-text-muted mt-0.5">
                {isStarter
                  ? "Gratuit · sans engagement"
                  : `${currentPlan.price} €/mois · sans engagement`}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-text-muted">IA ce mois</p>
            <p className={clsx("text-sm font-bold", isAiHigh ? "text-status-warning" : "text-text-primary")}>
              {data.aiUsed} / {data.aiLimit >= 9999 ? "∞" : data.aiLimit}
            </p>
          </div>
        </div>

        {/* AI usage bar */}
        {data.aiLimit < 9999 && (
          <div>
            <div className="flex justify-between text-[10px] text-text-muted mb-1.5">
              <span>Messages IA utilisés</span>
              <span className={isAiHigh ? "text-status-warning font-semibold" : ""}>{aiPct}%</span>
            </div>
            <div className="h-1.5 w-full bg-surface rounded-full overflow-hidden">
              <div
                className={clsx("h-full rounded-full transition-all", aiPct >= 100 ? "bg-status-error" : isAiHigh ? "bg-status-warning" : "bg-primary")}
                style={{ width: `${aiPct}%` }}
              />
            </div>
            {aiPct >= 80 && aiPct < 100 && (
              <p className="text-[10px] text-status-warning mt-1.5">
                Quota presque atteint. Passez en plan supérieur pour continuer sans interruption.
              </p>
            )}
            {aiPct >= 100 && (
              <p className="text-[10px] text-status-error mt-1.5">
                Quota atteint. Passez en plan supérieur pour débloquer l&apos;assistant IA.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Plans comparison */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-4 h-4 text-text-muted" />
          <h3 className="text-sm font-semibold text-text-primary">Comparer les plans</h3>
          <div className="flex-1 h-px bg-surface-border ml-2" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {PLAN_LIST.map((plan) => {
            const isCurrent  = plan.id === data.plan;
            const canUpgrade = isUpgrade(data.plan, plan.id);

            return (
              <div key={plan.id} className={clsx(
                "p-4 rounded-xl border bg-background flex flex-col",
                isCurrent  ? "border-primary/40 ring-1 ring-primary/20" : "border-surface-border",
              )}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-text-primary">{plan.name}</p>
                      {isCurrent && <Badge variant="info" size="sm">Actuel</Badge>}
                      {plan.highlight && !isCurrent && (
                        <span className="text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                          <Star className="w-2 h-2 fill-primary" /> Recommandé
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-text-muted">{plan.description}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-lg font-black text-text-primary">
                      {plan.price === 0 ? "0€" : `${plan.price}€`}
                    </span>
                    <span className="text-[10px] text-text-muted block">{plan.period}</span>
                  </div>
                </div>

                {/* AI quota highlight */}
                <div className="mb-3 px-2.5 py-1.5 rounded-lg bg-primary/5 border border-primary/10">
                  <p className="text-[10px] font-semibold text-primary">
                    IA : {aiLimitLabel(plan.id)}
                  </p>
                </div>

                <ul className="space-y-1.5 flex-1 mb-4">
                  {plan.features.slice(0, 6).map((f) => (
                    <li key={f.label} className={clsx("flex items-center gap-2", !f.included && "opacity-35")}>
                      <CheckCircle2 className={clsx("w-3 h-3 flex-shrink-0", f.included ? "text-status-success" : "text-text-muted")} />
                      <span className="text-xs text-text-secondary">{f.label}</span>
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <div className="w-full py-2 rounded-lg text-xs font-semibold text-center bg-primary/5 border border-primary/20 text-primary">
                    Plan actuel
                  </div>
                ) : canUpgrade ? (
                  <button
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={!!upgrading}
                    className={clsx(
                      "w-full py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all",
                      upgrading === plan.id
                        ? "bg-primary/20 text-primary cursor-not-allowed"
                        : "bg-primary text-background hover:bg-primary-400"
                    )}
                  >
                    {upgrading === plan.id
                      ? <><Loader2 className="w-3 h-3 animate-spin" /> En cours…</>
                      : <><TrendingUp className="w-3 h-3" /> Passer {plan.name}<ArrowRight className="w-3 h-3" /></>
                    }
                  </button>
                ) : (
                  <div className="w-full py-2 rounded-lg text-xs text-center text-text-muted border border-surface-border">
                    Plan inférieur
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Stripe status / Payment info */}
      <div className="p-4 rounded-xl border border-surface-border bg-background">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={clsx(
              "w-2 h-2 rounded-full",
              data.subscriptionStatus === "active" ? "bg-status-success"
              : data.subscriptionStatus === "past_due" ? "bg-status-warning"
              : "bg-text-muted"
            )} />
            <p className="text-xs font-semibold text-text-primary">
              {data.subscriptionStatus === "active"   ? "Abonnement actif"
              : data.subscriptionStatus === "past_due" ? "Paiement en retard"
              : data.subscriptionStatus === "canceled" ? "Abonnement annulé"
              : data.hasStripeSubscription             ? "Abonnement Stripe"
              : "Paiement non configuré"}
            </p>
          </div>
          {data.hasStripeSubscription && (
            <button
              onClick={handlePortal}
              disabled={portalLoading}
              className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary-400 transition-colors disabled:opacity-50"
            >
              {portalLoading
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : <Settings className="w-3 h-3" />
              }
              Gérer l&apos;abonnement
            </button>
          )}
        </div>

        {data.subscriptionPeriodEnd && data.subscriptionStatus !== "canceled" && (
          <p className="text-[10px] text-text-muted mb-2">
            {data.subscriptionStatus === "active"
              ? `Prochain renouvellement : ${new Date(data.subscriptionPeriodEnd).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}`
              : `Accès jusqu&apos;au : ${new Date(data.subscriptionPeriodEnd).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}`
            }
          </p>
        )}

        <p className="text-xs text-text-muted">
          {data.hasStripeSubscription
            ? "Gérez votre moyen de paiement, téléchargez vos factures ou annulez depuis le portail Stripe."
            : isStarter
            ? "Vous êtes sur le plan gratuit. Aucune carte bancaire requise."
            : "Le paiement en ligne sera disponible prochainement. Contactez contact@facturia.fr pour activer votre plan manuellement."
          }
        </p>
      </div>
    </div>
  );
}
