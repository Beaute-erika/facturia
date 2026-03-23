export const metadata = {
  title: "Mentions légales — Facturia",
  description: "Mentions légales de Facturia, éditeur du logiciel de facturation pour artisans.",
};

export default function MentionsLegalesPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-20">
      <h1 className="text-3xl font-black text-text-primary mb-10">Mentions légales</h1>

      <section className="space-y-8 text-sm text-text-secondary leading-relaxed">
        <div>
          <h2 className="text-base font-bold text-text-primary mb-3">1. Éditeur du site</h2>
          <p>
            Le site <strong>facturia.fr</strong> est édité par :<br />
            <strong>[NOM DE VOTRE SOCIÉTÉ / NOM PRÉNOM si auto-entrepreneur]</strong><br />
            Statut : [SAS / SARL / Auto-entrepreneur / ...] <br />
            SIRET : [À compléter]<br />
            Adresse : [À compléter]<br />
            Email : contact@facturia.fr<br />
            Téléphone : [À compléter]
          </p>
        </div>

        <div>
          <h2 className="text-base font-bold text-text-primary mb-3">2. Directeur de la publication</h2>
          <p>[Prénom Nom], en qualité de [gérant / président / fondateur].</p>
        </div>

        <div>
          <h2 className="text-base font-bold text-text-primary mb-3">3. Hébergeur</h2>
          <p>
            Ce site est hébergé par :<br />
            <strong>Vercel Inc.</strong><br />
            340 Pine Street, Suite 701, San Francisco, CA 94104, USA<br />
            <a href="https://vercel.com" className="text-primary underline">vercel.com</a>
          </p>
          <p className="mt-2">
            Les données des utilisateurs sont stockées par :<br />
            <strong>Supabase Inc.</strong> — infrastructure PostgreSQL hébergée en Europe (AWS Frankfurt).<br />
            <a href="https://supabase.com" className="text-primary underline">supabase.com</a>
          </p>
        </div>

        <div>
          <h2 className="text-base font-bold text-text-primary mb-3">4. Propriété intellectuelle</h2>
          <p>
            L&apos;ensemble du contenu de ce site (textes, logos, graphismes, code source) est protégé par le droit
            de la propriété intellectuelle et appartient à l&apos;éditeur. Toute reproduction sans autorisation est
            interdite.
          </p>
        </div>

        <div>
          <h2 className="text-base font-bold text-text-primary mb-3">5. Données personnelles</h2>
          <p>
            La collecte et le traitement des données personnelles sont décrits dans notre{" "}
            <a href="/confidentialite" className="text-primary underline">Politique de confidentialité</a>.
            Conformément au RGPD, vous disposez d&apos;un droit d&apos;accès, de rectification et de suppression
            de vos données. Contactez-nous à : <strong>privacy@facturia.fr</strong>
          </p>
        </div>

        <div>
          <h2 className="text-base font-bold text-text-primary mb-3">6. Cookies</h2>
          <p>
            Ce site utilise des cookies strictement nécessaires au fonctionnement du service (authentification,
            session). Aucun cookie publicitaire ou de tracking n&apos;est utilisé sans votre consentement.
          </p>
        </div>

        <div>
          <h2 className="text-base font-bold text-text-primary mb-3">7. Droit applicable</h2>
          <p>
            Les présentes mentions légales sont régies par le droit français. En cas de litige, les tribunaux
            français seront compétents.
          </p>
        </div>

        <p className="text-xs text-text-muted pt-4 border-t border-surface-border">
          Dernière mise à jour : mars 2025
        </p>
      </section>
    </div>
  );
}
