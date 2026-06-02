"use client";

import { useState, useEffect, useCallback } from "react";
import type { Quote, Timeframe, StockDetailData } from "@/types";
import PriceChart from "./PriceChart";
import SentimentGauge from "./SentimentGauge";
import SignalBadge from "./SignalBadge";

interface EnrichedCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  ma20: number | null;
  ma50: number | null;
  rsi: number | null;
}

interface DetailResponse extends StockDetailData {
  enrichedCandles: EnrichedCandle[];
}

interface Props {
  quote: Quote;
  onClose: () => void;
}

const TIMEFRAMES: Timeframe[] = ["1D", "1W", "1M", "1Y"];
const TF_LABELS: Record<Timeframe, string> = { "1D": "5 วันล่าสุด", "1W": "15 วันล่าสุด", "1M": "1 เดือน", "1Y": "1 ปี" };

export default function StockDetail({ quote, onClose }: Props) {
  const [timeframe, setTimeframe] = useState<Timeframe>("1M");
  const [data, setData] = useState<DetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (tf: Timeframe) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/candles?symbol=${quote.symbol}&timeframe=${tf}`);
      if (!res.ok) throw new Error("ไม่สามารถดึงข้อมูลได้");
      const json: DetailResponse = await res.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }, [quote.symbol]);

  useEffect(() => {
    loadData(timeframe);
  }, [timeframe, loadData]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const pctColor = (quote.changePercent ?? 0) >= 0 ? "text-green-400" : "text-red-400";
  const ind = data?.indicators;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl mx-auto my-4 mx-2 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-slate-900/95 backdrop-blur rounded-t-2xl border-b border-slate-700 p-4 flex items-start justify-between z-10">
          <div>
            <div className="flex items-baseline gap-3">
              <h2 className="text-2xl font-bold text-white">{quote.symbol}</h2>
              <span className="text-slate-400 text-sm">{quote.name}</span>
            </div>
            <div className="flex items-baseline gap-3 mt-1">
              <span className="text-3xl font-mono font-bold text-white">
                ${quote.price.toFixed(2)}
              </span>
              <span className={`text-lg font-semibold ${pctColor}`}>
                {quote.changePercent >= 0 ? "+" : ""}{quote.changePercent.toFixed(2)}%
              </span>
              <span className={`text-sm ${pctColor}`}>
                ({quote.change >= 0 ? "+" : ""}{quote.change.toFixed(2)})
              </span>
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

        <div className="p-4 space-y-5 pb-6">
          {/* Mock data banner */}
          {data?.isMockData && (
            <div className="bg-amber-900/30 border border-amber-600/50 rounded-lg px-3 py-2 text-xs text-amber-400">
              ⚠️ ข้อมูลตัวอย่าง — API ไม่พร้อมใช้งานในสภาพแวดล้อมนี้ รันบนเครื่องตัวเองเพื่อดูข้อมูลจริง
            </div>
          )}

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
            <span className="ml-auto text-xs text-slate-500 self-center">
              {TF_LABELS[timeframe]}
            </span>
          </div>

          {/* Chart area */}
          <div className="bg-slate-800/50 rounded-xl p-3">
            {loading && (
              <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {error && !loading && (
              <div className="flex items-center justify-center h-64 text-red-400 text-sm">
                ⚠ {error}
              </div>
            )}
            {!loading && !error && data && (
              <PriceChart
                candles={data.enrichedCandles}
                timeframe={timeframe}
                support={data.indicators.support}
                resistance={data.indicators.resistance}
                symbol={quote.symbol}
              />
            )}
          </div>

          {/* Indicators row */}
          {ind && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "RSI (14)", val: ind.rsi?.toFixed(1) ?? "—", warn: ind.rsi !== null && (ind.rsi > 70 || ind.rsi < 30) },
                { label: "MA20", val: ind.ma20 ? `$${ind.ma20.toFixed(2)}` : "—", warn: false },
                { label: "MA50", val: ind.ma50 ? `$${ind.ma50.toFixed(2)}` : "—", warn: false },
                { label: "MA200", val: ind.ma200 ? `$${ind.ma200.toFixed(2)}` : "N/A", warn: false },
              ].map(({ label, val, warn }) => (
                <div key={label} className="bg-slate-800 rounded-lg p-3 text-center">
                  <p className="text-xs text-slate-500 mb-1">{label}</p>
                  <p className={`font-mono font-semibold ${warn ? "text-amber-400" : "text-slate-200"}`}>
                    {val}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* 52-week range */}
          {ind && ind.high52w && ind.low52w && (
            <div className="bg-slate-800 rounded-lg p-3">
              <p className="text-xs text-slate-500 mb-2">ตำแหน่งราคาใน 52-week range</p>
              <div className="relative h-3 bg-slate-700 rounded-full">
                <div
                  className="absolute top-0 left-0 h-3 bg-gradient-to-r from-red-500 via-amber-400 to-green-500 rounded-full opacity-40"
                  style={{ width: "100%" }}
                />
                {(() => {
                  const pct = ((quote.price - ind.low52w!) / (ind.high52w! - ind.low52w!)) * 100;
                  return (
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-2 border-sky-400 rounded-full shadow"
                      style={{ left: `clamp(0%, ${pct}%, 100%)` }}
                    />
                  );
                })()}
              </div>
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>52W ต่ำ ${ind.low52w.toFixed(2)}</span>
                <span>52W สูง ${ind.high52w.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Signals */}
          {data && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <SignalBadge label="สัญญาณ 1 สัปดาห์" signal={data.signalWeekly} />
              <SignalBadge label="สัญญาณ 1 เดือน" signal={data.signalMonthly} />
            </div>
          )}

          {/* Sentiment */}
          {data && <SentimentGauge sentiment={data.sentiment} />}

          {/* Stats bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            {[
              { label: "เปิด", val: `$${quote.open.toFixed(2)}` },
              { label: "สูงสุดวันนี้", val: `$${quote.high.toFixed(2)}` },
              { label: "ต่ำสุดวันนี้", val: `$${quote.low.toFixed(2)}` },
              { label: "ปิดก่อนหน้า", val: `$${quote.prevClose.toFixed(2)}` },
            ].map(({ label, val }) => (
              <div key={label} className="bg-slate-800 rounded-lg p-2.5">
                <p className="text-slate-500">{label}</p>
                <p className="font-mono text-slate-200 mt-0.5">{val}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
