"use client";

import { useState, useEffect, useCallback } from "react";
import type { Timeframe, CandleApiResponse, DcfApiResponse, QuoteData } from "@/types";
import { getTvSymbol, getCompanyName } from "@/config/stocks";
import TradingViewChart, { type TvStudyId } from "./TradingViewChart";
import TradingViewAnalysis from "./TradingViewAnalysis";
import TradingViewSingleQuote from "./TradingViewSingleQuote";
import PivotPointsPanel from "./PivotPointsPanel";
import SignalSummaryPanel from "./SignalSummaryPanel";
import DCFPanel from "./DCFPanel";

interface Props {
  symbol: string;
  onClose: () => void;
}

const TIMEFRAMES: Timeframe[] = ["1D", "1W", "1M", "1Y"];

interface StudyOption {
  key: string;
  label: string;
  ids: TvStudyId[];
}

const STUDY_OPTIONS: StudyOption[] = [
  { key: "rsi",        label: "RSI",          ids: ["RSI@tv-basicstudies"] },
  { key: "macd",       label: "MACD",         ids: ["MACD@tv-basicstudies"] },
  { key: "ema",        label: "EMA 20/50",    ids: [
      { id: "MAExp@tv-basicstudies", inputs: { length: 20 } },
      { id: "MAExp@tv-basicstudies", inputs: { length: 50 } },
  ]},
  { key: "pivot",      label: "Pivot S/R",    ids: ["PivotPointsStandard@tv-basicstudies"] },
  { key: "regression", label: "Reg. Channel", ids: ["LinearRegression@tv-basicstudies"] },
];

const DEFAULT_ENABLED = new Set(["rsi", "ema", "pivot"]);

// Returns true when the extended-hours timestamp is recent enough to display
function isExtendedHoursRecent(ts: number | undefined): ts is number {
  if (!ts) return false;
  return Date.now() / 1000 - ts < 4 * 3600; // within last 4 hours
}

function fmt2(n: number) { return n >= 0 ? `+${n.toFixed(2)}%` : `${n.toFixed(2)}%`; }

// Placeholder shown when real candle data is unavailable
function NoRealDataCard({ title }: { title: string }) {
  return (
    <div className="bg-slate-800 rounded-xl p-4 border border-slate-700/60 flex flex-col items-center justify-center gap-1.5 py-6">
      <span className="text-slate-500 text-xs font-mono">{title}</span>
      <span className="text-slate-600 text-[11px] text-center">
        ต่อ API จริง (Finnhub / FMP) เพื่อดูข้อมูล — ราคา mock ไม่แสดงเพื่อหลีกเลี่ยงความสับสนกับกราฟ
      </span>
    </div>
  );
}

