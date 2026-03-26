import Link from "next/link";
import { CheckCircle2, X, ArrowRight, Star } from "lucide-react";
import type { Metadata } from "next";
import { PLAN_LIST } from "@/lib/plans";

export const metadata: Metadata = {
  title: "Tarifs — Facturia",
  description: "Plans Starter, Pro et Business pour les artisans français. Gratuit à vie ou dès 29€/mois.",
};

const FAQS = [
  { q: "Y a-t-il un engagement de durée ?", a: "Non. Les plans Pro et Business sont mensuels, sans engagement. Annulez à tout moment depuis vos paramètres." },
  { q: "Puis-je changer de plan ?", a: "Oui, à tout moment. La différence est calculée au prorata du mois en cours." },
  { q: "Quels modes de paiement acceptez-vous ?", a: "Carte bancaire (Visa, Mastercard, American Express) via Stripe. Le paiement est sécurisé et chiffré." },
  { q: "Est-ce que le plan Starter est vraiment gratuit ?", a: "Oui, sans limite de durée. Pas de carte bancaire requise. Upgradez quand vous le souhaitez." },
  { q: "Combien de messages IA ai-je par mois ?", a: "Starter : 30 messages/mois. Pro : 200 messages/mois. Business : illimité. Le compteur se réinitialise chaque mois." },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <section className="relative py-24 px-6 text-center overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-64 bg-primary/8 rounded-full blur-[100px] pointer-events-none" />
        <div className="relative max-w-3xl mx-auto">
          <p className="text-primary text-sm font-semibold uppercase tracking-wider mb-4">Tarifs</p>
          <h1 className="text-5xl font-black text-text-primary mb-5">
            Simple et transparent
          </h1>
          <p className="text-xl text-text-muted">
            Commencez gratuitement. Évoluez quand vous êtes prêt.
            Pas de frais cachés.
          </p>
        </div>
      </section>

      {/* Plans */}
      <section className="px-6 pb-24">
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-6">
          {PLAN_LIST.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-2xl border p-7 flex flex-col ${
                plan.highlight
                  ? "border-primary/40 bg-primary/5 ring-1 ring-primary/30"
                  : "border-surface-border bg-surface"
              }`}
            >
              {plan.highlight && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/20 text-primary text-xs font-bold mb-4 self-start">
                  <Star className="w-3 h-3 fill-primary" /> {plan.badge ?? "Recommandé"}
                </div>
              )}

              <p className="text-base font-bold text-text-primary mb-1">{plan.name}</p>
              <p className="text-xs text-text-muted mb-3">{plan.description}</p>

              <div className="mb-3">
                <span className="text-4xl font-black text-text-primary">
                  {plan.price === 0 ? "Gratuit" : `${plan.price} €`}
                </span>
                <span className="text-sm text-text-muted ml-1">{plan.period}</span>
              </div>

              {/* AI quota callout */}
              <div className="mb-5 px-3 py-2 rounded-xl bg-primary/8 border border-primary/15">
                <p className="text-xs font-semibold text-primary">
                  ✦ Assistant IA — {plan.aiMessages >= 9999 ? "Illimité" : `${plan.aiMessages} messages/mois`}
                </p>
              </div>

              <ul className="space-y-2.5 flex-1 mb-8">
                {plan.features.map((f) => (
                  <li key={f.label} className="flex items-center gap-2.5 text-sm">
                    {f.included ? (
                      <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                    ) : (
                      <X className="w-4 h-4 text-text-muted/40 flex-shrink-0" />
                    )}
                    <span className={f.included ? "text-text-secondary" : "text-text-muted/40"}>
                      {f.label}
                    </span>
                  </li>
                ))}
              </ul>

              <Link
                href={plan.ctaHref}
                className={`w-full py-3 rounded-xl text-sm font-bold text-center transition-all flex items-center justify-center gap-2 ${
                  plan.highlight
                    ? "bg-primary text-background hover:bg-primary-400 hover:shadow-glow"
                    : "border border-surface-border text-text-primary hover:bg-surface-active"
                }`}
              >
                {plan.ctaLabel}
                {plan.highlight && <ArrowRight className="w-4 h-4" />}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-6 bg-surface border-t border-surface-border">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-black text-text-primary text-center mb-12">Questions fréquentes</h2>
          <div className="space-y-3">
            {FAQS.map((faq) => (
              <details
                key={faq.q}
                className="group p-5 rounded-2xl border border-surface-border bg-background cursor-pointer open:border-primary/30 open:bg-primary/5 transition-colors"
              >
                <summary className="flex items-center justify-between font-semibold text-text-primary text-sm list-none">
                  {faq.q}
                  <span className="text-text-muted group-open:rotate-180 transition-transform text-lg leading-none">+</span>
                </summary>
                <p className="mt-3 text-sm text-text-muted leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 text-center">
        <h2 className="text-3xl font-black text-text-primary mb-4">Prêt à vous lancer ?</h2>
        <p className="text-text-muted mb-8">Créez votre compte en 30 secondes. Gratuit, sans carte bancaire.</p>
        <Link
          href="/signup"
          className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-primary text-background font-bold hover:bg-primary-400 hover:shadow-glow transition-all"
        >
          Commencer gratuitement <ArrowRight className="w-5 h-5" />
        </Link>
      </section>
    </div>
  );
}
