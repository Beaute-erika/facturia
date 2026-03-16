import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { clsx } from "clsx";
import Card from "@/components/ui/Card";

interface KPICardProps {
  title: string;
  value: string;
  change: number;
  period?: string;
  icon: LucideIcon;
  color?: string;
  prefix?: string;
  suffix?: string;
}

export default function KPICard({
  title,
  value,
  change,
  period = "vs mois dernier",
  icon: Icon,
  color = "primary",
  prefix,
  suffix,
}: KPICardProps) {
  const isPositive = change >= 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;

  return (
    <Card className="group hover:border-primary/20">
      <div className="flex items-start justify-between mb-4">
        <div className={clsx(
          "w-10 h-10 rounded-xl flex items-center justify-center",
          color === "primary" ? "bg-primary/10 text-primary" :
          color === "warning" ? "bg-status-warning/10 text-status-warning" :
          color === "error" ? "bg-status-error/10 text-status-error" :
          color === "info" ? "bg-status-info/10 text-status-info" :
          "bg-primary/10 text-primary"
        )}>
          <Icon className="w-5 h-5" />
        </div>
        <span className={clsx(
          "flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg",
          isPositive
            ? "text-status-success bg-status-success/10"
            : "text-status-error bg-status-error/10"
        )}>
          <TrendIcon className="w-3 h-3" />
          {Math.abs(change)}%
        </span>
      </div>
      <div>
        <p className="text-text-muted text-sm font-medium mb-1">{title}</p>
        <p className="text-2xl font-bold text-text-primary font-mono tracking-tight">
          {prefix}<span className="tabular-nums">{value}</span>{suffix}
        </p>
        <p className="text-text-muted text-xs mt-1">{period}</p>
      </div>
    </Card>
  );
}
