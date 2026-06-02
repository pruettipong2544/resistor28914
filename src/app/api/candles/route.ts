import { NextRequest, NextResponse } from "next/server";
import { fetchCandles } from "@/lib/finnhub";
import { computeIndicators, computeSignal, computeSentiment, rsiSeries, sma } from "@/lib/indicators";
import type { Timeframe, StockDetailData } from "@/types";

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol")?.toUpperCase();
  const timeframe = req.nextUrl.searchParams.get("timeframe") as Timeframe | null;

  if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });
  if (!timeframe || !["1D", "1W", "1M", "1Y"].includes(timeframe)) {
    return NextResponse.json({ error: "invalid timeframe" }, { status: 400 });
  }

  const { candles, isMock } = await fetchCandles(symbol, timeframe);

  const closes = candles.map((c) => c.close);
  const volumes = candles.map((c) => c.volume);
  const currentPrice = closes[closes.length - 1];
  const latestVolume = volumes[volumes.length - 1];

  const indicators = computeIndicators(candles);
  const signalWeekly = computeSignal(computeIndicators(candles.slice(-20)), currentPrice);
  const signalMonthly = computeSignal(computeIndicators(candles.slice(-60)), currentPrice);
  const sentiment = computeSentiment(currentPrice, indicators, latestVolume);

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
    isMockData: isMock,
  };

  return NextResponse.json(response, {
    headers: { "Cache-Control": "no-store" },
  });
}
