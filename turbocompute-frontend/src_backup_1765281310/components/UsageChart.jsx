// src/components/UsageChart.jsx
import React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
  CartesianGrid,
} from "recharts";

/**
 * UsageChart
 * Props:
 *  - data: [{ ts: '10:00', cpu: 12, gpu: 45, mem: 30 }, ...]
 *  - type: "line" | "area"
 *  - dataKey: key to show e.g. "gpu"
 */
export default function UsageChart({ data = [], type = "area", dataKey = "gpu", color = "#90caf9" }) {
  if (!data || data.length === 0) {
    // small fallback dataset
    data = [
      { ts: "00:00", value: 5 },
      { ts: "01:00", value: 10 },
      { ts: "02:00", value: 8 },
      { ts: "03:00", value: 12 },
      { ts: "04:00", value: 6 },
      { ts: "05:00", value: 18 },
      { ts: "06:00", value: 14 },
    ].map((d, i) => ({ ts: d.ts, cpu: Math.round(Math.random() * 60), gpu: Math.round(Math.random() * 90), mem: Math.round(Math.random() * 80) }));
  }

  return (
    <ResponsiveContainer width="100%" height={160}>
      {type === "line" ? (
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
          <XAxis dataKey="ts" tick={{ fill: "rgba(255,255,255,0.6)" }} />
          <YAxis tick={{ fill: "rgba(255,255,255,0.6)" }} />
          <Tooltip />
          <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} />
        </LineChart>
      ) : (
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
          <XAxis dataKey="ts" tick={{ fill: "rgba(255,255,255,0.6)" }} />
          <YAxis tick={{ fill: "rgba(255,255,255,0.6)" }} />
          <Tooltip />
          <Area type="monotone" dataKey={dataKey} stroke={color} fill={color} fillOpacity={0.12} />
        </AreaChart>
      )}
    </ResponsiveContainer>
  );
}
