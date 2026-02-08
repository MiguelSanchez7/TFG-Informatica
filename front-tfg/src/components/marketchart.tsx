"use client";

import React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";

type HistoryPoint = {
  date: string;
  adj_close: number;
};

type ScenarioContext = {
  ticker?: string;
  anchor_date?: string;
  horizon_days?: number;
  history?: HistoryPoint[];
  // en escenario (contexto) suele venir: ai, features_at_t, etc.
};

type ScenarioReveal = {
  ticker?: string;
  anchor_date?: string;
  horizon_days?: number;
  future_path?: HistoryPoint[];
  y_real?: number;
  // en reveal vienen scores, acciones, etc.
};

type Props = {
  scenario: ScenarioContext | ScenarioReveal | null;
};

type ChartRow = {
  date: string;
  context_price: number | null;
  future_price: number | null;
};

function toNum(x: any): number | null {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

function buildChartData(
  history: HistoryPoint[] | undefined,
  future: HistoryPoint[] | undefined
): ChartRow[] {
  const map = new Map<string, ChartRow>();

  for (const p of history ?? []) {
    const key = p.date;
    map.set(key, {
      date: key,
      context_price: toNum(p.adj_close),
      future_price: null,
    });
  }

  for (const p of future ?? []) {
    const key = p.date;
    const prev = map.get(key);
    map.set(key, {
      date: key,
      context_price: prev?.context_price ?? null,
      future_price: toNum(p.adj_close),
    });
  }

  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function formatDate(d: string) {
  // d ya viene "YYYY-MM-DD", lo dejamos simple
  return d;
}

function formatPrice(p: number) {
  // como no sabemos si son $ o €, lo dejamos neutro
  return p.toFixed(2);
}

function formatPct(x: number) {
  const v = x * 100;
  return `${v.toFixed(2)}%`;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: any[];
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  // Puede venir el punto del contexto o del futuro (o ambos en el anchor)
  const ctx = payload.find((p) => p.dataKey === "context_price" && p.value != null);
  const fut = payload.find((p) => p.dataKey === "future_price" && p.value != null);

  const isFuture = Boolean(fut) && !ctx;
  const price = (ctx?.value ?? fut?.value) as number | undefined;

  if (price == null) return null;

  return (
    <div
      style={{
        background: "rgba(15, 23, 42, 0.92)",
        border: "1px solid rgba(148, 163, 184, 0.35)",
        borderRadius: 10,
        padding: "10px 12px",
        color: "#e5e7eb",
        minWidth: 180,
      }}
    >
      <div style={{ fontSize: 12, opacity: 0.9 }}>
        {label ? formatDate(label) : ""}
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>
        Precio: {formatPrice(price)}
      </div>
      <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>
        Tramo: {isFuture ? "Futuro" : "Contexto"}
      </div>
    </div>
  );
}

export default function MarketChart({ scenario }: Props) {
  if (!scenario) return null;

  const history = (scenario as any).history as HistoryPoint[] | undefined;
  const future = (scenario as any).future_path as HistoryPoint[] | undefined;

  const anchor = (scenario as any).anchor_date as string | undefined;
  const yReal = (scenario as any).y_real as number | undefined;

  const data = buildChartData(history, future);

  const hasFuture = Array.isArray(future) && future.length > 0;

  // Color del futuro según resultado real
  const futureStroke = !hasFuture
    ? "#94a3b8"
    : (yReal ?? 0) >= 0
    ? "#22c55e"
    : "#ef4444";

  return (
    <div className="mt-4">

      <div className="mt-3 border rounded-lg p-3">
        <div style={{ width: "100%", height: 380 }}>
          <ResponsiveContainer>
            <LineChart data={data} margin={{ top: 10, right: 16, bottom: 10, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={40} />
              <Tooltip content={<CustomTooltip />} />

              {anchor && (
                <ReferenceLine
                  x={anchor}
                  stroke="#e5e7eb"
                  strokeOpacity={0.45}
                  strokeWidth={2}
                />
              )}

              {/* CONTEXTO (AZUL) */}
              <Line
                type="monotone"
                dataKey="context_price"
                connectNulls={false}
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />

              {/* FUTURO (VERDE/ROJO) */}
              <Line
                type="monotone"
                dataKey="future_price"
                connectNulls={false}
                stroke={futureStroke}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
