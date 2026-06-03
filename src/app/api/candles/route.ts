import { NextRequest, NextResponse } from "next/server";
import { fetchHistoricalPrices } from "@/lib/fmp";
import { computePivotPoints, computeSignals } from "@/lib/indicators";
import type { Timeframe, Candle, CandleApiResponse } from "@/types";

// Request ~560 calendar days to cover EMA200 (≈400 trading days) for all timeframes.
// FMP free tier provides daily EOD bars only.
const LOOKBACK_DAYS = 560;
const MAX_BARS = 400;

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

  // ── Primary: FMP daily historical (free tier, EOD bars) ──────────────────
  let candles: Candle[] = [];
  let isMock = true;

  const fromDate = dateStr(LOOKBACK_DAYS);
  const toDate   = dateStr(0);
  const fmp = await fetchHistoricalPrices(symbol, fromDate, toDate, MAX_BARS);
  if (!fmp.isMock && fmp.bars.length > 0) {
    candles = fmp.bars.map(b => ({
      time: Math.floor(new Date(b.date).getTime() / 1000),
      open: b.open, high: b.high, low: b.low, close: b.close, volume: b.volume,
    }));
    isMock = false;
  } else {
    console.log(`[candles:${symbol}:${timeframe}] FMP failed — no pivot/signal data available`);
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
