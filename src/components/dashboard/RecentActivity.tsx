import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { FileText, Receipt, Users, HardHat, ArrowRight } from "lucide-react";

const activities = [
  {
    id: 1,
    type: "facture",
    title: "Facture FA-2024-089",
    subtitle: "Martin Leblanc — Rénovation salle de bain",
    amount: "3 450 €",
    status: "payée",
    statusVariant: "success" as const,
    time: "Il y a 2h",
    icon: Receipt,
  },
  {
    id: 2,
    type: "devis",
    title: "Devis DV-2024-156",
    subtitle: "Sophie Girard — Installation chaudière",
    amount: "5 800 €",
    status: "en attente",
    statusVariant: "warning" as const,
    time: "Il y a 4h",
    icon: FileText,
  },
  {
    id: 3,
    type: "client",
    title: "Nouveau client",
    subtitle: "Pierre Moreau — Particulier",
    amount: null,
    status: "actif",
    statusVariant: "success" as const,
    time: "Hier",
    icon: Users,
  },
  {
    id: 4,
    type: "chantier",
    title: "Chantier ouvert",
    subtitle: "Famille Dupuis — Mise aux normes électriques",
    amount: "8 200 €",
    status: "en cours",
    statusVariant: "info" as const,
    time: "Hier",
    icon: HardHat,
  },
];

export default function RecentActivity() {
  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-text-primary">Activité récente</h3>
          <p className="text-sm text-text-muted mt-0.5">4 événements aujourd&apos;hui</p>
        </div>
        <button className="flex items-center gap-1.5 text-xs text-primary hover:text-primary-400 transition-colors">
          Tout voir <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="space-y-3">
        {activities.map((activity) => {
          const Icon = activity.icon;
          return (
            <div
              key={activity.id}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-hover transition-colors cursor-pointer group"
            >
              <div className="w-9 h-9 rounded-xl bg-surface-active flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-text-secondary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text-primary truncate">{activity.title}</p>
                <p className="text-xs text-text-muted truncate">{activity.subtitle}</p>
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                {activity.amount && (
                  <span className="text-sm font-semibold text-text-primary font-mono">
                    {activity.amount}
                  </span>
                )}
                <div className="flex items-center gap-2">
                  <Badge variant={activity.statusVariant} size="sm" dot>
                    {activity.status}
                  </Badge>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
