"use client";

import { getCompanyName } from "@/config/stocks";

interface Props {
  symbol: string;
  onClick: () => void;
  onHide: () => void;
}

export default function StockCard({ symbol, onClick, onHide }: Props) {
  const name = getCompanyName(symbol);

  return (
    <div
      className="relative group bg-slate-800 border border-slate-700 rounded-xl p-4 cursor-pointer hover:bg-slate-750 hover:border-sky-700/50 transition-all duration-200 hover:shadow-lg hover:shadow-sky-900/20 hover:-translate-y-0.5"
      onClick={onClick}
    >
      {/* Hide button */}
      <button
        onClick={(e) => { e.stopPropagation(); onHide(); }}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-red-400 text-lg leading-none p-1"
        aria-label={`ซ่อน ${symbol}`}
        title="ซ่อนหุ้นนี้"
      >
        ×
      </button>

      <div className="min-w-0">
        <span className="text-base font-bold text-white block">{symbol}</span>
        <p className="text-xs text-slate-400 truncate mt-0.5">{name}</p>
      </div>

      <p className="text-[10px] text-slate-600 mt-3">คลิกเพื่อดูกราฟ →</p>
    </div>
  );
}
