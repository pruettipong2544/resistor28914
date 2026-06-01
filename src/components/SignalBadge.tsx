"use client";

import type { TechnicalSignal } from "@/types";

interface Props {
  label: string;
  signal: TechnicalSignal;
}

const CONFIG = {
  bullish: { bg: "bg-green-900/50", border: "border-green-500", text: "text-green-400", icon: "▲", th: "เอนไปทางซื้อ" },
  neutral: { bg: "bg-slate-800/50", border: "border-slate-500", text: "text-slate-300", icon: "◆", th: "ถือ-เป็นกลาง" },
  bearish: { bg: "bg-red-900/50", border: "border-red-500", text: "text-red-400", icon: "▼", th: "เอนไปทางขาย" },
};

export default function SignalBadge({ label, signal }: Props) {
  const cfg = CONFIG[signal.direction];
  return (
    <div className={`rounded-lg border p-3 ${cfg.bg} ${cfg.border}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className={`text-xs font-medium ${cfg.text}`}>{label}</span>
        <span className={`text-sm font-bold ${cfg.text}`}>
          {cfg.icon} {cfg.th}
        </span>
      </div>
      <ul className="space-y-0.5">
        {signal.reasons.map((r, i) => (
          <li key={i} className="text-xs text-slate-400">
            • {r}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-slate-500 italic">
        * สัญญาณเชิงเทคนิค ไม่ใช่คำแนะนำการลงทุน
      </p>
    </div>
  );
}
