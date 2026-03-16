"use client";

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import type { MonthData } from "@/lib/analytics-data";

interface CAEvolutionChartProps {
  data: MonthData[];
  showN1: boolean;
}

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface border border-surface-border rounded-xl px-4 py-3 shadow-card min-w-[160px]">
      <p className="text-xs font-semibold text-text-muted mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
            <span className="text-xs text-text-secondary">{p.name}</span>
          </div>
          <span className="text-xs font-bold font-mono" style={{ color: p.color }}>
            {p.value.toLocaleString("fr-FR")} €
          </span>
        </div>
      ))}
    </div>
  );
};

export default function CAEvolutionChart({ data, showN1 }: CAEvolutionChartProps) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
        <defs>
          <linearGradient id="gradCA" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#00c97a" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#00c97a" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradFacture" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradN1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#8899aa" stopOpacity={0.1} />
            <stop offset="95%" stopColor="#8899aa" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e2d3d" vertical={false} />
        <XAxis
          dataKey="shortMonth"
          tick={{ fill: "#8899aa", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "#8899aa", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
        />
        <Tooltip content={<CustomTooltip />} />
        {showN1 && (
          <Area
            type="monotone"
            dataKey="caN1"
            name="CA N-1"
            stroke="#4a5a6a"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            fill="url(#gradN1)"
            dot={false}
            activeDot={{ r: 3, fill: "#4a5a6a" }}
          />
        )}
        <Area
          type="monotone"
          dataKey="facture"
          name="Facturé"
          stroke="#3b82f6"
          strokeWidth={2}
          fill="url(#gradFacture)"
          dot={false}
          activeDot={{ r: 4, fill: "#3b82f6" }}
        />
        <Area
          type="monotone"
          dataKey="ca"
          name="Encaissé"
          stroke="#00c97a"
          strokeWidth={2.5}
          fill="url(#gradCA)"
          dot={false}
          activeDot={{ r: 4, fill: "#00c97a" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