export default function StockDetail({ symbol, onClose }: Props) {
  const [timeframe, setTimeframe] = useState<Timeframe>("1M");
  const [enabledStudies, setEnabledStudies] = useState<Set<string>>(DEFAULT_ENABLED);
  const [candleData, setCandleData] = useState<CandleApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dcfData, setDcfData] = useState<DcfApiResponse | null>(null);
  const [quote, setQuote] = useState<QuoteData | null>(null);

  const tvSymbol = getTvSymbol(symbol);
  const companyName = getCompanyName(symbol);

  const activeStudies: TvStudyId[] = STUDY_OPTIONS
    .filter((s) => enabledStudies.has(s.key))
    .flatMap((s) => s.ids);

  const enabledArr = Array.from(enabledStudies);
  const chartKey = `${symbol}-${timeframe}-${enabledArr.sort().join(",")}`;

  const toggleStudy = (key: string) => {
    setEnabledStudies((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const loadCandles = useCallback(async (tf: Timeframe) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/candles?symbol=${symbol}&timeframe=${tf}`);
      if (!res.ok) throw new Error("ไม่สามารถดึงข้อมูลได้");
      setCandleData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  // DCF + quote fetch once per symbol open
  useEffect(() => {
    setDcfData(null);
    setQuote(null);
    fetch(`/api/dcf?symbol=${symbol}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setDcfData(d); })
      .catch(() => {});
    fetch(`/api/quotes?symbols=${symbol}`)
      .then(r => r.ok ? r.json() : null)
      .then((d: Record<string, QuoteData> | null) => { if (d?.[symbol]) setQuote(d[symbol]); })
      .catch(() => {});
  }, [symbol]);

  useEffect(() => { loadCandles(timeframe); }, [timeframe, loadCandles]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const hasRealData = candleData !== null && !candleData.isMockData;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div
        className="relative w-full max-w-6xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col"
        style={{ height: "90vh", maxHeight: "90vh" }}
      >

        {/* ── Sticky header ── */}
        <div className="flex-shrink-0 bg-slate-900/95 backdrop-blur rounded-t-2xl border-b border-slate-700 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            {/* Left: name row */}
            <div className="flex items-baseline gap-3 min-w-0 flex-shrink-0">
              <h2 className="text-xl font-bold text-white">{symbol}</h2>
              <span className="text-slate-400 text-sm truncate hidden sm:block">{companyName}</span>
              <span className="text-xs text-slate-600 font-mono hidden md:block">{tvSymbol}</span>
            </div>

            {/* Center: TradingView real-time price (same source as chart) + after-hours */}
            <div className="flex-1 min-w-0 hidden sm:flex flex-col gap-1">
              <TradingViewSingleQuote key={tvSymbol} tvSymbol={tvSymbol} />
              {/* After-hours / pre-market chip — shown only when data is fresh */}
              {quote && !quote.isMock && isExtendedHoursRecent(quote.extendedTimestamp) && (
                <div className="flex items-center gap-2 px-1">
                  <span className="text-[10px] text-slate-500 bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded">
                    After hours
                  </span>
                  <span className="text-xs font-mono text-slate-200">
                    ${quote.extendedPrice!.toFixed(2)}
                  </span>
                  {quote.extendedChangePct !== undefined && (
                    <span className={`text-xs font-medium ${quote.extendedChangePct >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {fmt2(quote.extendedChangePct)}
                    </span>
                  )}
                  <span className="text-[10px] text-slate-600">
                    {new Date(quote.extendedTimestamp! * 1000).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: "America/New_York" })} ET
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={onClose}
              className="ml-1 flex-shrink-0 text-slate-400 hover:text-white text-2xl leading-none p-1"
              aria-label="ปิด"
            >✕</button>
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto flex flex-col">

          {/* Controls */}
          <div className="flex-shrink-0 px-4 pt-3 pb-2 flex flex-wrap items-center gap-2 border-b border-slate-800">
            <div className="flex gap-1.5">
              {TIMEFRAMES.map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    timeframe === tf ? "bg-sky-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
            <div className="w-px h-4 bg-slate-700 hidden sm:block" />
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-xs text-slate-500">Studies:</span>
              {STUDY_OPTIONS.map((s) => {
                const on = enabledStudies.has(s.key);
                return (
                  <button
                    key={s.key}
                    onClick={() => toggleStudy(s.key)}
                    className={`px-2.5 py-0.5 rounded text-xs font-medium border transition-colors ${
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

          {/* Chart area */}
          <div className="flex-shrink-0 px-4 pt-3" style={{ height: "58vh" }}>
            <div className="h-full rounded-xl overflow-hidden border border-slate-700">
              <TradingViewChart
                key={chartKey}
                tvSymbol={tvSymbol}
                timeframe={timeframe}
                studies={activeStudies}
              />
            </div>
          </div>

          {/* Below-chart content */}
          <div className="px-4 pt-4 pb-6 space-y-4">

            {/* Pivot Points + Technical Analysis */}
            <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-4 items-start">
              <div>
                {loading && (
                  <div className="bg-slate-800 rounded-xl p-3 h-48 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                {error && !loading && (
                  <div className="bg-slate-800 rounded-xl p-3 text-red-400 text-xs text-center py-4">⚠ {error}</div>
                )}
                {!loading && !error && candleData && (
                  hasRealData ? (
                    <PivotPointsPanel
                      pivotPoints={candleData.pivotPoints}
                      currentPrice={candleData.currentPrice}
                      isMockData={false}
                    />
                  ) : (
                    <NoRealDataCard title="แนวรับ / แนวต้าน" />
                  )
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

            {/* Signal Summary — only shown with real candle data */}
            {!loading && !error && candleData && (
              hasRealData && candleData.signals ? (
                <SignalSummaryPanel
                  signals={candleData.signals}
                  currentPrice={candleData.currentPrice}
                />
              ) : !hasRealData ? (
                <NoRealDataCard title="Signal Summary (RSI / EMA / MACD)" />
              ) : null
            )}

            {/* DCF Valuation */}
            {dcfData ? (
              <DCFPanel
                dcf={dcfData}
                symbol={symbol}
                livePrice={quote && !quote.isMock ? quote.price : undefined}
              />
            ) : (
              <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 h-24 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            <div className="text-[11px] text-slate-600 border-t border-slate-800 pt-3">
              กราฟและ Technical Analysis มาจาก TradingView · ราคาในหัวข้อมาจาก TradingView (ตรงกับกราฟ) · แนวรับ/แนวต้านคำนวณจากข้อมูลจริงเท่านั้น · ไม่ใช่คำแนะนำการลงทุน
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
