export const metadata = {
  title: "Politique de confidentialité — Facturia",
  description: "Comment Facturia collecte, utilise et protège vos données personnelles.",
};

export default function ConfidentialitePage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-20">
      <h1 className="text-3xl font-black text-text-primary mb-2">Politique de confidentialité</h1>
      <p className="text-sm text-text-muted mb-10">Dernière mise à jour : mars 2025</p>

      <section className="space-y-8 text-sm text-text-secondary leading-relaxed">
        <div>
          <h2 className="text-base font-bold text-text-primary mb-3">1. Responsable du traitement</h2>
          <p>
            <strong>[Nom de votre société]</strong>, éditeur de Facturia (facturia.fr).<br />
            Contact DPO : <strong>privacy@facturia.fr</strong>
          </p>
        </div>

        <div>
          <h2 className="text-base font-bold text-text-primary mb-3">2. Données collectées</h2>
          <p>Dans le cadre de l&apos;utilisation du service Facturia, nous collectons :</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Données de compte :</strong> nom, prénom, email, mot de passe hashé, métier, SIRET, adresse professionnelle.</li>
            <li><strong>Données d&apos;activité :</strong> clients, devis, factures, chantiers créés dans l&apos;application.</li>
            <li><strong>Données techniques :</strong> adresse IP, type de navigateur, cookies de session.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-base font-bold text-text-primary mb-3">3. Finalités et base légale</h2>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-surface-border">
                <th className="text-left py-2 pr-4 font-semibold text-text-primary">Finalité</th>
                <th className="text-left py-2 font-semibold text-text-primary">Base légale (RGPD)</th>
              </tr>
            </thead>
            <tbody className="space-y-1">
              {[
                ["Fourniture du service de facturation", "Exécution du contrat (Art. 6.1.b)"],
                ["Envoi d'emails transactionnels (factures, confirmations)", "Exécution du contrat (Art. 6.1.b)"],
                ["Assistance IA (génération de devis)", "Intérêt légitime / consentement (Art. 6.1.f)"],
                ["Facturation et abonnement", "Obligation légale / contrat (Art. 6.1.b/c)"],
                ["Amélioration du service", "Intérêt légitime (Art. 6.1.f)"],
              ].map(([fin, base]) => (
                <tr key={fin} className="border-b border-surface-border/50">
                  <td className="py-2 pr-4">{fin}</td>
                  <td className="py-2">{base}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <h2 className="text-base font-bold text-text-primary mb-3">4. Sous-traitants (destinataires des données)</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Supabase Inc.</strong> (base de données, authentification) — hébergement AWS Frankfurt (EU). DPA disponible sur supabase.com.</li>
            <li><strong>Resend Inc.</strong> (envoi d&apos;emails transactionnels) — hébergement USA. Clauses contractuelles types UE appliquées.</li>
            <li><strong>Stripe Inc.</strong> (paiements, abonnements) — certifié PCI DSS. DPA disponible sur stripe.com.</li>
            <li><strong>Anthropic PBC</strong> (assistant IA) — traitement des descriptions de travaux pour générer des devis. Aucune donnée personnelle identifiante n&apos;est transmise.</li>
            <li><strong>Vercel Inc.</strong> (hébergement applicatif) — infrastructure edge mondiale. DPA disponible sur vercel.com.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-base font-bold text-text-primary mb-3">5. Durée de conservation</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Données de compte : durée de l&apos;abonnement + 3 ans (prescription commerciale).</li>
            <li>Factures et documents comptables : 10 ans (obligation légale française).</li>
            <li>Données de connexion (logs) : 1 an.</li>
            <li>Après suppression du compte : anonymisation sous 30 jours.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-base font-bold text-text-primary mb-3">6. Vos droits (RGPD)</h2>
          <p>Vous disposez des droits suivants sur vos données :</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Accès</strong> : obtenir une copie de vos données.</li>
            <li><strong>Rectification</strong> : corriger des données inexactes.</li>
            <li><strong>Suppression</strong> : demander la suppression de votre compte et données.</li>
            <li><strong>Portabilité</strong> : recevoir vos données dans un format structuré (CSV/JSON).</li>
            <li><strong>Opposition</strong> : vous opposer à certains traitements basés sur l&apos;intérêt légitime.</li>
            <li><strong>Limitation</strong> : demander la suspension d&apos;un traitement.</li>
          </ul>
          <p className="mt-3">
            Pour exercer ces droits : <strong>privacy@facturia.fr</strong><br />
            Réponse sous 30 jours. En cas de non-satisfaction, vous pouvez saisir la{" "}
            <a href="https://www.cnil.fr" className="text-primary underline" target="_blank" rel="noopener noreferrer">CNIL</a>.
          </p>
        </div>

        <div>
          <h2 className="text-base font-bold text-text-primary mb-3">7. Sécurité des données</h2>
          <p>
            Facturia met en œuvre les mesures techniques suivantes pour protéger vos données :
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Chiffrement en transit (HTTPS/TLS 1.3).</li>
            <li>Chiffrement au repos (AES-256 via Supabase/AWS).</li>
            <li>Isolation des données par utilisateur (Row Level Security PostgreSQL).</li>
            <li>Authentification sécurisée (bcrypt pour les mots de passe, JWT httpOnly).</li>
            <li>Accès aux données de production restreint aux équipes autorisées.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-base font-bold text-text-primary mb-3">8. Cookies</h2>
          <p>
            Facturia utilise uniquement des cookies techniques nécessaires au fonctionnement du service
            (cookie de session d&apos;authentification). Ces cookies ne nécessitent pas de consentement (Directive
            ePrivacy, Art. 5.3). Aucun cookie publicitaire ou de tracking tiers n&apos;est déposé.
          </p>
        </div>

        <div>
          <h2 className="text-base font-bold text-text-primary mb-3">9. Transferts hors UE</h2>
          <p>
            Certains sous-traitants (Resend, Anthropic) traitent des données hors de l&apos;UE. Ces transferts
            sont encadrés par les Clauses Contractuelles Types (CCT) de la Commission européenne.
          </p>
        </div>

        <div>
          <h2 className="text-base font-bold text-text-primary mb-3">10. Modifications</h2>
          <p>
            Toute modification substantielle de cette politique sera notifiée par email aux utilisateurs
            au moins 30 jours avant son entrée en vigueur.
          </p>
        </div>
      </section>
    </div>
  );
}
