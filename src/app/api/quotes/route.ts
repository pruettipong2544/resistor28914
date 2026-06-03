import { NextRequest, NextResponse } from "next/server";

interface FmpQuote { symbol: string; price: number; change: number; changesPercentage: number; }

function mockQuote(symbol: string): { price: number; change: number; changePct: number } {
  const seed = symbol.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  let rng = (seed * 69069 + 1) >>> 0;
  const rand = () => { rng = (rng * 1664525 + 1013904223) & 0xffffffff; return (rng >>> 0) / 0xffffffff; };
  const base = (seed % 280) + 20;
  const price = parseFloat((base * (0.85 + rand() * 0.3)).toFixed(2));
  const changePct = parseFloat(((rand() * 10 - 5)).toFixed(2));
  const change = parseFloat((price * changePct / 100).toFixed(2));
  return { price, change, changePct };
}

export async function GET(req: NextRequest) {
  const symbolsParam = req.nextUrl.searchParams.get("symbols");
  if (!symbolsParam) return NextResponse.json({ error: "symbols required" }, { status: 400 });
  const symbols = symbolsParam.toUpperCase().split(",").filter(Boolean);

  const apiKey = process.env.FMP_API_KEY;

  if (apiKey) {
    try {
      const joined = symbols.join(",");
      const res = await fetch(
        `https://financialmodelingprep.com/api/v3/quote/${joined}?apikey=${apiKey}`,
        { next: { revalidate: 60 } }
      );
      if (res.ok) {
        const data: FmpQuote[] = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const result: Record<string, { price: number; change: number; changePct: number; isMock: boolean }> = {};
          for (const q of data) {
            result[q.symbol] = { price: q.price, change: q.change, changePct: q.changesPercentage, isMock: false };
          }
          for (const sym of symbols) {
            if (!result[sym]) result[sym] = { ...mockQuote(sym), isMock: true };
          }
          return NextResponse.json(result, { headers: { "Cache-Control": "public, max-age=60" } });
        }
      }
    } catch { /* fall through to mock */ }
  }

  const result: Record<string, { price: number; change: number; changePct: number; isMock: boolean }> = {};
  for (const sym of symbols) result[sym] = { ...mockQuote(sym), isMock: true };
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
