import { NextRequest, NextResponse } from "next/server";
import { fetchCandles } from "@/lib/finnhub";
import { computePivotPoints } from "@/lib/indicators";
import type { Timeframe, CandleApiResponse } from "@/types";

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol")?.toUpperCase();
  const timeframe = req.nextUrl.searchParams.get("timeframe") as Timeframe | null;

  if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });
  if (!timeframe || !["1D", "1W", "1M", "1Y"].includes(timeframe)) {
    return NextResponse.json({ error: "invalid timeframe" }, { status: 400 });
  }

  const { candles, isMock } = await fetchCandles(symbol, timeframe);
  const currentPrice = candles[candles.length - 1]?.close ?? 0;
  const pivotPoints = computePivotPoints(candles);

  const response: CandleApiResponse = {
    candles,
    pivotPoints,
    currentPrice,
    isMockData: isMock,
  };

  return NextResponse.json(response, {
    headers: { "Cache-Control": "no-store" },
  });
}
