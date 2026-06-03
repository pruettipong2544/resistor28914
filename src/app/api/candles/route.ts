import { NextRequest, NextResponse } from "next/server";
import { fetchCandles } from "@/lib/finnhub";
import { fetchHistoricalPrices } from "@/lib/fmp";
import { computePivotPoints, computeSignals } from "@/lib/indicators";
import type { Timeframe, Candle, CandleApiResponse } from "@/types";

// Mirror of finnhub.ts lookback/max settings for FMP fallback
const LOOKBACK_DAYS: Record<Timeframe, number> = {
  "1D": 10, "1W": 21, "1M": 45, "1Y": 400,
};
const MAX_CANDLES: Record<Timeframe, number> = {
  "1D": 7, "1W": 15, "1M": 30, "1Y": 252,
};

function dateStr(offsetDays: number): string {
  const d = new Date(Date.now() - offsetDays * 86_400_000);
  return d.toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol")?.toUpperCase();
  const timeframe = req.nextUrl.searchParams.get("timeframe") as Timeframe | null;

  if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });
  if (!timeframe || !["1D", "1W", "1M", "1Y"].includes(timeframe)) {
    return NextResponse.json({ error: "invalid timeframe" }, { status: 400 });
  }

  // ── Step 1: try Finnhub ───────────────────────────────────────────────────
  let candles: Candle[] = [];
  let isMock = true;

  const finnhub = await fetchCandles(symbol, timeframe);
  if (!finnhub.isMock) {
    candles = finnhub.candles;
    isMock = false;
  } else {
    // ── Step 2: try FMP as fallback ─────────────────────────────────────────
    const fromDate = dateStr(LOOKBACK_DAYS[timeframe]);
    const toDate   = dateStr(0);
    const fmp = await fetchHistoricalPrices(symbol, fromDate, toDate, MAX_CANDLES[timeframe]);
    if (!fmp.isMock && fmp.bars.length > 0) {
      candles = fmp.bars.map(b => ({
        time: Math.floor(new Date(b.date).getTime() / 1000),
        open: b.open, high: b.high, low: b.low, close: b.close, volume: b.volume,
      }));
      isMock = false;
    } else {
      // ── Step 3: mock (both sources unavailable) ──────────────────────────
      candles = finnhub.candles; // finnhub.ts already generated mock candles
      isMock = true;
    }
  }

  const currentPrice = candles[candles.length - 1]?.close ?? 0;

  // Only compute pivot points / signals when we have real data.
  // Mock candles have wrong price magnitudes so showing them would be misleading.
  const pivotPoints = isMock ? null : computePivotPoints(candles);
  const signals     = isMock ? null : computeSignals(candles, pivotPoints);

  const response: CandleApiResponse = {
    candles,
    pivotPoints,
    currentPrice,
    isMockData: isMock,
    signals,
  };

  return NextResponse.json(response, { headers: { "Cache-Control": "no-store" } });
}
