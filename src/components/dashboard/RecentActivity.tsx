import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { FileText, Receipt, ArrowRight } from "lucide-react";

export interface ActivityItem {
  id: string;
  type: "facture" | "devis";
  title: string;
  subtitle: string;
  amount: string | null;
  status: string;
  statusVariant: "success" | "warning" | "error" | "info";
  time: string;
}

export default function RecentActivity({ activities }: { activities: ActivityItem[] }) {
  if (activities.length === 0) {
    return (
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-text-primary">Activité récente</h3>
            <p className="text-sm text-text-muted mt-0.5">Aucune activité pour le moment</p>
          </div>
        </div>
        <p className="text-sm text-text-muted text-center py-6">
          Créez votre premier devis ou facture pour commencer.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-text-primary">Activité récente</h3>
          <p className="text-sm text-text-muted mt-0.5">{activities.length} document{activities.length > 1 ? "s" : ""}</p>
        </div>
        <button className="flex items-center gap-1.5 text-xs text-primary hover:text-primary-400 transition-colors">
          Tout voir <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="space-y-3">
        {activities.map((activity) => {
          const Icon = activity.type === "facture" ? Receipt : FileText;
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
