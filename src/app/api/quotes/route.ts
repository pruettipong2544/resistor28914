import { NextRequest, NextResponse } from "next/server";
import { fetchQuote } from "@/lib/finnhub";

export async function GET(req: NextRequest) {
  const symbolsParam = req.nextUrl.searchParams.get("symbols");
  if (!symbolsParam) {
    return NextResponse.json({ error: "symbols parameter required" }, { status: 400 });
  }

  const symbols = symbolsParam
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 50);

  const results = await Promise.all(symbols.map(fetchQuote));

  const quotes = results.reduce<Record<string, (typeof results)[0]>>(
    (acc, quote, i) => {
      acc[symbols[i]] = quote;
      return acc;
    },
    {}
  );

  return NextResponse.json(quotes, {
    headers: { "Cache-Control": "no-store" },
  });
}
