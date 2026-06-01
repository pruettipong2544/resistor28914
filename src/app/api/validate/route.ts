import { NextRequest, NextResponse } from "next/server";
import { validateTicker } from "@/lib/finnhub";

// GET /api/validate?symbol=AAPL
// Validates that a ticker exists in Finnhub before adding it to the watchlist.
// Prevents broken cards from bad ticker input.
export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol")?.toUpperCase().trim();
  if (!symbol) return NextResponse.json({ valid: false, name: "" });

  const result = await validateTicker(symbol);
  return NextResponse.json(result);
}
