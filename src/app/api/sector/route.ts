import { NextRequest, NextResponse } from "next/server";
import { fetchAutoTags } from "@/lib/sectorTags";

// GET /api/sector?symbol=AAPL
// Returns auto-detected sector/industry tags for a ticker (server-side —
// keeps FMP/Finnhub API keys out of the client). Used when adding a new
// stock that has no manual theme mapping.
export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol")?.toUpperCase().trim();
  if (!symbol) return NextResponse.json({ tags: ["Stock"] });

  const tags = await fetchAutoTags(symbol);
  return NextResponse.json({ tags }, { headers: { "Cache-Control": "no-store" } });
}
