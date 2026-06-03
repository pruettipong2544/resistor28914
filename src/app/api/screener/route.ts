import { NextResponse } from "next/server";
import { fetchScreener, fetchQuotes, mockSeed } from "@/lib/fmp";
import type { ScreenerResult } from "@/types";
import { COMPANY_NAMES } from "@/config/stocks";

const MIN_PULLBACK   = 0.10;
const MAX_PULLBACK   = 0.65;
const CANDIDATE_LIMIT = 60;
const RESULT_LIMIT   = 10;

const MOCK_SEEDS = [
  "NVDA","AAPL","MSFT","TSLA","AMZN","IONQ","OKLO","KTOS","SOFI","ASTS",
  "INTC","IREN","AXTI","NOW","EOSE","AMPX","QBTS","RGTI","RDW","ASPI",
];

function mockResults(): ScreenerResult[] {
  const results: ScreenerResult[] = [];
  for (const sym of MOCK_SEEDS) {
    const { price, rand } = mockSeed(sym);
    const pullbackPct = parseFloat((0.1 + rand() * 0.5).toFixed(4));
    if (pullbackPct < MIN_PULLBACK || pullbackPct > MAX_PULLBACK) continue;
    const seed = sym.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
    results.push({
      symbol: sym,
      name: COMPANY_NAMES[sym] ?? sym,
      price,
      yearHigh: parseFloat((price / (1 - pullbackPct)).toFixed(2)),
      pullbackPct,
      marketCap: Math.round((seed % 2000 + 100) * 1e9),
      avgVolume: Math.round(300_000 + rand() * 10_000_000),
      isMock: true,
    });
  }
  return results.sort((a, b) => b.pullbackPct - a.pullbackPct).slice(0, RESULT_LIMIT);
}

export async function GET() {
  const { data: candidates, isMock: screenerMock } = await fetchScreener({
    marketCapMoreThan: 500_000_000,
    priceMoreThan: 3,
    volumeMoreThan: 300_000,
    exchange: "NASDAQ,NYSE",
    isActivelyTrading: true,
    limit: CANDIDATE_LIMIT,
  });

  if (!screenerMock && candidates.length > 0) {
    const symbols = candidates.map(c => c.symbol);
    const { data: quotes } = await fetchQuotes(symbols);
    const quoteMap = new Map(quotes.map(q => [q.symbol, q]));
    const capMap = new Map(candidates.map(c => [c.symbol, c.marketCap]));

    const results: ScreenerResult[] = [];
    for (const q of quotes) {
      if (!q.yearHigh || q.yearHigh <= 0 || q.price <= 0) continue;
      const pullbackPct = (q.yearHigh - q.price) / q.yearHigh;
      if (pullbackPct < MIN_PULLBACK || pullbackPct > MAX_PULLBACK) continue;
      if ((q.avgVolume ?? 0) < 300_000) continue;
      results.push({
        symbol: q.symbol,
        name: q.name || (COMPANY_NAMES[q.symbol] ?? q.symbol),
        price: q.price,
        yearHigh: q.yearHigh,
        pullbackPct,
        marketCap: capMap.get(q.symbol) ?? 0,
        avgVolume: q.avgVolume,
        isMock: false,
      });
    }

    const top = results.sort((a, b) => b.pullbackPct - a.pullbackPct).slice(0, RESULT_LIMIT);
    if (top.length > 0) {
      return NextResponse.json(top, { headers: { "Cache-Control": "public, max-age=3600" } });
    }
  }

  return NextResponse.json(mockResults(), { headers: { "Cache-Control": "no-store" } });
}
