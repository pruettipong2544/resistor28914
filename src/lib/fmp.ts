// Financial Modeling Prep API client — SERVER-SIDE ONLY.
// Uses the stable API (https://financialmodelingprep.com/stable/) exclusively.
// v3/legacy endpoints were deprecated and closed for new accounts after Aug 2025.

import { getCached, setCached } from "./cache";

const BASE = "https://financialmodelingprep.com/stable";

function apiKey(): string | null {
  return process.env.FMP_API_KEY ?? null;
}

// ─── Shared mock seed (LCG) ───────────────────────────────────────────────────

export function mockSeed(symbol: string): { price: number; rand: () => number } {
  const seed = symbol.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  let rng = (seed * 69069 + 1) >>> 0;
  const rand = () => { rng = (rng * 1664525 + 1013904223) & 0xffffffff; return (rng >>> 0) / 0xffffffff; };
  const base = (seed % 280) + 20;
  const price = parseFloat((base * (0.85 + rand() * 0.3)).toFixed(2));
  return { price, rand };
}

function fmpHttpReason(status: number): string {
  if (status === 401 || status === 403) return `HTTP ${status} — invalid or unauthorised FMP_API_KEY`;
  if (status === 429) return `HTTP 429 — FMP rate limited`;
  if (status === 402) return `HTTP 402 — endpoint not available in your FMP plan`;
  return `HTTP ${status}`;
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
  extendedPrice?: number;
  extendedChange?: number;
  extendedChangePercent?: number;
  extendedPriceTimestamp?: number; // unix seconds
}

export async function fetchQuotes(symbols: string[]): Promise<{ data: FmpQuoteItem[]; isMock: boolean }> {
  const TTL = 60_000; // 1 minute

  const cacheKey = `fmp:quotes:${symbols.slice().sort().join(",")}`;
  const cached = getCached<FmpQuoteItem[]>(cacheKey);
  if (cached) return { data: cached, isMock: false };

  const key = apiKey();
  if (!key) {
    console.log(`[fmp:quote] skip — missing FMP_API_KEY`);
  } else {
    try {
      const joined = symbols.join(",");
      const res = await fetch(`${BASE}/quote?symbol=${joined}&apikey=${key}`, { next: { revalidate: 0 } });
      if (res.ok) {
        const data: FmpQuoteItem[] = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          console.log(`[fmp:quote] ok — ${data.length}/${symbols.length} symbols`);
          setCached(cacheKey, data, TTL);
          return { data, isMock: false };
        }
        console.log(`[fmp:quote] fail — empty response for [${symbols.join(",")}]`);
      } else {
        console.log(`[fmp:quote] fail — ${fmpHttpReason(res.status)}`);
      }
    } catch (e) {
      console.log(`[fmp:quote] fail — network error: ${e instanceof Error ? e.message : String(e)}`);
    }
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

// ─── Price (lightweight, used by DCF route) ──────────────────────────────────

export async function fetchPrice(symbol: string): Promise<number> {
  const key = apiKey();
  if (key) {
    try {
      const res = await fetch(`${BASE}/quote-short?symbol=${symbol}&apikey=${key}`, { next: { revalidate: 0 } });
      if (res.ok) {
        const data: { price?: number }[] = await res.json();
        if (data[0]?.price) return data[0].price;
      }
    } catch { /* fall through */ }
  }
  return mockSeed(symbol).price;
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
  exchange?: string;
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
      const res = await fetch(`${BASE}/company-screener?${qs}&apikey=${key}`, { next: { revalidate: 0 } });
      if (res.ok) {
        const data: FmpScreenerItem[] = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setCached(cacheKey, data, TTL);
          return { data, isMock: false };
        }
        console.log(`[fmp:screener] fail — empty response`);
      } else {
        console.log(`[fmp:screener] fail — ${fmpHttpReason(res.status)}`);
      }
    } catch (e) {
      console.log(`[fmp:screener] fail — network error: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return { data: [], isMock: true };
}

// ─── Historical OHLCV (daily EOD bars) ───────────────────────────────────────
// Primary data source for candles / pivot points / signals.
// FMP returns newest-first; we reverse to ascending chronological order.

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
  if (!key) {
    console.log(`[fmp:hist:${symbol}] skip — missing FMP_API_KEY`);
    return { bars: [], isMock: true };
  }

  const url = `${BASE}/historical-price-eod/full?symbol=${symbol}&from=${fromDate}&to=${toDate}&apikey=${key}`;
  try {
    const res = await fetch(url, { next: { revalidate: 0 } });
    if (!res.ok) {
      console.log(`[fmp:hist:${symbol}] fail — ${fmpHttpReason(res.status)}`);
      return { bars: [], isMock: true };
    }
    const raw: unknown = await res.json();
    // Stable returns flat array: [{date,open,high,low,close,volume}]
    // v3 wrapper shape [{historical:[...]}] should not appear but handle it anyway
    let parsed: FmpHistoricalBar[] | null = null;
    if (Array.isArray(raw) && raw.length > 0 && "date" in (raw[0] as object)) {
      parsed = raw as FmpHistoricalBar[];
    } else {
      const obj = raw as { historical?: FmpHistoricalBar[] };
      if (obj?.historical?.length) parsed = obj.historical;
    }
    if (!parsed) {
      console.log(`[fmp:hist:${symbol}] fail — unrecognised response shape`);
      return { bars: [], isMock: true };
    }
    const bars = parsed.slice().reverse().slice(-maxBars);
    console.log(`[fmp:hist:${symbol}] ok — ${bars.length} bars`);
    setCached(cacheKey, bars, TTL);
    return { bars, isMock: false };
  } catch (e) {
    console.log(`[fmp:hist:${symbol}] fail — network error: ${e instanceof Error ? e.message : String(e)}`);
    return { bars: [], isMock: true };
  }
}

// ─── Health probe (used by /api/health) ──────────────────────────────────────

export async function probeFmp(symbol: string): Promise<{ ok: boolean; price?: number; reason: string }> {
  const key = apiKey();
  if (!key) return { ok: false, reason: "missing FMP_API_KEY" };
  try {
    const res = await fetch(`${BASE}/quote-short?symbol=${symbol}&apikey=${key}`, { next: { revalidate: 0 } });
    if (!res.ok) return { ok: false, reason: fmpHttpReason(res.status) };
    const data: { price?: number }[] = await res.json();
    const price = data[0]?.price;
    if (!price) return { ok: false, reason: "empty response" };
    return { ok: true, price, reason: "ok" };
  } catch (e) {
    return { ok: false, reason: `network error — ${e instanceof Error ? e.message : String(e)}` };
  }
}
