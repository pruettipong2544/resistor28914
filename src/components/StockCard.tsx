"use client";
import { getCompanyName, getThemes } from "@/config/stocks";
import type { QuoteData } from "@/types";

interface Props {
  symbol: string;
  quote?: QuoteData;
  onClick: () => void;
  onHide: () => void;
}

const THEME_COLORS: Record<string, string> = {
  AI:           "bg-violet-900/50 text-violet-300 border-violet-700/40",
  Quantum:      "bg-cyan-900/50 text-cyan-300 border-cyan-700/40",
  Nuclear:      "bg-yellow-900/50 text-yellow-300 border-yellow-700/40",
  Defense:      "bg-red-900/50 text-red-300 border-red-700/40",
  Space:        "bg-indigo-900/50 text-indigo-300 border-indigo-700/40",
  EV:           "bg-green-900/50 text-green-300 border-green-700/40",
  Fintech:      "bg-emerald-900/50 text-emerald-300 border-emerald-700/40",
  Energy:       "bg-orange-900/50 text-orange-300 border-orange-700/40",
  Biotech:      "bg-pink-900/50 text-pink-300 border-pink-700/40",
  Semiconductor:"bg-blue-900/50 text-blue-300 border-blue-700/40",
  Crypto:       "bg-amber-900/50 text-amber-300 border-amber-700/40",
  Tech:         "bg-sky-900/50 text-sky-300 border-sky-700/40",
};
const DEFAULT_THEME_COLOR = "bg-slate-700/50 text-slate-400 border-slate-600/40";

export default function StockCard({ symbol, quote, onClick, onHide }: Props) {
  const name = getCompanyName(symbol);
  const themes = getThemes(symbol);

  const pct = quote?.changePct;
  const isPos = pct !== undefined && pct > 0;
  const isNeg = pct !== undefined && pct < 0;

  return (
    <div
      className="relative group bg-slate-800 border border-slate-700 rounded-xl p-3 cursor-pointer hover:border-sky-700/50 transition-all duration-200 hover:shadow-lg hover:shadow-sky-900/20 hover:-translate-y-0.5 flex flex-col gap-2"
      onClick={onClick}
    >
      {/* Hide button */}
      <button
        onClick={(e) => { e.stopPropagation(); onHide(); }}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-red-400 text-lg leading-none p-0.5"
        aria-label={`ซ่อน ${symbol}`}
      >×</button>

      {/* Symbol + name */}
      <div className="min-w-0 pr-4">
        <span className="text-sm font-bold text-white block">{symbol}</span>
        <p className="text-[11px] text-slate-400 truncate">{name}</p>
      </div>

      {/* Price + change */}
      {quote ? (
        <div className="flex items-end justify-between gap-1">
          <span className="text-sm font-semibold text-white">
            {quote.isMock ? "~" : ""}${quote.price.toFixed(2)}
          </span>
          <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
            isPos ? "bg-green-900/60 text-green-400" :
            isNeg ? "bg-red-900/60 text-red-400" :
                    "bg-slate-700 text-slate-400"
          }`}>
            {isPos ? "+" : ""}{pct!.toFixed(2)}%
          </span>
        </div>
      ) : (
        <div className="h-5 bg-slate-700/50 rounded animate-pulse w-3/4" />
      )}

      {/* Theme chips */}
      {themes.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {themes.map((t) => (
            <span key={t} className={`text-[10px] px-1.5 py-0.5 rounded border ${THEME_COLORS[t] ?? DEFAULT_THEME_COLOR}`}>
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
