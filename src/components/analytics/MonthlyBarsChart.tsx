"use client";

import {
  ComposedChart, Bar, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import type { MonthData } from "@/lib/analytics-data";

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface border border-surface-border rounded-xl px-4 py-3 shadow-card">
      <p className="text-xs font-semibold text-text-muted mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex justify-between gap-4 items-center">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm" style={{ background: p.color }} />
            <span className="text-xs text-text-secondary">{p.name}</span>
          </div>
          <span className="text-xs font-bold font-mono" style={{ color: p.color }}>
            {typeof p.value === "number" && p.value > 100
              ? `${p.value.toLocaleString("fr-FR")} €`
              : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

interface MonthlyBarsChartProps {
  data: MonthData[];
}

export default function MonthlyBarsChart({ data }: MonthlyBarsChartProps) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={data} margin={{ top: 5, right: 5, left: -15, bottom: 0 }} barGap={2}>
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
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
        <Bar dataKey="ca" name="Encaissé" fill="#00c97a" fillOpacity={0.85} radius={[4, 4, 0, 0]} barSize={14} />
        <Bar dataKey="devis" name="Devis" fill="#3b82f6" fillOpacity={0.6} radius={[4, 4, 0, 0]} barSize={14} />
        <Line
          type="monotone"
          dataKey="facture"
          name="Facturé"
          stroke="#f59e0b"
          strokeWidth={2}
          dot={{ fill: "#f59e0b", r: 3 }}
          activeDot={{ r: 5 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
