"use client";

import type { DcfApiResponse } from "@/types";

interface Props {
  dcf: DcfApiResponse;
  symbol: string;
}

function fmt(n: number, decimals = 2) { return `$${n.toFixed(decimals)}`; }
function pct(n: number) { return `${n >= 0 ? "+" : ""}${(n * 100).toFixed(1)}%`; }

export default function DCFPanel({ dcf, symbol }: Props) {
  return (
    <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-white">DCF Valuation</h3>
          <span className="text-[10px] text-slate-500 font-mono">{symbol}</span>
        </div>
        {dcf.isMock && (
          <span className="text-[10px] text-amber-500 border border-amber-700/40 bg-amber-900/20 px-1.5 py-0.5 rounded">
            สาธิต
          </span>
        )}
      </div>

      {/* N/A case */}
      {dcf.notApplicable ? (
        <div className="text-center py-4">
          <p className="text-slate-400 text-sm font-medium">N/A</p>
          <p className="text-slate-500 text-xs mt-1">{dcf.reason}</p>
        </div>
      ) : (
        <>
          {/* Main numbers */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-slate-700/40 rounded-lg p-2.5 text-center">
              <p className="text-[10px] text-slate-500 mb-1">Intrinsic Value</p>
              <p className="text-base font-bold text-white">{fmt(dcf.intrinsicValue)}</p>
            </div>
            <div className="bg-slate-700/40 rounded-lg p-2.5 text-center">
              <p className="text-[10px] text-slate-500 mb-1">ราคาปัจจุบัน</p>
              <p className="text-base font-bold text-slate-200">
                {dcf.currentPrice > 0 ? fmt(dcf.currentPrice) : "—"}
              </p>
            </div>
            <div className={`rounded-lg p-2.5 text-center ${
              dcf.upside > 0.1  ? "bg-green-900/30 border border-green-700/30" :
              dcf.upside < -0.1 ? "bg-red-900/30 border border-red-700/30" :
                                  "bg-slate-700/40"
            }`}>
              <p className="text-[10px] text-slate-500 mb-1">Upside</p>
              <p className={`text-base font-bold ${
                dcf.upside > 0.1  ? "text-green-400" :
                dcf.upside < -0.1 ? "text-red-400" :
                                    "text-slate-300"
              }`}>
                {dcf.currentPrice > 0 ? pct(dcf.upside) : "—"}
              </p>
            </div>
          </div>

          {/* Upside bar */}
          {dcf.currentPrice > 0 && (
            <div className="mb-4">
              <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                <span>ราคาตลาด</span>
                <span>Intrinsic</span>
              </div>
              <div className="relative h-2 bg-slate-700 rounded-full overflow-hidden">
                {dcf.upside > 0 ? (
                  // Intrinsic > price: show how far price is from intrinsic
                  <div
                    className="absolute left-0 top-0 h-full bg-green-500 rounded-full"
                    style={{ width: `${Math.min(100, 100 / (1 + dcf.upside))}%` }}
                  />
                ) : (
                  // Price > intrinsic: bar beyond 100% would be overvalued; show intrinsic position
                  <div
                    className="absolute left-0 top-0 h-full bg-red-500 rounded-full"
                    style={{ width: `${Math.min(100, 100 * (1 + dcf.upside))}%` }}
                  />
                )}
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>{fmt(Math.min(dcf.currentPrice, dcf.intrinsicValue))}</span>
                <span>{fmt(Math.max(dcf.currentPrice, dcf.intrinsicValue))}</span>
              </div>
            </div>
          )}

          {/* Assumptions */}
          <div className="border-t border-slate-700 pt-3">
            <p className="text-[10px] text-slate-500 mb-2">สมมติฐาน (คงที่)</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-[11px]">
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">FCF/share</span>
                <span className="text-slate-300 font-mono">{fmt(dcf.fcfPerShare, 4)}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Growth (5yr)</span>
                <span className="text-slate-300 font-mono">10%</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Terminal g</span>
                <span className="text-slate-300 font-mono">3%</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Discount (r)</span>
                <span className="text-slate-300 font-mono">10%</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Disclaimer */}
      <p className="text-[10px] text-slate-600 mt-3 border-t border-slate-700/50 pt-2">
        DCF ใช้สมมติฐานคงที่ เป็นเพียงการประมาณค่า ไม่ใช่คำแนะนำการลงทุน
      </p>
    </div>
  );
}
