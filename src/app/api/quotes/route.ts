import { NextRequest, NextResponse } from "next/server";
import { fetchQuotes, mockSeed } from "@/lib/fmp";
import type { QuoteData } from "@/types";

export async function GET(req: NextRequest) {
  const symbolsParam = req.nextUrl.searchParams.get("symbols");
  if (!symbolsParam) return NextResponse.json({ error: "symbols required" }, { status: 400 });
  const symbols = symbolsParam.toUpperCase().split(",").filter(Boolean);

  const { data, isMock } = await fetchQuotes(symbols);

  const quoteMap = new Map(data.map(q => [q.symbol, q]));
  const result: Record<string, QuoteData> = {};

  for (const sym of symbols) {
    const q = quoteMap.get(sym);
    if (q) {
      const entry: QuoteData = { price: q.price, change: q.change, changePct: q.changesPercentage, isMock };
      // Include extended hours data only when the timestamp is present (FMP populates this during extended sessions)
      if (q.extendedPrice !== undefined && q.extendedPrice !== null && q.extendedPriceTimestamp) {
        entry.extendedPrice = q.extendedPrice;
        entry.extendedChangePct = q.extendedChangePercent;
        entry.extendedTimestamp = q.extendedPriceTimestamp;
      }
      result[sym] = entry;
    } else {
      // Fill any gaps with per-symbol mock
      const { price, rand } = mockSeed(sym);
      const changePct = parseFloat((rand() * 10 - 5).toFixed(2));
      result[sym] = { price, change: parseFloat((price * changePct / 100).toFixed(2)), changePct, isMock: true };
    }
  }

  const cc = isMock ? "no-store" : "public, max-age=60";
  return NextResponse.json(result, { headers: { "Cache-Control": cc } });
}
