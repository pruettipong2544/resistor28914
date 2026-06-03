// Financial Modeling Prep API client — SERVER-SIDE ONLY.
// All functions fall back to deterministic mock data when FMP_API_KEY is unset
// or when the API call fails, so the app is always fully functional without a key.

import { getCached, setCached } from "./cache";

const BASE = "https://financialmodelingprep.com/api/v3";

function apiKey(): string | null {
  return process.env.FMP_API_KEY ?? null;
}

async function fmpFetch<T>(path: string, ttlMs: number): Promise<T | null> {
  const key = process.env.FMP_API_KEY;
  if (!key) return null;

  const cacheKey = `fmp:${path}`;
  const cached = getCached<T>(cacheKey);
  if (cached) return cached;

  try {
    const sep = path.includes("?") ? "&" : "?";
    const res = await fetch(`${BASE}${path}${sep}apikey=${key}`, { next: { revalidate: 0 } });
    if (!res.ok) return null;
    const data: T = await res.json();
    setCached(cacheKey, data, ttlMs);
    return data;
  } catch {
    return null;
  }
}

// ─── Shared mock seed (LCG) ───────────────────────────────────────────────────
// Same algorithm as finnhub.ts mockSeedPrice — ensures prices are consistent
// across all mock responses.

export function mockSeed(symbol: string): { price: number; rand: () => number } {
  const seed = symbol.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  let rng = (seed * 69069 + 1) >>> 0;
  const rand = () => { rng = (rng * 1664525 + 1013904223) & 0xffffffff; return (rng >>> 0) / 0xffffffff; };
  const base = (seed % 280) + 20;
  const price = parseFloat((base * (0.85 + rand() * 0.3)).toFixed(2));
  return { price, rand };
}

// ─── Quote (price + daily change) ────────────────────────────────────────────

export interface FmpQuoteItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changesPercentage: number;
  yearHigh: number;
  avgVolume: number;
}

export async function fetchQuotes(symbols: string[]): Promise<{ data: FmpQuoteItem[]; isMock: boolean }> {
  const TTL = 60_000; // 1 minute

  const cacheKey = `fmp:quotes:${symbols.slice().sort().join(",")}`;
  const cached = getCached<FmpQuoteItem[]>(cacheKey);
  if (cached) return { data: cached, isMock: false };

  const key = apiKey();
  if (key) {
    try {
      const joined = symbols.join(",");
      const sep = "?";
      const res = await fetch(`${BASE}/quote/${joined}${sep}apikey=${key}`, { next: { revalidate: 0 } });
      if (res.ok) {
        const data: FmpQuoteItem[] = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setCached(cacheKey, data, TTL);
          return { data, isMock: false };
        }
      }
    } catch { /* fall through */ }
  }

  // Mock
  const mock: FmpQuoteItem[] = symbols.map((sym) => {
    const { price, rand } = mockSeed(sym);
    const changePct = parseFloat((rand() * 10 - 5).toFixed(2));
    const pullback = 0.05 + rand() * 0.55;
    return {
      symbol: sym,
      name: sym,
      price,
      change: parseFloat((price * changePct / 100).toFixed(2)),
      changesPercentage: changePct,
      yearHigh: parseFloat((price / (1 - pullback)).toFixed(2)),
      avgVolume: Math.round(300_000 + rand() * 10_000_000),
    };
  });
  return { data: mock, isMock: true };
}

// ─── Quote-short (price only, lighter) ───────────────────────────────────────

export async function fetchPrice(symbol: string): Promise<number> {
  const key = apiKey();
  if (key) {
    try {
      const res = await fetch(`${BASE}/quote-short/${symbol}?apikey=${key}`, { next: { revalidate: 0 } });
      if (res.ok) {
        const data: { price?: number }[] = await res.json();
        if (data[0]?.price) return data[0].price;
      }
    } catch { /* fall through */ }
  }
  return mockSeed(symbol).price;
}

// ─── Key metrics TTM ─────────────────────────────────────────────────────────

