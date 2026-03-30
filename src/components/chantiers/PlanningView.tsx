"use client";

import { useMemo } from "react";
import { clsx } from "clsx";
import type { Chantier, ChantierStatus } from "@/lib/chantiers-types";
import Badge from "@/components/ui/Badge";

interface PlanningViewProps {
  chantiers: Chantier[];
  onSelect: (c: Chantier) => void;
  selected: string | null;
}

const STATUS_COLOR: Record<ChantierStatus, string> = {
  "en cours": "bg-status-info/80 border-status-info",
  "terminé":  "bg-primary/80 border-primary",
  "planifié": "bg-status-warning/80 border-status-warning",
  "suspendu": "bg-surface-active border-surface-border",
};

const STATUS_BADGE: Record<ChantierStatus, "success" | "warning" | "info" | "default"> = {
  "en cours": "info",
  "terminé":  "success",
  "planifié": "warning",
  "suspendu": "default",
};

const MONTH_FR = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Aoû", "Sep", "Oct", "Nov", "Déc"];

function parseDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export default function PlanningView({ chantiers, onSelect, selected }: PlanningViewProps) {
  const today = new Date();

  const windowStart = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() - d.getDay() + 1 - 14); // 2 weeks before current Monday
    return d;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const TOTAL_DAYS = 70; // 10 weeks

  const days = useMemo(() => {
    return Array.from({ length: TOTAL_DAYS }, (_, i) => {
      const d = new Date(windowStart);
      d.setDate(windowStart.getDate() + i);
      return d;
    });
  }, [windowStart]);

  // Group days into weeks for header
  const weeks = useMemo(() => {
    const result: { label: string; days: Date[] }[] = [];
    for (let i = 0; i < TOTAL_DAYS; i += 7) {
      const weekDays = days.slice(i, i + 7);
      const first = weekDays[0];
      const last = weekDays[weekDays.length - 1];
      const label =
        first.getMonth() === last.getMonth()
          ? `${MONTH_FR[first.getMonth()]} ${first.getFullYear()}`
          : `${MONTH_FR[first.getMonth()]}–${MONTH_FR[last.getMonth()]} ${last.getFullYear()}`;
      result.push({ label, days: weekDays });
    }
    return result;
  }, [days]);

  const dayWidth   = 36; // px per day
  const rowHeight  = 56; // px per chantier row
  const labelWidth = 200;

  const getX = (date: Date) => {
    const diff = Math.floor((date.getTime() - windowStart.getTime()) / 86400000);
    return diff * dayWidth;
  };

  const todayX = getX(today);

  return (
    <div className="rounded-2xl border border-surface-border overflow-hidden bg-background-secondary">
      {/* Legend */}
      <div className="px-5 py-3 border-b border-surface-border flex items-center gap-5 flex-wrap">
        <p className="text-sm font-semibold text-text-primary">Planning Gantt</p>
        <div className="flex items-center gap-3 ml-auto flex-wrap">
          {(["en cours", "planifié", "terminé", "suspendu"] as ChantierStatus[]).map((s) => (
            <div key={s} className="flex items-center gap-1.5">
              <div className={clsx("w-3 h-3 rounded-sm border", STATUS_COLOR[s])} />
              <span className="text-xs text-text-muted capitalize">{s}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <div className="w-0.5 h-4 bg-primary" />
            <span className="text-xs text-primary font-medium">Aujourd&apos;hui</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div style={{ minWidth: labelWidth + TOTAL_DAYS * dayWidth + 16 }}>
          {/* Header — weeks */}
          <div className="flex border-b border-surface-border bg-background">
            <div style={{ minWidth: labelWidth, width: labelWidth }} className="px-4 py-2 text-xs font-semibold text-text-muted border-r border-surface-border flex-shrink-0">
              Chantier
            </div>
            <div className="relative flex-1">
              {/* Week labels */}
              <div className="flex">
                {weeks.map((week, wi) => (
                  <div
                    key={wi}
                    style={{ width: 7 * dayWidth }}
                    className="text-center py-1.5 text-[10px] font-semibold text-text-muted border-r border-surface-border/50 flex-shrink-0"
                  >
                    {week.label}
                  </div>
                ))}
              </div>
              {/* Day labels */}
              <div className="flex border-t border-surface-border/30">
                {days.map((d, di) => {
                  const isToday   = d.toDateString() === today.toDateString();
                  const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                  return (
                    <div
                      key={di}
                      style={{ width: dayWidth }}
                      className={clsx(
                        "text-center py-1 text-[10px] flex-shrink-0 border-r border-surface-border/20",
                        isToday ? "text-primary font-bold bg-primary/10" : isWeekend ? "text-text-muted/40" : "text-text-muted"
                      )}
                    >
                      {d.getDate()}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Rows */}
          {chantiers.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-text-muted">Aucun chantier à afficher</div>
          ) : (
            chantiers.map((c) => {
              const startDate = c.date_debut      ? parseDate(c.date_debut)      : today;
              const endDate   = c.date_fin_prevue ? parseDate(c.date_fin_prevue) : today;
              const barX    = Math.max(0, getX(startDate));
              const barEndX = Math.min(TOTAL_DAYS * dayWidth, getX(endDate) + dayWidth);
              const barWidth = Math.max(dayWidth, barEndX - barX);
              const isSelected = selected === c.id;

              return (
                <div
                  key={c.id}
                  className={clsx(
                    "flex border-b border-surface-border/50 last:border-0 cursor-pointer transition-colors",
                    isSelected ? "bg-primary/5" : "hover:bg-surface-hover/30"
                  )}
                  style={{ height: rowHeight }}
                  onClick={() => onSelect(c)}
                >
                  {/* Label */}
                  <div
                    style={{ minWidth: labelWidth, width: labelWidth }}
                    className="px-4 flex items-center gap-3 border-r border-surface-border flex-shrink-0"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-text-primary truncate">{c.client}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Badge variant={STATUS_BADGE[c.status]} size="sm">{c.status}</Badge>
                      </div>
                    </div>
                  </div>

                  {/* Timeline area */}
                  <div className="relative flex-1 overflow-hidden">
                    {/* Weekend shading */}
                    {days.map((d, di) => {
                      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                      return isWeekend ? (
                        <div
                          key={di}
                          style={{ left: di * dayWidth, width: dayWidth, top: 0, bottom: 0 }}
                          className="absolute bg-surface-border/20"
                        />
                      ) : null;
                    })}

                    {/* Today line */}
                    <div
                      style={{ left: todayX + dayWidth / 2 }}
                      className="absolute top-0 bottom-0 w-0.5 bg-primary/60 z-10"
                    />

                    {/* Gantt bar */}
                    <div
                      style={{ left: barX, width: barWidth, top: "50%", transform: "translateY(-50%)" }}
                      className="absolute"
                    >
                      <div className={clsx(
                        "h-8 rounded-lg border flex items-center px-2 gap-2 overflow-hidden",
                        STATUS_COLOR[c.status],
                        isSelected && "ring-2 ring-white/30"
                      )}>
                        {/* Progress fill */}
                        <div
                          className="absolute left-0 top-0 bottom-0 bg-white/10 rounded-lg"
                          style={{ width: `${c.progression}%` }}
                        />
                        <span className="text-[11px] font-semibold text-white truncate relative z-10">
                          {c.titre}
                        </span>
                        {c.progression > 0 && c.progression < 100 && (
                          <span className="text-[10px] text-white/80 font-mono ml-auto relative z-10 flex-shrink-0">
                            {c.progression}%
                          </span>
                        )}
                        {c.status === "terminé" && (
                          <span className="text-[10px] text-white/80 ml-auto relative z-10 flex-shrink-0">✓</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-2.5 bg-background border-t border-surface-border text-xs text-text-muted">
        Cliquez sur un chantier pour ouvrir la fiche détaillée
      </div>
    </div>
  );
}
