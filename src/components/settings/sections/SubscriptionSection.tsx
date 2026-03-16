"use client";

import { CheckCircle2, Zap, Crown, ArrowRight, CreditCard, Calendar, Download, Receipt } from "lucide-react";
import { clsx } from "clsx";
import Badge from "@/components/ui/Badge";

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: "0",
    period: "/ mois",
    desc: "Pour démarrer",
    color: "border-surface-border",
    features: ["5 devis / mois", "5 factures / mois", "1 utilisateur", "PDF standard", "Support email"],
    missing: ["SMS notifications", "Chorus Pro", "IA génération", "Rapport hebdo"],
  },
  {
    id: "pro",
    name: "Pro",
    price: "29",
    period: "/ mois",
    desc: "Le plus populaire",
    color: "border-primary/40",
    badge: "Actuel",
    features: ["Devis illimités", "Factures illimitées", "3 utilisateurs", "PDF personnalisé", "SMS notifications", "Chorus Pro", "IA génération", "Rapport hebdo", "Support prioritaire"],
    missing: [],
  },
  {
    id: "business",
    name: "Business",
    price: "79",
    period: "/ mois",
    desc: "Pour les équipes",
    color: "border-surface-border",
    features: ["Tout Pro", "Utilisateurs illimités", "Multi-sociétés", "API accès", "Comptable invité", "SLA 99,9%", "Onboarding dédié"],
    missing: [],
  },
];

const INVOICES = [
  { date: "01/03/2026", amount: "29,00 €", status: "Payée" },
  { date: "01/02/2026", amount: "29,00 €", status: "Payée" },
  { date: "01/01/2026", amount: "29,00 €", status: "Payée" },
];

export default function SubscriptionSection() {
  return (
    <div className="space-y-8">
      {/* Current plan summary */}
      <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Crown className="w-4 h-4 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-text-primary">Plan Pro</p>
              <Badge variant="success" size="sm">Actif</Badge>
            </div>
            <p className="text-xs text-text-muted mt-0.5 flex items-center gap-1.5">
              <Calendar className="w-3 h-3" /> Renouvellement le 01/04/2026 · 29,00 €
            </p>
          </div>
        </div>
        <button className="text-xs text-error hover:text-error/80 font-medium transition-colors">
          Annuler
        </button>
      </div>

      {/* Plans comparison */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-4 h-4 text-text-muted" />
          <h3 className="text-sm font-semibold text-text-primary">Choisir un plan</h3>
          <div className="flex-1 h-px bg-surface-border ml-2" />
        </div>

        <div className="grid grid-cols-3 gap-4">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={clsx(
                "p-4 rounded-xl border bg-background flex flex-col",
                plan.color,
                plan.id === "pro" && "ring-1 ring-primary/30"
              )}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-text-primary">{plan.name}</p>
                    {plan.badge && <Badge variant="info" size="sm">{plan.badge}</Badge>}
                  </div>
                  <p className="text-[10px] text-text-muted">{plan.desc}</p>
                </div>
                <div className="text-right">
                  <span className="text-xl font-black text-text-primary">{plan.price}€</span>
                  <span className="text-[10px] text-text-muted block">{plan.period}</span>
                </div>
              </div>

              <ul className="space-y-1.5 flex-1 mb-4">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3 text-success flex-shrink-0" />
                    <span className="text-xs text-text-secondary">{f}</span>
                  </li>
                ))}
                {plan.missing.map((f) => (
                  <li key={f} className="flex items-center gap-2 opacity-40">
                    <div className="w-3 h-3 rounded-full border border-text-muted flex-shrink-0" />
                    <span className="text-xs text-text-muted line-through">{f}</span>
                  </li>
                ))}
              </ul>

              {plan.id !== "pro" && (
                <button className={clsx(
                  "w-full py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all",
                  plan.id === "business"
                    ? "bg-primary text-background hover:bg-primary-400"
                    : "border border-surface-border text-text-muted hover:text-text-primary hover:border-surface-active"
                )}>
                  {plan.id === "business" ? <><ArrowRight className="w-3 h-3" /> Passer Business</> : "Rétrograder"}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Payment method */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="w-4 h-4 text-text-muted" />
          <h3 className="text-sm font-semibold text-text-primary">Moyen de paiement</h3>
          <div className="flex-1 h-px bg-surface-border ml-2" />
        </div>

        <div className="flex items-center justify-between p-4 rounded-xl bg-background border border-surface-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-7 rounded-md bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
              <span className="text-[8px] font-black text-white">VISA</span>
            </div>
            <div>
              <p className="text-sm font-medium text-text-primary">•••• •••• •••• 4242</p>
              <p className="text-xs text-text-muted">Expire 12/2028</p>
            </div>
          </div>
          <button className="text-xs text-primary hover:text-primary-400 font-medium transition-colors">
            Modifier
          </button>
        </div>
      </div>

      {/* Invoices */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Receipt className="w-4 h-4 text-text-muted" />
          <h3 className="text-sm font-semibold text-text-primary">Historique de facturation</h3>
          <div className="flex-1 h-px bg-surface-border ml-2" />
        </div>

        <div className="space-y-2">
          {INVOICES.map((inv, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-background border border-surface-border">
              <div className="flex items-center gap-3">
                <Receipt className="w-3.5 h-3.5 text-text-muted" />
                <div>
                  <p className="text-sm text-text-primary font-medium">{inv.date} — Plan Pro</p>
                  <p className="text-xs text-text-muted">{inv.amount}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="success" size="sm">{inv.status}</Badge>
                <button className="text-text-muted hover:text-primary transition-colors">
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
