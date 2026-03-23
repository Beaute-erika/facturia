import Link from "next/link";
import {
  Users, FileText, Receipt, LayoutDashboard,
  Sparkles, HardHat, CheckCircle2, ArrowRight,
  Star, ChevronDown, Zap, Shield, Clock,
} from "lucide-react";

// ─── Data ─────────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Users,
    title: "Gestion des clients",
    desc: "Fiches clients complètes, historique des travaux, coordonnées et notes. Retrouvez n'importe quel client en 2 secondes.",
    color: "text-blue-400",
    bg: "bg-blue-400/10",
  },
  {
    icon: FileText,
    title: "Devis en 1 clic",
    desc: "Créez des devis professionnels en quelques minutes. Envoyez-les par email directement depuis l'application.",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    icon: Receipt,
    title: "Facturation automatique",
    desc: "Transformez un devis accepté en facture d'un clic. Numérotation automatique, relances, Chorus Pro inclus.",
    color: "text-purple-400",
    bg: "bg-purple-400/10",
  },
  {
    icon: LayoutDashboard,
    title: "Tableau de bord",
    desc: "Visualisez votre CA, vos devis en attente et vos factures impayées d'un seul coup d'œil.",
    color: "text-orange-400",
    bg: "bg-orange-400/10",
  },
  {
    icon: Sparkles,
    title: "Assistant IA",
    desc: "Générez des devis détaillés en décrivant vos travaux. L'IA calcule les lignes, les matériaux et les délais.",
    color: "text-yellow-400",
    bg: "bg-yellow-400/10",
  },
  {
    icon: HardHat,
    title: "Suivi de chantier",
    desc: "Planning visuel type Gantt, avancement par étape, budget réel vs prévu. Tout votre chantier en un regard.",
    color: "text-red-400",
    bg: "bg-red-400/10",
  },
];

const TESTIMONIALS = [
  {
    name: "Marc Lefebvre",
    metier: "Plombier — Paris 15e",
    note: 5,
    text: "Avant Facturia je passais 3h par semaine sur la compta. Maintenant c'est 20 minutes. Mes devis sont professionnels et mes clients le remarquent.",
  },
  {
    name: "Sophie Renault",
    metier: "Électricienne — Lyon",
    note: 5,
    text: "L'IA qui génère les devis m'a changé la vie. Je décris les travaux en français, elle crée le devis complet. Magique.",
  },
  {
    name: "Karim Aït-Yahia",
    metier: "Carreleur — Marseille",
    note: 5,
    text: "Simple, rapide, et le support répond en moins d'une heure. Je recommande à tous mes collègues artisans.",
  },
];

const FAQS = [
  {
    q: "Est-ce que je dois installer quelque chose ?",
    a: "Non. Facturia est une application web accessible depuis n'importe quel navigateur, sur ordinateur, tablette ou téléphone. Aucune installation requise.",
  },
  {
    q: "Mes données sont-elles sécurisées ?",
    a: "Oui. Vos données sont stockées en Europe, chiffrées, et accessibles uniquement par vous. Nous utilisons Supabase, une infrastructure certifiée SOC 2.",
  },
  {
    q: "Puis-je essayer gratuitement ?",
    a: "Oui. Le plan Starter est gratuit à vie. Pas de carte bancaire requise pour commencer.",
  },
  {
    q: "Comment fonctionne la facturation Chorus Pro ?",
    a: "Facturia prend en charge la transmission automatique de vos factures aux entités publiques via Chorus Pro. Activez l'option dans les paramètres.",
  },
  {
    q: "Puis-je importer mes données existantes ?",
    a: "Oui. Vous pouvez importer vos clients et factures existants au format CSV. Notre équipe peut vous accompagner lors de la migration.",
  },
  {
    q: "Y a-t-il un engagement de durée ?",
    a: "Non. L'abonnement Pro est mensuel, sans engagement. Vous pouvez annuler à tout moment.",
  },
];

const PLANS = [
  {
    name: "Starter",
    price: "0",
    period: "pour toujours",
    desc: "Pour démarrer sans risque",
    features: ["5 clients", "5 devis / mois", "5 factures / mois", "Export PDF", "Support email"],
    cta: "Commencer gratuitement",
    href: "/signup",
    highlight: false,
  },
  {
    name: "Pro",
    price: "29",
    period: "/ mois",
    desc: "Le plus populaire",
    features: ["Clients illimités", "Devis illimités", "Factures illimitées", "Dashboard analytique", "Export PDF + envoi email", "Assistant IA", "Chorus Pro", "Relances automatiques", "Support prioritaire"],
    cta: "Démarrer l'essai Pro",
    href: "/signup?plan=pro",
    highlight: true,
  },
  {
    name: "Business",
    price: "49",
    period: "/ mois",
    desc: "Pour les équipes",
    features: ["Tout Pro inclus", "Utilisateurs illimités", "Multi-sociétés", "Analytics avancés", "Automatisations", "API accès", "Comptable invité", "SLA 99,9 %", "Onboarding dédié"],
    cta: "Contacter l'équipe",
    href: "/signup?plan=business",
    highlight: false,
  },
];

