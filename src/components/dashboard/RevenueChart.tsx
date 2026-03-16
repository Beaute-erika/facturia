"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import Card from "@/components/ui/Card";

const data = [
  { month: "Sep", revenue: 18500, invoiced: 22000 },
  { month: "Oct", revenue: 21000, invoiced: 25500 },
  { month: "Nov", revenue: 19800, invoiced: 23000 },
  { month: "Déc", revenue: 24200, invoiced: 28000 },
  { month: "Jan", revenue: 22100, invoiced: 26500 },
  { month: "Fév", revenue: 26800, invoiced: 31000 },
  { month: "Mar", revenue: 28400, invoiced: 33500 },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-surface border border-surface-border rounded-xl p-3 shadow-card">
        <p className="text-text-muted text-xs font-medium mb-2">{label}</p>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {payload.map((entry: any) => (
          <p key={entry.name} className="text-sm font-semibold" style={{ color: entry.color }}>
            {entry.name === "revenue" ? "Encaissé" : "Facturé"}: {entry.value.toLocaleString("fr-FR")} €
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function RevenueChart() {
  return (
    <Card className="col-span-2">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base font-semibold text-text-primary">Chiffre d&apos;affaires</h3>
          <p className="text-sm text-text-muted mt-0.5">Évolution sur 7 mois</p>
        </div>
        <div className="flex items-center gap-4 text-xs text-text-muted">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-primary rounded" />
            Encaissé
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-status-info rounded" />
            Facturé
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#00c97a" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#00c97a" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorInvoiced" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e2d3d" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fill: "#8899aa", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#8899aa", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="invoiced"
            stroke="#3b82f6"
            strokeWidth={2}
            fill="url(#colorInvoiced)"
            dot={false}
            activeDot={{ r: 4, fill: "#3b82f6" }}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#00c97a"
            strokeWidth={2}
            fill="url(#colorRevenue)"
            dot={false}
            activeDot={{ r: 4, fill: "#00c97a" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
}
