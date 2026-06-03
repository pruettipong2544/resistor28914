"use client";

import { useState, useEffect, useCallback } from "react";
import type { Timeframe, CandleApiResponse } from "@/types";
import { getTvSymbol, getCompanyName } from "@/config/stocks";
import TradingViewChart, { type TvStudyId } from "./TradingViewChart";
import TradingViewAnalysis from "./TradingViewAnalysis";
import PivotPointsPanel from "./PivotPointsPanel";

interface Props {
  symbol: string;
  onClose: () => void;
}

const TIMEFRAMES: Timeframe[] = ["1D", "1W", "1M", "1Y"];

// ---------------------------------------------------------------
// Study toggle config
// Each entry maps a UI key to one or more TV study IDs/configs.
// TV study IDs verified as of 2025 — if a study doesn't appear
// in the chart, the ID may have changed; check TV widget docs.
// ---------------------------------------------------------------
interface StudyOption {
  key: string;
  label: string;
  ids: TvStudyId[];
}

const STUDY_OPTIONS: StudyOption[] = [
  {
    key: "rsi",
    label: "RSI",
    ids: ["RSI@tv-basicstudies"],
  },
  {
    key: "macd",
    label: "MACD",
    ids: ["MACD@tv-basicstudies"],
  },
  {
    key: "ema",
    label: "EMA 20/50",
    ids: [
      { id: "MAExp@tv-basicstudies", inputs: { length: 20 } },
      { id: "MAExp@tv-basicstudies", inputs: { length: 50 } },
    ],
  },
  {
    key: "pivot",
    label: "Pivot S/R",
    ids: ["PivotPointsStandard@tv-basicstudies"],
  },
  {
    key: "regression",
    label: "Reg. Channel",
    ids: ["LinearRegression@tv-basicstudies"],
  },
];

const DEFAULT_ENABLED = new Set(["rsi", "ema", "pivot"]);

export default function StockDetail({ symbol, onClose }: Props) {
  const [timeframe, setTimeframe] = useState<Timeframe>("1M");
  const [enabledStudies, setEnabledStudies] = useState<Set<string>>(DEFAULT_ENABLED);
  const [candleData, setCandleData] = useState<CandleApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tvSymbol = getTvSymbol(symbol);
  const companyName = getCompanyName(symbol);

  // All TV study IDs for currently enabled studies
  const activeStudies: TvStudyId[] = STUDY_OPTIONS
    .filter((s) => enabledStudies.has(s.key))
    .flatMap((s) => s.ids);

  // Key for chart re-mount includes studies so toggling forces a fresh widget
  const enabledArr = Array.from(enabledStudies);
  const chartKey = `${symbol}-${timeframe}-${enabledArr.sort().join(",")}`;

  const toggleStudy = (key: string) => {
    setEnabledStudies((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

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

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-6xl mx-auto my-4 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl">

        {/* Header */}
        <div className="sticky top-0 bg-slate-900/95 backdrop-blur rounded-t-2xl border-b border-slate-700 p-4 flex items-center justify-between z-10">
          <div className="flex items-baseline gap-3 min-w-0">
            <h2 className="text-2xl font-bold text-white">{symbol}</h2>
            <span className="text-slate-400 text-sm truncate">{companyName}</span>
            <span className="text-xs text-slate-600 font-mono hidden sm:block">{tvSymbol}</span>
          </div>
          <button
            onClick={onClose}
            className="ml-4 flex-shrink-0 text-slate-400 hover:text-white text-2xl leading-none p-2"
            aria-label="ปิด"
          >
            ✕
          </button>
        </div>

        <div className="p-4 space-y-4 pb-6">
          {/* Controls row: timeframe tabs + study toggles */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Timeframe */}
            <div className="flex gap-1.5">
              {TIMEFRAMES.map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    timeframe === tf
                      ? "bg-sky-600 text-white"
                      : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>

            {/* Divider */}
            <div className="w-px h-5 bg-slate-700 mx-1 hidden sm:block" />

            {/* Study toggles */}
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-xs text-slate-500 mr-1">Studies:</span>
              {STUDY_OPTIONS.map((s) => {
                const on = enabledStudies.has(s.key);
                return (
                  <button
                    key={s.key}
                    onClick={() => toggleStudy(s.key)}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors border ${
                      on
                        ? "bg-violet-700/40 border-violet-500/60 text-violet-200"
                        : "bg-slate-800 border-slate-600 text-slate-500 hover:border-slate-500"
                    }`}
                  >
                    {on ? "✓ " : ""}{s.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* TradingView Advanced Chart */}
          <div className="rounded-xl overflow-hidden border border-slate-700">
            <TradingViewChart
              key={chartKey}
              tvSymbol={tvSymbol}
              timeframe={timeframe}
              studies={activeStudies}
              height={560}
            />
          </div>

          {/* Pivot Points (left) + Technical Analysis (right) */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-4 items-start">
            <div>
              {loading && (
                <div className="bg-slate-800 rounded-xl p-3 h-64 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {error && !loading && (
                <div className="bg-slate-800 rounded-xl p-3 text-red-400 text-xs text-center py-4">⚠ {error}</div>
              )}
              {!loading && !error && candleData && (
                <PivotPointsPanel
                  pivotPoints={candleData.pivotPoints}
                  currentPrice={candleData.currentPrice}
                  isMockData={candleData.isMockData}
                />
              )}
            </div>

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