export interface FmpKeyMetrics {
  freeCashFlowPerShareTTM?: number;
  peRatioTTM?: number;
  priceToBookRatioTTM?: number;
}

export async function fetchKeyMetricsTTM(symbol: string): Promise<{ data: FmpKeyMetrics | null; isMock: boolean }> {
  const TTL = 4 * 60 * 60_000; // 4 hours

  const cacheKey = `fmp:km:${symbol}`;
  const cached = getCached<FmpKeyMetrics>(cacheKey);
  if (cached) return { data: cached, isMock: false };

  const key = apiKey();
  if (key) {
    try {
      const res = await fetch(`${BASE}/key-metrics-ttm/${symbol}?apikey=${key}`, { next: { revalidate: 0 } });
      if (res.ok) {
        const arr: FmpKeyMetrics[] = await res.json();
        const m = Array.isArray(arr) ? arr[0] : null;
        if (m) {
          setCached(cacheKey, m, TTL);
          return { data: m, isMock: false };
        }
      }
    } catch { /* fall through */ }
  }
  return { data: null, isMock: true };
}

// ─── Stock screener ───────────────────────────────────────────────────────────

export interface FmpScreenerItem {
  symbol: string;
  companyName: string;
  marketCap: number;
  price: number;
  volume: number;
}

export interface FmpScreenerParams {
  marketCapMoreThan?: number;
  priceMoreThan?: number;
  volumeMoreThan?: number;
  country?: string;
  isActivelyTrading?: boolean;
  limit?: number;
}

export async function fetchScreener(params: FmpScreenerParams): Promise<{ data: FmpScreenerItem[]; isMock: boolean }> {
  const TTL = 60 * 60_000; // 1 hour

  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
  const cacheKey = `fmp:screener:${qs}`;
  const cached = getCached<FmpScreenerItem[]>(cacheKey);
  if (cached) return { data: cached, isMock: false };

  const key = apiKey();
  if (key) {
    try {
      const res = await fetch(`${BASE}/stock-screener?${qs}&apikey=${key}`, { next: { revalidate: 0 } });
      if (res.ok) {
        const data: FmpScreenerItem[] = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setCached(cacheKey, data, TTL);
          return { data, isMock: false };
        }
      }
    } catch { /* fall through */ }
  }
  return { data: [], isMock: true };
}

// ─── Historical OHLCV (daily bars) ───────────────────────────────────────────
// Used as fallback when Finnhub is unavailable (e.g. cloud IP blocks).
// FMP returns bars in reverse-chronological order; we reverse to ascending.

export interface FmpHistoricalBar {
  date: string;  // "YYYY-MM-DD"
  open: number; high: number; low: number; close: number; volume: number;
}

export async function fetchHistoricalPrices(
  symbol: string,
  fromDate: string,   // "YYYY-MM-DD"
  toDate: string,
  maxBars: number
): Promise<{ bars: FmpHistoricalBar[]; isMock: boolean }> {
  const TTL = 30 * 60_000; // 30 minutes

  const cacheKey = `fmp:hist:${symbol}:${fromDate}:${toDate}`;
  const cached = getCached<FmpHistoricalBar[]>(cacheKey);
  if (cached) return { bars: cached, isMock: false };

  const key = apiKey();
  if (key) {
    try {
      const url = `${BASE}/historical-price-full/${symbol}?from=${fromDate}&to=${toDate}&apikey=${key}`;
      const res = await fetch(url, { next: { revalidate: 0 } });
      if (res.ok) {
        const data: { historical?: FmpHistoricalBar[] } = await res.json();
        if (data.historical && data.historical.length > 0) {
          // FMP returns newest-first; reverse to oldest-first, then trim
          const bars = data.historical.slice().reverse().slice(-maxBars);
          setCached(cacheKey, bars, TTL);
          return { bars, isMock: false };
        }
      }
    } catch { /* fall through */ }
  }
  return { bars: [], isMock: true };
}
