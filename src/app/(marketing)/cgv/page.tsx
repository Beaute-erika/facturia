export const metadata = {
  title: "Conditions Générales de Vente — Facturia",
  description: "Conditions générales de vente et d'utilisation du service Facturia.",
};

export default function CGVPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-20">
      <h1 className="text-3xl font-black text-text-primary mb-2">Conditions Générales de Vente</h1>
      <p className="text-sm text-text-muted mb-10">En vigueur au 1er mars 2025</p>

      <section className="space-y-8 text-sm text-text-secondary leading-relaxed">
        <div>
          <h2 className="text-base font-bold text-text-primary mb-3">1. Parties</h2>
          <p>
            Les présentes CGV régissent les relations entre :<br />
            <strong>[Nom de votre société]</strong>, éditeur du logiciel Facturia (ci-après «&nbsp;Facturia&nbsp;»),<br />
            et toute personne physique ou morale souscrivant un abonnement payant au service (ci-après «&nbsp;l&apos;Utilisateur&nbsp;»).
          </p>
        </div>

        <div>
          <h2 className="text-base font-bold text-text-primary mb-3">2. Description du service</h2>
          <p>
            Facturia est une application SaaS (Software as a Service) accessible en ligne permettant la gestion
            de clients, la création de devis et de factures, le suivi de chantiers et l&apos;accès à un assistant IA.
            Le service est fourni «&nbsp;tel quel&nbsp;», en mode cloud.
          </p>
        </div>

        <div>
          <h2 className="text-base font-bold text-text-primary mb-3">3. Plans et tarifs</h2>
          <p>Facturia propose les plans suivants (tarifs TTC) :</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Starter :</strong> Gratuit à vie — 5 clients, 5 devis/mois, 5 factures/mois.</li>
            <li><strong>Pro :</strong> 29 € / mois — clients, devis et factures illimités, assistant IA, Chorus Pro.</li>
            <li><strong>Business :</strong> 49 € / mois — tout Pro + utilisateurs illimités, multi-sociétés.</li>
          </ul>
          <p className="mt-2">
            Les tarifs peuvent être modifiés avec un préavis de 30 jours notifié par email.
          </p>
        </div>

        <div>
          <h2 className="text-base font-bold text-text-primary mb-3">4. Facturation et paiement</h2>
          <p>
            Les abonnements payants sont facturés mensuellement, à terme à échoir, par prélèvement automatique
            via Stripe. La première facturation intervient à la souscription. Les factures sont émises
            électroniquement et disponibles dans l&apos;espace client.
          </p>
          <p className="mt-2">
            En cas de non-paiement, le service est suspendu après 7 jours de retard, puis résilié après 30 jours.
          </p>
        </div>

        <div>
          <h2 className="text-base font-bold text-text-primary mb-3">5. Durée et résiliation</h2>
          <p>
            Les abonnements sont sans engagement de durée. L&apos;Utilisateur peut résilier à tout moment depuis
            les paramètres de son compte. La résiliation prend effet à la fin de la période en cours, sans
            remboursement au prorata.
          </p>
          <p className="mt-2">
            Facturia se réserve le droit de résilier un compte en cas de violation des présentes CGV, avec
            notification préalable sauf urgence (fraude, sécurité).
          </p>
        </div>

        <div>
          <h2 className="text-base font-bold text-text-primary mb-3">6. Droit de rétractation</h2>
          <p>
            Conformément à l&apos;article L221-28 du Code de la consommation, le droit de rétractation ne
            s&apos;applique pas aux services entièrement exécutés avant la fin du délai de rétractation avec accord
            préalable du consommateur. Pour les nouvelles souscriptions, l&apos;Utilisateur bénéficie toutefois de
            14 jours de remboursement intégral sur simple demande à contact@facturia.fr.
          </p>
        </div>

        <div>
          <h2 className="text-base font-bold text-text-primary mb-3">7. Propriété des données</h2>
          <p>
            L&apos;Utilisateur reste propriétaire de l&apos;intégralité de ses données (clients, devis, factures).
            Facturia agit en qualité de sous-traitant au sens du RGPD. En cas de résiliation, l&apos;Utilisateur
            peut exporter ses données au format CSV/PDF pendant 30 jours. Passé ce délai, les données sont
            supprimées définitivement.
          </p>
        </div>

        <div>
          <h2 className="text-base font-bold text-text-primary mb-3">8. Disponibilité du service</h2>
          <p>
            Facturia s&apos;engage à maintenir une disponibilité du service de 99 % sur une base mensuelle
            (hors maintenances planifiées notifiées 48h à l&apos;avance). En cas d&apos;indisponibilité dépassant
            4h consécutives, une prolongation gratuite d&apos;abonnement équivalente sera accordée.
          </p>
        </div>

        <div>
          <h2 className="text-base font-bold text-text-primary mb-3">9. Responsabilité</h2>
          <p>
            Facturia est un outil d&apos;aide à la gestion. La responsabilité de l&apos;exactitude des informations
            comptables et fiscales incombe à l&apos;Utilisateur. Facturia ne peut être tenu responsable
            des erreurs de saisie ni des conséquences fiscales. La responsabilité de Facturia est limitée
            au montant des abonnements payés au cours des 12 derniers mois.
          </p>
        </div>

        <div>
          <h2 className="text-base font-bold text-text-primary mb-3">10. Litiges et droit applicable</h2>
          <p>
            Les présentes CGV sont soumises au droit français. En cas de litige, l&apos;Utilisateur consommateur
            peut recourir gratuitement à un médiateur : <strong>[Nom du médiateur agréé]</strong>.<br />
            À défaut de résolution amiable, les tribunaux de <strong>[ville du siège social]</strong> seront
            compétents.
          </p>
        </div>

        <div>
          <h2 className="text-base font-bold text-text-primary mb-3">11. Contact</h2>
          <p>
            Pour toute question relative aux présentes CGV :<br />
            Email : <strong>contact@facturia.fr</strong><br />
            Adresse : [À compléter]
          </p>
        </div>
      </section>
    </div>
  );
}
