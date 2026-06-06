import { NextRequest, NextResponse } from "next/server";
import { fetchTwelveDataCandles } from "@/lib/twelvedata";
import { computePivotPoints, computeSignals } from "@/lib/indicators";
import type { Timeframe, CandleApiResponse } from "@/types";

// 400 daily bars covers EMA200 (200 trading days) with room to spare.
// Fetched on-demand (per symbol open) to stay within Twelve Data free quota.
const OUTPUT_SIZE = 400;

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol")?.toUpperCase();
  const timeframe = req.nextUrl.searchParams.get("timeframe") as Timeframe | null;

  if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });
  if (!timeframe || !["1D", "1W", "1M", "1Y"].includes(timeframe)) {
    return NextResponse.json({ error: "invalid timeframe" }, { status: 400 });
  }

  const forceRefresh = req.nextUrl.searchParams.get("refresh") === "1";

  // ── Primary: Twelve Data daily EOD (free, covers small-caps) ─────────────
  const { candles, isMock, reason } = await fetchTwelveDataCandles(symbol, OUTPUT_SIZE, forceRefresh);

  if (isMock) {
    console.log(`[candles:${symbol}:${timeframe}] no real data — reason: ${reason ?? "unknown"}`);
  }

  const currentPrice = candles[candles.length - 1]?.close ?? 0;

  // Compute pivot/signals only when we have real bars.
  const pivotPoints = isMock ? null : computePivotPoints(candles);

  if (pivotPoints && candles.length >= 2) {
    const lastBar = candles[candles.length - 1];
    const lastDate = new Date(lastBar.time * 1000).toISOString().slice(0, 10);
    const todayUtc = new Date().toISOString().slice(0, 10);
    const isPartial = lastDate === todayUtc;
    const refBar = candles[isPartial ? candles.length - 2 : candles.length - 1];
    console.log(
      `[candles:${symbol}] pivot ref: ${pivotPoints.pivotCandleDate}` +
      ` H=${refBar.high.toFixed(2)} L=${refBar.low.toFixed(2)} C=${refBar.close.toFixed(2)}` +
      ` | last bar: ${lastDate} (${isPartial ? "partial/today" : "EOD complete"})` +
      ` | currentPrice (candle): ${currentPrice.toFixed(2)}`
    );
  }

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
