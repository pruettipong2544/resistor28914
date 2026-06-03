import { NextResponse } from "next/server";
import type { ScreenerResult } from "@/types";

// Minimum pullback to appear in results (avoid noise near ATH)
const MIN_PULLBACK = 0.10;
// Maximum pullback (avoid truly distressed / delisted stocks)
const MAX_PULLBACK = 0.65;
// How many candidates to evaluate
const CANDIDATE_LIMIT = 60;
// Results cap
const RESULT_LIMIT = 10;

interface FmpScreenerItem {
  symbol: string;
  companyName: string;
  marketCap: number;
  price: number;
  volume: number;
}

interface FmpQuote {
  symbol: string;
  price: number;
  yearHigh: number;
  name: string;
  avgVolume: number;
}

function fmtCap(n: number): number { return Math.round(n); }

// Deterministic mock screener results seeded on today's date
function mockResults(): ScreenerResult[] {
  const seeds = ["NVDA","AAPL","MSFT","TSLA","AMZN","IONQ","OKLO","KTOS","SOFI","ASTS",
                 "INTC","IREN","AXTI","NOW","EOSE","AMPX","QBTS","RGTI","RDW","ASPI"];
  const names: Record<string, string> = {
    NVDA:"NVIDIA Corp.",AAPL:"Apple Inc.",MSFT:"Microsoft Corp.",TSLA:"Tesla Inc.",
    AMZN:"Amazon.com Inc.",IONQ:"IonQ Inc.",OKLO:"Oklo Inc.",KTOS:"Kratos Defense",
    SOFI:"SoFi Technologies",ASTS:"AST SpaceMobile",INTC:"Intel Corp.",IREN:"Iris Energy",
    AXTI:"AXT Inc.",NOW:"ServiceNow Inc.",EOSE:"Eos Energy",AMPX:"Amprius Technologies",
    QBTS:"D-Wave Quantum",RGTI:"Rigetti Computing",RDW:"Redwire Corp.",ASPI:"ASP Isotopes",
  };

  const results: ScreenerResult[] = [];
  for (const sym of seeds) {
    const seed = sym.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
    let rng = (seed * 69069 + 1) >>> 0;
    const rand = () => { rng = (rng * 1664525 + 1013904223) & 0xffffffff; return (rng >>> 0) / 0xffffffff; };
    const base = (seed % 280) + 20;
    const price = parseFloat((base * (0.85 + rand() * 0.3)).toFixed(2));
    const pullbackPct = parseFloat((0.1 + rand() * 0.5).toFixed(4));
    const yearHigh = parseFloat((price / (1 - pullbackPct)).toFixed(2));
    if (pullbackPct < MIN_PULLBACK || pullbackPct > MAX_PULLBACK) continue;
    results.push({
      symbol: sym,
      name: names[sym] ?? sym,
      price,
      yearHigh,
      pullbackPct,
      marketCap: Math.round((seed % 2000 + 100) * 1e9),
      avgVolume: Math.round(300_000 + rand() * 10_000_000),
      isMock: true,
    });
  }

  return results
    .sort((a, b) => b.pullbackPct - a.pullbackPct)
    .slice(0, RESULT_LIMIT);
}

export async function GET() {
  const apiKey = process.env.FMP_API_KEY;

  if (apiKey) {
    try {
      // Step 1: screener — US stocks, cap ≥ $500M, price ≥ $3, volume ≥ 300K
      const screenerUrl = [
        "https://financialmodelingprep.com/api/v3/stock-screener",
        `?marketCapMoreThan=500000000`,
        `&priceMoreThan=3`,
        `&volumeMoreThan=300000`,
        `&country=US`,
        `&isActivelyTrading=true`,
        `&limit=${CANDIDATE_LIMIT}`,
        `&apikey=${apiKey}`,
      ].join("");

      const sRes = await fetch(screenerUrl, { next: { revalidate: 3600 } });
      if (sRes.ok) {
        const candidates: FmpScreenerItem[] = await sRes.json();
        if (Array.isArray(candidates) && candidates.length > 0) {
          // Step 2: batch quotes for year-high data
          const tickers = candidates.map(c => c.symbol).join(",");
          const qRes = await fetch(
            `https://financialmodelingprep.com/api/v3/quote/${tickers}?apikey=${apiKey}`,
            { next: { revalidate: 3600 } }
          );
          if (qRes.ok) {
            const quotes: FmpQuote[] = await qRes.json();
            const quoteMap = new Map(quotes.map(q => [q.symbol, q]));

            const results: ScreenerResult[] = [];
            for (const c of candidates) {
              const q = quoteMap.get(c.symbol);
              if (!q || !q.yearHigh || q.yearHigh <= 0 || q.price <= 0) continue;
              const pullbackPct = (q.yearHigh - q.price) / q.yearHigh;
              if (pullbackPct < MIN_PULLBACK || pullbackPct > MAX_PULLBACK) continue;
              if ((q.avgVolume ?? 0) < 300_000) continue;
              results.push({
                symbol: c.symbol,
                name: q.name ?? c.companyName,
                price: q.price,
                yearHigh: q.yearHigh,
                pullbackPct,
                marketCap: fmtCap(c.marketCap),
                avgVolume: q.avgVolume ?? c.volume,
                isMock: false,
              });
            }

            const top = results
              .sort((a, b) => b.pullbackPct - a.pullbackPct)
              .slice(0, RESULT_LIMIT);

            if (top.length > 0) {
              return NextResponse.json(top, { headers: { "Cache-Control": "public, max-age=3600" } });
            }
          }
        }
      }
    } catch { /* fall through to mock */ }
  }

  return NextResponse.json(mockResults(), { headers: { "Cache-Control": "no-store" } });
}
