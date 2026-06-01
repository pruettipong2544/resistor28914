import { NextRequest, NextResponse } from "next/server";
import { fetchQuote } from "@/lib/finnhub";

// GET /api/quotes?symbols=AAPL,MSFT,NVDA
// Returns quotes for multiple symbols, fetched sequentially with server-side caching.
// API key stays server-side — never exposed to the client.
export async function GET(req: NextRequest) {
  const symbolsParam = req.nextUrl.searchParams.get("symbols");
  if (!symbolsParam) {
    return NextResponse.json({ error: "symbols parameter required" }, { status: 400 });
  }

  const symbols = symbolsParam
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 50); // safety cap

  const results = await Promise.all(symbols.map(fetchQuote));

  const quotes = results.reduce<Record<string, NonNullable<typeof results[0]>>>(
    (acc, quote, i) => {
      if (quote) acc[symbols[i]] = quote;
      return acc;
    },
    {}
  );

  return NextResponse.json(quotes, {
    headers: { "Cache-Control": "no-store" }, // client should not cache; server does it
  });
}
