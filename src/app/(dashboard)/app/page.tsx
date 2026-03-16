import {
  Euro,
  FileText,
  Users,
  Clock,
  AlertCircle,
  CheckCircle2,
  HardHat,
  Sparkles,
  ArrowRight,
  Calendar,
} from "lucide-react";
import KPICard from "@/components/dashboard/KPICard";
import RevenueChart from "@/components/dashboard/RevenueChart";
import RecentActivity from "@/components/dashboard/RecentActivity";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

const kpis = [
  {
    title: "CA ce mois",
    value: "28 400",
    change: 12.4,
    icon: Euro,
    color: "primary",
    suffix: " €",
  },
  {
    title: "Factures en attente",
    value: "14 820",
    change: -3.2,
    icon: FileText,
    color: "warning",
    suffix: " €",
    period: "3 factures impayées",
  },
  {
    title: "Clients actifs",
    value: "47",
    change: 8.7,
    icon: Users,
    color: "info",
    period: "+4 ce mois",
  },
  {
    title: "Devis en cours",
    value: "8",
    change: 5.0,
    icon: Clock,
    color: "primary",
    period: "Valeur : 42 300 €",
  },
];

const pendingActions = [
  { id: 1, label: "Facture FA-2024-087 en retard de 15 jours", type: "error", action: "Relancer" },
  { id: 2, label: "Devis DV-2024-154 accepté — à convertir en facture", type: "success", action: "Convertir" },
  { id: 3, label: "Chorus Pro : 2 factures à déposer", type: "warning", action: "Déposer" },
  { id: 4, label: "Avis Google Business en attente de réponse", type: "info", action: "Répondre" },
];

const upcomingChantiers = [
  { id: 1, client: "Famille Martin", type: "Plomberie", date: "Lun. 18 Mar.", status: "confirmé" },
  { id: 2, client: "M. Bertrand", type: "Chauffage", date: "Mer. 20 Mar.", status: "confirmé" },
  { id: 3, client: "SCI Verdure", type: "Rénovation", date: "Jeu. 21 Mar.", status: "à confirmer" },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            Bonjour, Jean 👋
          </h1>
          <p className="text-text-muted mt-1">
            Lundi 16 mars 2026 • <span className="text-primary font-medium">3 actions requises</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" icon={Calendar} size="sm">
            Planning
          </Button>
          <Button variant="primary" icon={Sparkles} size="sm">
            Agent IA
          </Button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <KPICard key={i} {...kpi} />
        ))}
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-3 gap-4">
        {/* Revenue chart — spans 2 cols */}
        <RevenueChart />

        {/* Pending actions */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-text-primary">Actions requises</h3>
            <span className="w-5 h-5 bg-status-error rounded-full flex items-center justify-center text-[10px] font-bold text-white">
              {pendingActions.length}
            </span>
          </div>
          <div className="space-y-2">
            {pendingActions.map((action) => (
              <div
                key={action.id}
                className="flex items-start gap-3 p-3 rounded-xl bg-background-secondary group hover:bg-surface-hover transition-colors cursor-pointer"
              >
                <div className="mt-0.5">
                  {action.type === "error" && <AlertCircle className="w-4 h-4 text-status-error" />}
                  {action.type === "success" && <CheckCircle2 className="w-4 h-4 text-status-success" />}
                  {action.type === "warning" && <AlertCircle className="w-4 h-4 text-status-warning" />}
                  {action.type === "info" && <AlertCircle className="w-4 h-4 text-status-info" />}
                </div>
                <p className="flex-1 text-xs text-text-secondary leading-relaxed">{action.label}</p>
                <button className="text-[10px] text-primary font-semibold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {action.action} →
                </button>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Bottom grid */}
      <div className="grid grid-cols-3 gap-4">
        {/* Recent activity */}
        <div className="col-span-2">
          <RecentActivity />
        </div>

        {/* Upcoming chantiers */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-text-primary">Chantiers à venir</h3>
              <p className="text-sm text-text-muted mt-0.5">Cette semaine</p>
            </div>
            <Button variant="ghost" size="sm" iconRight={ArrowRight}>
              Voir tout
            </Button>
          </div>
          <div className="space-y-3">
            {upcomingChantiers.map((chantier) => (
              <div
                key={chantier.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-background-secondary hover:bg-surface-hover transition-colors cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-surface-active flex items-center justify-center flex-shrink-0">
                  <HardHat className="w-4 h-4 text-text-muted" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text-primary truncate">{chantier.client}</p>
                  <p className="text-xs text-text-muted">{chantier.type}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-medium text-text-primary">{chantier.date}</p>
                  <Badge
                    variant={chantier.status === "confirmé" ? "success" : "warning"}
                    size="sm"
                  >
                    {chantier.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>

          {/* AI suggestion banner */}
          <div className="mt-4 p-3 rounded-xl bg-primary/5 border border-primary/15">
            <div className="flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-primary mb-0.5">Suggestion IA</p>
                <p className="text-xs text-text-muted leading-relaxed">
                  Relancez M. Bertrand pour confirmer le chantier du 20 mars avant vendredi.
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
