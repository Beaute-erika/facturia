"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import type { ClientStat } from "@/lib/analytics-data";

const TYPE_COLOR: Record<string, string> = {
  Public: "#00c97a",
  Professionnel: "#3b82f6",
  Particulier: "#f59e0b",
};

const CustomTooltip = ({ active, payload }: {
  active?: boolean;
  payload?: { value: number; payload: ClientStat }[];
}) => {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="bg-surface border border-surface-border rounded-xl px-3 py-2.5 shadow-card">
      <p className="text-xs font-semibold text-text-primary">{p.payload.name}</p>
      <p className="text-xs text-text-muted">{p.payload.type} · {p.payload.factures} factures</p>
      <p className="text-sm font-bold font-mono text-primary mt-1">
        {p.value.toLocaleString("fr-FR")} €
      </p>
    </div>
  );
};

interface TopClientsChartProps {
  data: ClientStat[];
}

export default function TopClientsChart({ data }: TopClientsChartProps) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
        barSize={20}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#1e2d3d" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fill: "#8899aa", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fill: "#8899aa", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={110}
          tickFormatter={(v: string) => v.length > 14 ? v.slice(0, 14) + "…" : v}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
        <Bar dataKey="ca" radius={[0, 6, 6, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={TYPE_COLOR[entry.type]} fillOpacity={0.85} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