// ─── Sections ─────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="relative overflow-hidden px-6 pt-24 pb-32 text-center">
      {/* Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-6">
          <Zap className="w-3.5 h-3.5" /> Nouveau : Assistant IA intégré
        </div>

        <h1 className="text-5xl md:text-6xl font-black text-text-primary leading-tight tracking-tight mb-6">
          Le CRM simple pour{" "}
          <span className="text-primary">les artisans</span>
        </h1>

        <p className="text-xl text-text-muted max-w-2xl mx-auto mb-10 leading-relaxed">
          Gérez vos clients, créez des devis, envoyez vos factures — le tout en quelques clics.
          Moins de paperasse, plus de temps sur le chantier.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-12">
          <Link
            href="/signup"
            className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-primary text-background font-bold text-base hover:bg-primary-400 hover:shadow-glow transition-all"
          >
            Commencer gratuitement <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl border border-surface-border text-text-primary font-semibold text-base hover:bg-surface-active transition-colors"
          >
            Se connecter
          </Link>
        </div>

        <div className="flex items-center justify-center gap-6 text-sm text-text-muted flex-wrap">
          {["Gratuit à vie", "Sans carte bancaire", "Données en France"].map((t) => (
            <span key={t} className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-primary" /> {t}
            </span>
          ))}
        </div>
      </div>

      {/* Dashboard mockup */}
      <div className="relative mt-20 max-w-5xl mx-auto">
        <div className="rounded-2xl border border-surface-border bg-surface overflow-hidden shadow-card">
          {/* Fake browser bar */}
          <div className="flex items-center gap-2 px-4 py-3 bg-background border-b border-surface-border">
            <div className="flex gap-1.5">
              {["bg-red-500", "bg-yellow-500", "bg-green-500"].map((c) => (
                <div key={c} className={`w-3 h-3 rounded-full ${c} opacity-70`} />
              ))}
            </div>
            <div className="flex-1 mx-4 h-5 rounded-md bg-surface-active text-xs text-text-muted flex items-center px-3">
              app.facturia.fr/app
            </div>
          </div>
          {/* Mockup content */}
          <div className="grid grid-cols-4 gap-4 p-6 bg-background">
            {[
              { label: "CA du mois", value: "28 450 €", color: "text-primary" },
              { label: "Devis en attente", value: "8", color: "text-yellow-400" },
              { label: "Factures impayées", value: "3", color: "text-red-400" },
              { label: "Clients actifs", value: "47", color: "text-blue-400" },
            ].map((kpi) => (
              <div key={kpi.label} className="p-4 rounded-xl bg-surface border border-surface-border">
                <p className="text-xs text-text-muted mb-2">{kpi.label}</p>
                <p className={`text-2xl font-black font-mono ${kpi.color}`}>{kpi.value}</p>
              </div>
            ))}
          </div>
          <div className="h-40 bg-background px-6 pb-6">
            <div className="w-full h-full rounded-xl bg-surface border border-surface-border flex items-end gap-1 px-4 pb-4">
              {[40, 55, 35, 70, 60, 80, 75, 90, 65, 85, 70, 95].map((h, i) => (
                <div key={i} className="flex-1 rounded-t-sm bg-primary/30 hover:bg-primary/60 transition-colors" style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>
        </div>
        {/* Glow under */}
        <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-3/4 h-20 bg-primary/20 blur-3xl rounded-full pointer-events-none" />
      </div>
    </section>
  );
}

function SocialProof() {
  return (
    <section className="py-16 border-y border-surface-border">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <p className="text-sm text-text-muted mb-8">Rejoignez plus de 1 200 artisans qui font confiance à Facturia</p>
        <div className="flex flex-wrap items-center justify-center gap-8">
          {["Plombiers", "Électriciens", "Maçons", "Carreleurs", "Peintres", "Menuisiers"].map((m) => (
            <span key={m} className="text-sm font-semibold text-text-muted/60 tracking-wide uppercase">{m}</span>
          ))}
        </div>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section id="fonctionnalites" className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-primary text-sm font-semibold uppercase tracking-wider mb-3">Fonctionnalités</p>
          <h2 className="text-4xl font-black text-text-primary mb-4">Tout ce dont vous avez besoin</h2>
          <p className="text-text-muted text-lg max-w-2xl mx-auto">
            Conçu par et pour des artisans. Simple à utiliser, puissant quand vous en avez besoin.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="p-6 rounded-2xl border border-surface-border bg-surface hover:border-surface-active transition-colors group"
            >
              <div className={`w-11 h-11 rounded-xl ${f.bg} flex items-center justify-center mb-4`}>
                <f.icon className={`w-5 h-5 ${f.color}`} />
              </div>
              <h3 className="text-base font-bold text-text-primary mb-2">{f.title}</h3>
              <p className="text-sm text-text-muted leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function WhyFacturia() {
  const points = [
    { icon: Clock, title: "Gagnez 3h par semaine", desc: "Automatisez la création de devis, la relance des impayés et les rapports hebdomadaires." },
    { icon: Shield, title: "Conforme à la loi française", desc: "Numérotation obligatoire, mentions légales, pénalités de retard, Chorus Pro — tout est inclus." },
    { icon: Sparkles, title: "IA au service du terrain", desc: "Décrivez vos travaux en langage naturel. L'IA génère le devis détaillé avec lignes et prix." },
  ];
  return (
    <section className="py-24 px-6 bg-surface">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-primary text-sm font-semibold uppercase tracking-wider mb-3">Pourquoi Facturia</p>
          <h2 className="text-4xl font-black text-text-primary mb-4">Fait pour les artisans, par des artisans</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {points.map((p) => (
            <div key={p.title} className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-5">
                <p.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-text-primary mb-3">{p.title}</h3>
              <p className="text-text-muted text-sm leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section id="tarifs" className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-primary text-sm font-semibold uppercase tracking-wider mb-3">Tarifs</p>
          <h2 className="text-4xl font-black text-text-primary mb-4">Simple et transparent</h2>
          <p className="text-text-muted text-lg">Pas de frais cachés. Changez de plan à tout moment.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl border p-7 flex flex-col ${
                plan.highlight
                  ? "border-primary/40 bg-primary/5 ring-1 ring-primary/30"
                  : "border-surface-border bg-surface"
              }`}
            >
              {plan.highlight && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/20 text-primary text-xs font-bold mb-4 self-start">
                  <Star className="w-3 h-3 fill-primary" /> Le plus populaire
                </div>
              )}
              <p className="text-sm font-semibold text-text-muted mb-1">{plan.desc}</p>
              <p className="text-3xl font-black text-text-primary mb-0.5">
                {plan.price === "0" ? "Gratuit" : `${plan.price} €`}
              </p>
              <p className="text-xs text-text-muted mb-6">{plan.period}</p>

              <ul className="space-y-2.5 flex-1 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-text-secondary">
                    <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href={plan.href}
                className={`w-full py-3 rounded-xl text-sm font-bold text-center transition-all flex items-center justify-center gap-2 ${
                  plan.highlight
                    ? "bg-primary text-background hover:bg-primary-400 hover:shadow-glow"
                    : "border border-surface-border text-text-primary hover:bg-surface-active hover:border-surface-active"
                }`}
              >
                {plan.cta} {plan.highlight && <ArrowRight className="w-4 h-4" />}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  return (
    <section className="py-24 px-6 bg-surface">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-primary text-sm font-semibold uppercase tracking-wider mb-3">Témoignages</p>
          <h2 className="text-4xl font-black text-text-primary mb-4">Ils en parlent mieux que nous</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="p-6 rounded-2xl border border-surface-border bg-background">
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: t.note }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                ))}
              </div>
              <p className="text-sm text-text-secondary leading-relaxed mb-5">&ldquo;{t.text}&rdquo;</p>
              <div>
                <p className="text-sm font-semibold text-text-primary">{t.name}</p>
                <p className="text-xs text-text-muted">{t.metier}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  return (
    <section id="faq" className="py-24 px-6">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-primary text-sm font-semibold uppercase tracking-wider mb-3">FAQ</p>
          <h2 className="text-4xl font-black text-text-primary mb-4">Questions fréquentes</h2>
        </div>
        <div className="space-y-3">
          {FAQS.map((faq) => (
            <details
              key={faq.q}
              className="group p-5 rounded-2xl border border-surface-border bg-surface cursor-pointer open:border-primary/30 open:bg-primary/5 transition-colors"
            >
              <summary className="flex items-center justify-between font-semibold text-text-primary text-sm list-none">
                {faq.q}
                <ChevronDown className="w-4 h-4 text-text-muted flex-shrink-0 group-open:rotate-180 transition-transform" />
              </summary>
              <p className="mt-4 text-sm text-text-muted leading-relaxed">{faq.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-3xl mx-auto text-center">
        <div className="relative p-12 rounded-3xl border border-primary/20 bg-primary/5 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-32 bg-primary/20 blur-3xl rounded-full pointer-events-none" />
          <div className="relative">
            <h2 className="text-4xl font-black text-text-primary mb-4">
              Prêt à simplifier votre activité ?
            </h2>
            <p className="text-text-muted text-lg mb-8">
              Rejoignez 1 200+ artisans. Gratuit à vie, sans carte bancaire.
            </p>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-primary text-background font-bold text-base hover:bg-primary-400 hover:shadow-glow transition-all"
            >
              Commencer gratuitement <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <>
      <Hero />
      <SocialProof />
      <Features />
      <WhyFacturia />
      <Pricing />
      <Testimonials />
      <FAQ />
      <CTA />
    </>
  );
}
