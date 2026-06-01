"use client";

import { AreaChart, Area, ResponsiveContainer } from "recharts";
import type { Quote } from "@/types";

interface Props {
  quote: Quote;
  sparklineData?: number[];
  onClick: () => void;
  onHide: () => void;
}

export default function StockCard({ quote, sparklineData, onClick, onHide }: Props) {
  const isUp = quote.changePercent >= 0;
  const pctColor = isUp ? "text-green-400" : "text-red-400";
  const bgAccent = isUp ? "border-green-800/40" : "border-red-800/40";
  const sparkColor = isUp ? "#22c55e" : "#ef4444";

  const sparkData = (sparklineData ?? []).map((v) => ({ v }));

  return (
    <div
      className={`relative group bg-slate-800 border ${bgAccent} rounded-xl p-4 cursor-pointer hover:bg-slate-750 hover:border-sky-700/50 transition-all duration-200 hover:shadow-lg hover:shadow-sky-900/20 hover:-translate-y-0.5`}
      onClick={onClick}
    >
      {/* Delete button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onHide();
        }}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-red-400 text-lg leading-none p-1"
        aria-label={`ซ่อน ${quote.symbol}`}
        title="ซ่อนหุ้นนี้"
      >
        ×
      </button>

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-base font-bold text-white">{quote.symbol}</span>
          </div>
          <p className="text-xs text-slate-400 truncate max-w-[140px]">{quote.name}</p>
        </div>

        {/* Sparkline */}
        {sparkData.length > 2 && (
          <div className="w-16 h-10 flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparkData} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke={sparkColor}
                  fill={sparkColor}
                  fillOpacity={0.15}
                  strokeWidth={1.5}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-xl font-mono font-bold text-white">
          ${quote.price.toFixed(2)}
        </span>
      </div>

      <div className={`flex items-center gap-1.5 mt-1 text-sm font-semibold ${pctColor}`}>
        <span>{isUp ? "▲" : "▼"}</span>
        <span>
          {Math.abs(quote.changePercent).toFixed(2)}%
        </span>
        <span className="text-xs font-normal opacity-80">
          ({isUp ? "+" : ""}{quote.change.toFixed(2)})
        </span>
      </div>
    </div>
  );
}
