"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

interface DonutChartProps {
  data: { name: string; value: number; color: string }[];
  label?: string;
  total?: number;
}

const CustomTooltip = ({ active, payload }: {
  active?: boolean;
  payload?: { name: string; value: number; payload: { color: string } }[];
}) => {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="bg-surface border border-surface-border rounded-xl px-3 py-2 shadow-card">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full" style={{ background: p.payload.color }} />
        <span className="text-xs font-semibold text-text-primary">{p.name}</span>
      </div>
      <p className="text-xs font-bold font-mono text-text-primary mt-1">
        {p.value.toLocaleString("fr-FR")} €
      </p>
    </div>
  );
};

export default function DonutChart({ data, label, total }: DonutChartProps) {
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={3}
            dataKey="value"
            strokeWidth={0}
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} opacity={0.9} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      {/* Center label */}
      {total !== undefined && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-lg font-bold font-mono text-text-primary">
            {(total / 1000).toFixed(0)}k €
          </p>
          {label && <p className="text-[10px] text-text-muted mt-0.5">{label}</p>}
        </div>
      )}
    </div>
  );
}
