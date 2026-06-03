"use client";

import type { DcfApiResponse } from "@/types";

interface Props {
  dcf: DcfApiResponse;
  symbol: string;
  /** Real-time market price from TradingView-aligned quote — overrides DCF's stored price */
  livePrice?: number;
}

function fmt(n: number, decimals = 2) { return `$${n.toFixed(decimals)}`; }
function pct(n: number) { return `${n >= 0 ? "+" : ""}${(n * 100).toFixed(1)}%`; }

export default function DCFPanel({ dcf, symbol, livePrice }: Props) {
  // Use live price when available so DCF comparison is always vs real market price
  const marketPrice = livePrice && livePrice > 0 ? livePrice : (!dcf.notApplicable && dcf.currentPrice > 0 ? dcf.currentPrice : 0);
  const upside = !dcf.notApplicable && marketPrice > 0
    ? (dcf.intrinsicValue - marketPrice) / marketPrice
    : (!dcf.notApplicable ? dcf.upside : 0);

  // If no real API key and data is mock, show "connect API" message for DCF numbers
  const noRealFundamentals = !dcf.notApplicable && dcf.isMock;

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
            ไม่มีข้อมูลจริง
          </span>
        )}
      </div>

      {/* N/A case — FCF ≤ 0 or no data */}
      {dcf.notApplicable ? (
        <div className="space-y-3">
          <div className="bg-slate-700/30 rounded-lg p-3 border border-slate-700/50">
            <p className="text-slate-300 text-sm font-medium">N/A — DCF ใช้ไม่ได้กับหุ้นนี้</p>
            <p className="text-slate-500 text-xs mt-1">{dcf.reason}</p>
          </div>
          <div className="bg-slate-700/20 rounded-lg p-3 text-xs text-slate-400 space-y-1">
            <p className="font-medium text-slate-300">ทางเลือกในการประเมินมูลค่า:</p>
            <p>• <span className="text-slate-300">Analyst Price Target</span> — ดูจาก TradingView (Technical Analysis panel ด้านบน)</p>
            <p>• <span className="text-slate-300">EV/Sales</span> — เหมาะกับหุ้น high-growth ที่ยังขาดทุน เทียบ peer ในกลุ่มเดียวกัน</p>
            <p>• <span className="text-slate-300">Price/Sales (P/S)</span> — ใช้บ่อยสำหรับ pre-profit tech/quantum/biotech</p>
          </div>
        </div>
      ) : noRealFundamentals ? (
        /* Has FMP key but mock fallback, or no key at all */
        <div className="text-center py-6 space-y-1.5">
          <p className="text-slate-400 text-sm">ต่อ FMP_API_KEY เพื่อคำนวณ DCF</p>
          <p className="text-slate-600 text-xs">Fair value ต้องคำนวณจากงบการเงินจริง (FCF TTM) ไม่แสดงเลขสาธิต</p>
        </div>
      ) : (
        <>
          {/* Main numbers — uses live price for the market-price cell */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-slate-700/40 rounded-lg p-2.5 text-center">
              <p className="text-[10px] text-slate-500 mb-1">Intrinsic Value</p>
              <p className="text-base font-bold text-white">{fmt(dcf.intrinsicValue)}</p>
            </div>
            <div className="bg-slate-700/40 rounded-lg p-2.5 text-center">
              <p className="text-[10px] text-slate-500 mb-1">ราคาตลาด</p>
              <p className="text-base font-bold text-slate-200">
                {marketPrice > 0 ? fmt(marketPrice) : "—"}
              </p>
              {livePrice && livePrice > 0 && (
                <p className="text-[9px] text-slate-600 mt-0.5">real-time</p>
              )}
            </div>
            <div className={`rounded-lg p-2.5 text-center ${
              upside > 0.1  ? "bg-green-900/30 border border-green-700/30" :
              upside < -0.1 ? "bg-red-900/30 border border-red-700/30" :
                              "bg-slate-700/40"
            }`}>
              <p className="text-[10px] text-slate-500 mb-1">Upside</p>
              <p className={`text-base font-bold ${
                upside > 0.1  ? "text-green-400" :
                upside < -0.1 ? "text-red-400" :
                                "text-slate-300"
              }`}>
                {marketPrice > 0 ? pct(upside) : "—"}
              </p>
            </div>
          </div>

          {/* Upside bar */}
          {marketPrice > 0 && (
            <div className="mb-4">
              <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                <span>ราคาตลาด</span>
                <span>Intrinsic</span>
              </div>
              <div className="relative h-2 bg-slate-700 rounded-full overflow-hidden">
                {upside > 0 ? (
                  <div className="absolute left-0 top-0 h-full bg-green-500 rounded-full"
                    style={{ width: `${Math.min(100, 100 / (1 + upside))}%` }} />
                ) : (
                  <div className="absolute left-0 top-0 h-full bg-red-500 rounded-full"
                    style={{ width: `${Math.min(100, 100 * (1 + upside))}%` }} />
                )}
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>{fmt(Math.min(marketPrice, dcf.intrinsicValue))}</span>
                <span>{fmt(Math.max(marketPrice, dcf.intrinsicValue))}</span>
              </div>
            </div>
          )}

          {/* Assumptions — labeled clearly as model inputs */}
          <div className="border-t border-slate-700 pt-3">
            <p className="text-[10px] text-slate-500 mb-2">
              สมมติฐานแบบจำลอง
              <span className="ml-1 text-slate-600">(เปลี่ยนสมมติฐาน → ผลเปลี่ยนมาก)</span>
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-[11px]">
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">FCF/share (TTM)</span>
                <span className="text-slate-300 font-mono">{fmt(dcf.fcfPerShare, 4)}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Growth (ปี 1–5)</span>
                <span className="text-slate-300 font-mono">10%</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Terminal g</span>
                <span className="text-slate-300 font-mono">3%</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">WACC (r)</span>
                <span className="text-slate-300 font-mono">10%</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Disclaimer */}
      <p className="text-[10px] text-slate-600 mt-3 border-t border-slate-700/50 pt-2">
        เป็นแบบจำลองเท่านั้น — สมมติฐานเปลี่ยนผลเปลี่ยนมาก ไม่ใช่คำแนะนำการลงทุน
      </p>
    </div>
  );
}
