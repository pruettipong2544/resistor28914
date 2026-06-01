"use client";

import { useState } from "react";

interface Props {
  hidden: string[];
  onRestore: (symbol: string) => void;
  onRemove: (symbol: string) => void;
}

export default function HiddenList({ hidden, onRestore, onRemove }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (!hidden.length) return null;

  return (
    <div className="border border-slate-700 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full px-4 py-3 flex items-center justify-between text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors"
      >
        <span>รายการที่ซ่อนไว้ ({hidden.length} ตัว)</span>
        <span className="text-xs">{expanded ? "▲ ซ่อน" : "▼ แสดง"}</span>
      </button>

      {expanded && (
        <div className="border-t border-slate-700 p-3 flex flex-wrap gap-2">
          {hidden.map((symbol) => (
            <div key={symbol} className="flex items-center gap-1 bg-slate-800 border border-slate-600 rounded-lg px-2 py-1">
              <span className="text-sm font-mono text-slate-300">{symbol}</span>
              <button
                onClick={() => onRestore(symbol)}
                className="text-xs text-sky-400 hover:text-sky-300 ml-1"
                title="คืนกลับ watchlist"
              >
                ↩
              </button>
              <button
                onClick={() => onRemove(symbol)}
                className="text-xs text-slate-500 hover:text-red-400 ml-0.5"
                title="ลบถาวร"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
