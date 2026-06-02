"use client";

import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { Timeframe } from "@/types";

interface EnrichedCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  ma20: number | null;
  ma50: number | null;
  rsi: number | null;
}

interface Props {
  candles: EnrichedCandle[];
  timeframe: Timeframe;
  support: number | null;
  resistance: number | null;
  symbol: string;
}

function formatTime(ts: number, tf: Timeframe, intraday: boolean): string {
  const d = new Date(ts * 1000);
  if (intraday) return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  if (tf === "1Y") return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function priceTickFormatter(v: number) {
  return v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v.toFixed(2)}`;
}

// Custom tooltip
const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: number }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-600 rounded-lg p-2 text-xs shadow-xl min-w-[120px]">
      <p className="text-slate-400 mb-1">{label ? new Date(label * 1000).toLocaleString("th-TH") : ""}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="flex justify-between gap-3">
          <span>{p.name}</span>
          <span className="font-mono">{typeof p.value === "number" ? `$${p.value.toFixed(2)}` : p.value}</span>
        </p>
      ))}
    </div>
  );
};

export default function PriceChart({ candles, timeframe, support, resistance, symbol }: Props) {
  if (!candles.length) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500">
        ไม่มีข้อมูลกราฟสำหรับช่วงเวลานี้
      </div>
    );
  }

  // Detect intraday (bars < 1 day apart) to pick the right time label format
  const intraday = candles.length > 1 && (candles[1].time - candles[0].time) < 86400;

  const prices = candles.map((c) => c.close);
  const minPrice = Math.min(...prices) * 0.99;
  const maxPrice = Math.max(...prices) * 1.01;
  const maxVolume = Math.max(...candles.map((c) => c.volume));

  const rsiValues = candles.map((c) => c.rsi).filter((v): v is number => v !== null);
  const latestRsi = rsiValues.length > 0 ? rsiValues[rsiValues.length - 1] : null;
  const hasRsiData = rsiValues.length >= 3;

  return (
    <div className="space-y-1">
      {/* Price + MA chart */}
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={candles} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis
            dataKey="time"
            tickFormatter={(v) => formatTime(v, timeframe, intraday)}
            stroke="#475569"
            tick={{ fontSize: 10, fill: "#64748b" }}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[minPrice, maxPrice]}
            tickFormatter={priceTickFormatter}
            stroke="#475569"
            tick={{ fontSize: 10, fill: "#64748b" }}
            width={60}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11 }} />

          {/* Support / Resistance reference lines */}
          {support && (
            <ReferenceLine
              y={support}
              stroke="#22c55e"
              strokeDasharray="5 3"
              label={{ value: `แนวรับ $${support.toFixed(2)}`, fill: "#22c55e", fontSize: 10 }}
            />
          )}
          {resistance && (
            <ReferenceLine
              y={resistance}
              stroke="#ef4444"
              strokeDasharray="5 3"
              label={{ value: `แนวต้าน $${resistance.toFixed(2)}`, fill: "#ef4444", fontSize: 10 }}
            />
          )}

          {/* Price line */}
          <Line
            type="monotone"
            dataKey="close"
            name="ราคา"
            stroke="#38bdf8"
            dot={false}
            strokeWidth={2}
          />

          {/* MA20 */}
          <Line
            type="monotone"
            dataKey="ma20"
            name="MA20"
            stroke="#f59e0b"
            dot={false}
            strokeWidth={1.5}
            strokeDasharray="0"
            connectNulls
          />

          {/* MA50 */}
          <Line
            type="monotone"
            dataKey="ma50"
            name="MA50"
            stroke="#a855f7"
            dot={false}
            strokeWidth={1.5}
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Volume chart */}
      <ResponsiveContainer width="100%" height={60}>
        <ComposedChart data={candles} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
          <XAxis dataKey="time" hide />
          <YAxis hide domain={[0, maxVolume * 1.2]} />
          <Bar
            dataKey="volume"
            name="Volume"
            fill="#334155"
            radius={[1, 1, 0, 0]}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* RSI sub-panel */}
      <div className="mt-2">
        <div className="flex items-center justify-between px-1 mb-0.5">
          <p className="text-xs text-slate-500">RSI (14)</p>
          {latestRsi !== null && (
            <span className={`text-xs font-mono font-semibold ${
              latestRsi > 70 ? "text-red-400" : latestRsi < 30 ? "text-green-400" : "text-slate-300"
            }`}>
              {latestRsi.toFixed(1)}
            </span>
          )}
        </div>
        {hasRsiData ? (
          <ResponsiveContainer width="100%" height={100}>
            <ComposedChart data={candles} margin={{ top: 2, right: 10, left: 0, bottom: 2 }}>
              <XAxis dataKey="time" hide />
              <YAxis domain={[0, 100]} hide width={0} />

              {/* Overbought / oversold shading */}
              <ReferenceArea y1={70} y2={100} fill="#ef4444" fillOpacity={0.07} />
              <ReferenceArea y1={0} y2={30} fill="#22c55e" fillOpacity={0.07} />

              {/* Level lines */}
              <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="4 3" strokeOpacity={0.65} strokeWidth={1} />
              <ReferenceLine y={50} stroke="#64748b" strokeDasharray="2 5" strokeOpacity={0.4} strokeWidth={1} />
              <ReferenceLine y={30} stroke="#22c55e" strokeDasharray="4 3" strokeOpacity={0.65} strokeWidth={1} />

              {/* RSI line */}
              <Line
                type="monotone"
                dataKey="rsi"
                stroke="#a78bfa"
                dot={false}
                strokeWidth={1.5}
                connectNulls
                isAnimationActive={false}
              />

              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const val = payload[0]?.value;
                  if (val == null) return null;
                  return (
                    <div className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-slate-200">
                      RSI: <span className="font-mono font-semibold">{(val as number).toFixed(1)}</span>
                    </div>
                  );
                }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-16 text-slate-600 text-xs border border-slate-700/50 rounded-lg">
            ข้อมูลไม่เพียงพอสำหรับ RSI(14) — เลือก 1M หรือ 1Y
          </div>
        )}
      </div>
    </div>
  );
}
