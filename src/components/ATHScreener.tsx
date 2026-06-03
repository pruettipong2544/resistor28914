"use client";

import { useState, useCallback } from "react";
import type { ScreenerResult } from "@/types";

function fmtCap(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6)  return `$${(n / 1e6).toFixed(0)}M`;
  return `$${n.toLocaleString()}`;
}
function fmtVol(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return `${n}`;
}

interface Props {
  onSelectSymbol: (symbol: string) => void;
}

export default function ATHScreener({ onSelectSymbol }: Props) {
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<ScreenerResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMock, setHasMock] = useState(false);

  const load = useCallback(async () => {
    if (results) return; // already loaded
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/screener");
      if (!res.ok) throw new Error("ไม่สามารถดึงข้อมูลได้");
      const data: ScreenerResult[] = await res.json();
      setResults(data);
      setHasMock(data.some(r => r.isMock));
    } catch (e) {
      setError(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }, [results]);

  const toggle = () => {
    setOpen(o => {
      if (!o) load();
      return !o;
    });
  };

  return (
    <div className="border border-slate-700 rounded-2xl overflow-hidden">
      {/* Header / toggle */}
      <button
        onClick={toggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-800 hover:bg-slate-750 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white">ATH Pullback Screener</span>
          <span className="text-[10px] text-slate-500 border border-slate-600 px-1.5 py-0.5 rounded">
            cap ≥ $500M · price ≥ $3 · vol ≥ 300K
          </span>
        </div>
        <span className={`text-slate-400 text-xs transition-transform ${open ? "rotate-180" : ""}`}>▼</span>
      </button>

      {/* Body */}
      {open && (
        <div className="bg-slate-800/50 px-4 py-3">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {error && !loading && (
            <p className="text-red-400 text-sm text-center py-4">⚠ {error}</p>
          )}
          {!loading && !error && results && (
            hasMock ? (
              /* No real API key — never show fake screener numbers */
              <div className="text-center py-8 space-y-1">
                <p className="text-slate-400 text-sm">ต้องการข้อมูลจริงจาก FMP</p>
                <p className="text-slate-600 text-xs">เพิ่ม <code className="text-slate-400">FMP_API_KEY</code> ใน <code className="text-slate-400">.env.local</code> เพื่อดู ATH pullback จริง</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[520px]">
                    <thead>
                      <tr className="text-[11px] text-slate-500 border-b border-slate-700">
                        <th className="text-left pb-2 font-medium">Symbol</th>
                        <th className="text-left pb-2 font-medium hidden sm:table-cell">Company</th>
                        <th className="text-right pb-2 font-medium">ราคา</th>
                        <th className="text-right pb-2 font-medium">52W High</th>
                        <th className="text-right pb-2 font-medium">Pullback</th>
                        <th className="text-right pb-2 font-medium hidden md:table-cell">Mkt Cap</th>
                        <th className="text-right pb-2 font-medium hidden lg:table-cell">Avg Vol</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((r) => (
                        <tr
                          key={r.symbol}
                          onClick={() => onSelectSymbol(r.symbol)}
                          className="border-b border-slate-700/50 hover:bg-slate-700/30 cursor-pointer transition-colors"
                        >
                          <td className="py-2 pr-3">
                            <span className="font-bold text-white">{r.symbol}</span>
                          </td>
                          <td className="py-2 pr-3 text-slate-400 text-xs hidden sm:table-cell max-w-[160px] truncate">
                            {r.name}
                          </td>
                          <td className="py-2 text-right text-slate-200 font-mono text-xs">
                            ${r.price.toFixed(2)}
                          </td>
                          <td className="py-2 text-right text-slate-400 font-mono text-xs">
                            ${r.yearHigh.toFixed(2)}
                          </td>
                          <td className="py-2 text-right">
                            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                              r.pullbackPct >= 0.3
                                ? "bg-red-900/50 text-red-300"
                                : r.pullbackPct >= 0.15
                                ? "bg-amber-900/50 text-amber-300"
                                : "bg-yellow-900/30 text-yellow-400"
                            }`}>
                              -{(r.pullbackPct * 100).toFixed(1)}%
                            </span>
                          </td>
                          <td className="py-2 text-right text-slate-400 text-xs hidden md:table-cell">
                            {fmtCap(r.marketCap)}
                          </td>
                          <td className="py-2 text-right text-slate-400 text-xs hidden lg:table-cell">
                            {fmtVol(r.avgVolume)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-[10px] text-slate-600 mt-3">
                  แสดง {results.length} หุ้นที่ pullback จาก 52-week high มากที่สุด — คลิกแถวเพื่อดูกราฟ · ข้อมูลอาจดีเลย์ ไม่ใช่คำแนะนำการลงทุน
                </p>
              </>
            )
          )}
        </div>
      )}
    </div>
  );
}
