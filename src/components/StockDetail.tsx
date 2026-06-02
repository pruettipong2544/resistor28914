"use client";

import { useState, useEffect, useCallback } from "react";
import type { Timeframe, CandleApiResponse } from "@/types";
import { getTvSymbol, getCompanyName } from "@/config/stocks";
import TradingViewChart from "./TradingViewChart";
import TradingViewAnalysis from "./TradingViewAnalysis";
import PivotPointsPanel from "./PivotPointsPanel";

interface Props {
  symbol: string;
  onClose: () => void;
}

const TIMEFRAMES: Timeframe[] = ["1D", "1W", "1M", "1Y"];

export default function StockDetail({ symbol, onClose }: Props) {
  const [timeframe, setTimeframe] = useState<Timeframe>("1M");
  const [candleData, setCandleData] = useState<CandleApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tvSymbol = getTvSymbol(symbol);
  const companyName = getCompanyName(symbol);

  const loadPivots = useCallback(async (tf: Timeframe) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/candles?symbol=${symbol}&timeframe=${tf}`);
      if (!res.ok) throw new Error("ไม่สามารถดึงข้อมูลได้");
      const json: CandleApiResponse = await res.json();
      setCandleData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  useEffect(() => { loadPivots(timeframe); }, [timeframe, loadPivots]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-5xl mx-auto my-4 mx-2 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl">

        {/* Header */}
        <div className="sticky top-0 bg-slate-900/95 backdrop-blur rounded-t-2xl border-b border-slate-700 p-4 flex items-center justify-between z-10">
          <div>
            <div className="flex items-baseline gap-3">
              <h2 className="text-2xl font-bold text-white">{symbol}</h2>
              <span className="text-slate-400 text-sm">{companyName}</span>
              <span className="text-xs text-slate-600 font-mono">{tvSymbol}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-2xl leading-none p-2"
            aria-label="ปิด"
          >
            ✕
          </button>
        </div>

        <div className="p-4 space-y-4 pb-6">
          {/* Timeframe selector */}
          <div className="flex gap-2">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  timeframe === tf
                    ? "bg-sky-600 text-white"
                    : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* TradingView Advanced Chart — re-mounts on symbol or timeframe change */}
          <div className="rounded-xl overflow-hidden border border-slate-700">
            <TradingViewChart
              key={`${symbol}-${timeframe}`}
              tvSymbol={tvSymbol}
              timeframe={timeframe}
              height={450}
            />
          </div>

          {/* Two-column: Pivot Points (left) + Technical Analysis (right) */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-4 items-start">
            {/* Pivot Points panel — our own calculation */}
            <div>
              {loading && (
                <div className="bg-slate-800 rounded-xl p-3 h-64 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {error && !loading && (
                <div className="bg-slate-800 rounded-xl p-3 text-red-400 text-xs text-center py-4">
                  ⚠ {error}
                </div>
              )}
              {!loading && !error && candleData && (
                <PivotPointsPanel
                  pivotPoints={candleData.pivotPoints}
                  currentPrice={candleData.currentPrice}
                  isMockData={candleData.isMockData}
                />
              )}
            </div>

            {/* TradingView Technical Analysis — re-mounts on change */}
            <div className="rounded-xl overflow-hidden border border-slate-700">
              <TradingViewAnalysis
                key={`ta-${symbol}-${timeframe}`}
                tvSymbol={tvSymbol}
                timeframe={timeframe}
              />
            </div>
          </div>

          {/* Disclaimer */}
          <div className="text-[11px] text-slate-600 leading-relaxed border-t border-slate-800 pt-3">
            กราฟและ Technical Analysis มาจาก TradingView — แนวรับ/แนวต้านเป็นสูตรของเราเอง
            ข้อมูลอาจดีเลย์ ไม่ใช่คำแนะนำการลงทุน
          </div>
        </div>
      </div>
    </div>
  );
}
