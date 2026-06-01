import { NextRequest, NextResponse } from "next/server";
import { fetchCandles } from "@/lib/finnhub";
import { computeIndicators, computeSignal, computeSentiment, rsiSeries, sma } from "@/lib/indicators";
import type { Timeframe, StockDetailData } from "@/types";

// GET /api/candles?symbol=AAPL&timeframe=1D
// Returns candle data + computed technical indicators for the given timeframe.
// Heavy computation happens server-side; client receives ready-to-render data.
export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol")?.toUpperCase();
  const timeframe = req.nextUrl.searchParams.get("timeframe") as Timeframe | null;

  if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });
  if (!timeframe || !["1D", "1W", "1M", "1Y"].includes(timeframe)) {
    return NextResponse.json({ error: "invalid timeframe" }, { status: 400 });
  }

  const candles = await fetchCandles(symbol, timeframe);
  if (!candles.length) {
    return NextResponse.json({ error: "no data available" }, { status: 404 });
  }

  const closes = candles.map((c) => c.close);
  const volumes = candles.map((c) => c.volume);
  const currentPrice = closes[closes.length - 1];
  const latestVolume = volumes[volumes.length - 1];

  const indicators = computeIndicators(candles);

  // For weekly/monthly signals use the last 20 (weekly) and 60 (monthly) candles
  // of this timeframe's data as proxy — or the full set if shorter
  const weeklySlice = candles.slice(-20);
  const monthlySlice = candles.slice(-60);
  const signalWeekly = computeSignal(computeIndicators(weeklySlice), currentPrice);
  const signalMonthly = computeSignal(computeIndicators(monthlySlice), currentPrice);

  const sentiment = computeSentiment(currentPrice, indicators, latestVolume);

  // Attach MA series for chart rendering (only last N points to keep payload manageable)
  const ma20Series = sma(closes, 20);
  const ma50Series = sma(closes, 50);
  const rsiArr = rsiSeries(closes);

  const enrichedCandles = candles.map((c, i) => ({
    ...c,
    ma20: ma20Series[i],
    ma50: ma50Series[i],
    rsi: rsiArr[i],
  }));

  const response: StockDetailData & { enrichedCandles: typeof enrichedCandles } = {
    candles,
    enrichedCandles,
    indicators,
    signalWeekly,
    signalMonthly,
    sentiment,
  };

  return NextResponse.json(response, {
    headers: { "Cache-Control": "no-store" },
  });
}
