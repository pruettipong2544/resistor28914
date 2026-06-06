"use client";

import type { PivotPoints } from "@/types";

interface Props {
  pivotPoints: PivotPoints | null;
  currentPrice: number;
  isMockData: boolean;
}

function pct(price: number, ref: number): string {
  const diff = ((price - ref) / ref) * 100;
  return (diff >= 0 ? "+" : "") + diff.toFixed(2) + "%";
}

function Row({
  label, value, current, isResistance,
}: { label: string; value: number; current: number; isResistance: boolean }) {
  const above = value > current;
  const color = above ? "text-red-400" : "text-green-400";
  const isCurrent = Math.abs(value - current) / current < 0.001;
  return (
    <div className={`flex justify-between items-center py-1 px-2 rounded text-xs ${isCurrent ? "bg-slate-600/40" : ""}`}>
      <span className={`font-medium w-8 ${above ? "text-red-300" : "text-green-300"}`}>{label}</span>
      <span className="font-mono text-slate-200">${value.toFixed(2)}</span>
      <span className={`font-mono w-16 text-right ${color}`}>{pct(value, current)}</span>
    </div>
  );
}

export default function PivotPointsPanel({ pivotPoints: pp, currentPrice, isMockData }: Props) {
  return (
    <div className="bg-slate-800 rounded-xl p-3 h-full">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-slate-300">แนวรับ / แนวต้าน</h3>
        <span className="text-[10px] text-slate-500">Pivot Points (Standard)</span>
      </div>

      {!pp ? (
        <p className="text-slate-500 text-xs text-center py-4">ข้อมูลไม่เพียงพอ</p>
      ) : (
        <div className="space-y-0.5">
          <Row label="R3" value={pp.R3} current={currentPrice} isResistance />
          <Row label="R2" value={pp.R2} current={currentPrice} isResistance />
          <Row label="R1" value={pp.R1} current={currentPrice} isResistance />

          {/* Pivot line */}
          <div className="flex justify-between items-center py-1 px-2 bg-sky-900/30 rounded text-xs border border-sky-700/30">
            <span className="font-medium text-sky-300 w-8">PP</span>
            <span className="font-mono text-sky-200">${pp.PP.toFixed(2)}</span>
            <span className={`font-mono w-16 text-right text-sky-400`}>{pct(pp.PP, currentPrice)}</span>
          </div>

          <Row label="S1" value={pp.S1} current={currentPrice} isResistance={false} />
          <Row label="S2" value={pp.S2} current={currentPrice} isResistance={false} />
          <Row label="S3" value={pp.S3} current={currentPrice} isResistance={false} />
        </div>
      )}

      <div className="mt-3 pt-2 border-t border-slate-700 space-y-0.5">
        <p className="text-[10px] text-slate-500 leading-relaxed">
          ราคาปัจจุบัน: <span className="text-slate-300 font-mono">${currentPrice.toFixed(2)}</span>
          {isMockData && <span className="ml-2 text-amber-500">(ข้อมูลตัวอย่าง)</span>}
        </p>
        {pp?.pivotCandleDate && (
          <p className="text-[10px] text-slate-600">
            อิงแท่งวัน <span className="font-mono text-slate-500">{pp.pivotCandleDate}</span>
          </p>
        )}
        <p className="text-[10px] text-slate-600">
          สูตรเราเอง — ไม่ใช่ TradingView
        </p>
      </div>
    </div>
  );
}
