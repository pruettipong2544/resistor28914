import { NextRequest, NextResponse } from "next/server";
import { fetchBatchQuotes } from "@/lib/finnhub";
import { fetchQuotes as fetchFmpQuotes, mockSeed } from "@/lib/fmp";
import type { QuoteData } from "@/types";

export async function GET(req: NextRequest) {
  const symbolsParam = req.nextUrl.searchParams.get("symbols");
  if (!symbolsParam) return NextResponse.json({ error: "symbols required" }, { status: 400 });
  const symbols = symbolsParam.toUpperCase().split(",").filter(Boolean);
  const forceRefresh = req.nextUrl.searchParams.get("refresh") === "1";

  const result: Record<string, QuoteData> = {};

  // ── Step 1: try Finnhub (parallel, uses FINNHUB_API_KEY) ─────────────────
  const { results: fhMap, anyReal: fhOk } = await fetchBatchQuotes(symbols, forceRefresh);

  if (fhOk) {
    for (const sym of symbols) {
      const q = fhMap.get(sym);
      if (q) {
        result[sym] = { price: q.price, change: q.change, changePct: q.changePct, isMock: false };
      }
    }
  }

  // ── Step 2: fill gaps with FMP (if FMP_API_KEY set) ──────────────────────
  const missing = symbols.filter(s => !result[s]);
  if (missing.length > 0) {
    const { data: fmpData, isMock: fmpMock } = await fetchFmpQuotes(missing);
    if (!fmpMock) {
      for (const q of fmpData) {
        if (!result[q.symbol]) {
          const entry: QuoteData = { price: q.price, change: q.change, changePct: q.changesPercentage, isMock: false };
          if (q.extendedPrice !== undefined && q.extendedPrice !== null && q.extendedPriceTimestamp) {
            entry.extendedPrice = q.extendedPrice;
            entry.extendedChangePct = q.extendedChangePercent;
            entry.extendedTimestamp = q.extendedPriceTimestamp;
          }
          result[q.symbol] = entry;
        }
      }
    }
  }

  // ── Step 3: mark remaining symbols as mock (no real data) ────────────────
  for (const sym of symbols) {
    if (!result[sym]) {
      const { price, rand } = mockSeed(sym);
      const changePct = parseFloat((rand() * 10 - 5).toFixed(2));
      result[sym] = { price, change: parseFloat((price * changePct / 100).toFixed(2)), changePct, isMock: true };
    }
  }

  const allReal = symbols.every(s => !result[s]?.isMock);
  const cc = allReal ? "public, max-age=30" : "no-store";
  return NextResponse.json(result, { headers: { "Cache-Control": cc } });
}
