import Link from "next/link";

const LINKS = {
  Produit: [
    { href: "/#fonctionnalites", label: "Fonctionnalités" },
    { href: "/pricing", label: "Tarifs" },
    { href: "/#faq", label: "FAQ" },
    { href: "/signup", label: "Essai gratuit" },
  ],
  Application: [
    { href: "/login", label: "Se connecter" },
    { href: "/signup", label: "Créer un compte" },
    { href: "/app", label: "Tableau de bord" },
  ],
  Légal: [
    { href: "/mentions-legales", label: "Mentions légales" },
    { href: "/confidentialite", label: "Confidentialité" },
    { href: "/cgv", label: "CGV" },
  ],
};

export default function Footer() {
  return (
    <footer className="border-t border-surface-border bg-background">
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 font-bold text-lg text-text-primary mb-3">
              <span className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center text-background text-sm font-black">F</span>
              Facturia
            </div>
            <p className="text-sm text-text-muted leading-relaxed">
              Le CRM simple et efficace pour les artisans français. Gérez votre activité depuis un seul endroit.
            </p>
          </div>

          {/* Links */}
          {Object.entries(LINKS).map(([section, items]) => (
            <div key={section}>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">{section}</p>
              <ul className="space-y-2.5">
                {items.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="text-sm text-text-muted hover:text-text-primary transition-colors">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-6 border-t border-surface-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-text-muted">
            © {new Date().getFullYear()} Facturia. Tous droits réservés.
          </p>
          <p className="text-xs text-text-muted">
            Conçu pour les artisans 🇫🇷
          </p>
        </div>
      </div>
    </footer>
  );
}
