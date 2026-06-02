// Finnhub API client — SERVER-SIDE ONLY.
// API key is read from environment variables and never exposed to the client.

import { getCached, setCached, TTL } from "./cache";
import type { Quote, Candle, Timeframe } from "@/types";

const BASE = "https://finnhub.io/api/v1";

function apiKey(): string {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) throw new Error("FINNHUB_API_KEY is not set in environment variables");
  return key;
}

// Simple sequential request queue to stay well within 60 req/min limit.
// Maintains ~300 ms minimum gap between uncached calls.
let lastCallTime = 0;
async function throttledFetch(url: string): Promise<Response> {
  const now = Date.now();
  const gap = now - lastCallTime;
  if (gap < 300) await new Promise((r) => setTimeout(r, 300 - gap));
  lastCallTime = Date.now();
  const res = await fetch(url, { next: { revalidate: 0 } });
  return res;
}

// --- Company profile (name) ---
interface FinnhubProfile {
  name?: string;
  ticker?: string;
}

async function fetchProfile(symbol: string): Promise<string> {
  const cacheKey = `profile:${symbol}`;
  const cached = getCached<string>(cacheKey);
  if (cached) return cached;

  const url = `${BASE}/stock/profile2?symbol=${symbol}&token=${apiKey()}`;
  const res = await throttledFetch(url);
  if (!res.ok) return symbol;
  const json: FinnhubProfile = await res.json();
  const name = json.name || symbol;
  setCached(cacheKey, name, TTL.PROFILE);
  return name;
}

// --- Quote ---
interface FinnhubQuote {
  c: number;  // current price
  d: number;  // change
  dp: number; // percent change
  h: number;  // high
  l: number;  // low
  o: number;  // open
  pc: number; // prev close
  v?: number; // volume (some endpoints)
  t: number;  // timestamp
}

export async function fetchQuote(symbol: string): Promise<Quote | null> {
  const cacheKey = `quote:${symbol}`;
  const cached = getCached<Quote>(cacheKey);
  if (cached) return cached;

  try {
    const [quoteRes, name] = await Promise.all([
      throttledFetch(`${BASE}/quote?symbol=${symbol}&token=${apiKey()}`),
      fetchProfile(symbol),
    ]);

    if (!quoteRes.ok) return null;
    const q: FinnhubQuote = await quoteRes.json();
    if (!q.c || q.c === 0) return null; // symbol not found / no data

    const quote: Quote = {
      symbol,
      name,
      price: q.c,
      change: q.d,
      changePercent: q.dp,
      high: q.h,
      low: q.l,
      open: q.o,
      prevClose: q.pc,
      volume: q.v ?? 0,
      timestamp: q.t,
    };
    setCached(cacheKey, quote, TTL.QUOTE);
    return quote;
  } catch {
    return null;
  }
}

// --- Candles ---
interface FinnhubCandles {
  c: number[];
  h: number[];
  l: number[];
  o: number[];
  t: number[];
  v: number[];
  s: string; // "ok" or "no_data"
}

// Finnhub free tier reliably supports resolution "D" (daily) for all US stocks.
// Intraday resolutions (1, 5, 15, 30, 60) are not guaranteed on free tier and
// often return no_data for small-cap/newer tickers. All timeframes use daily bars.
//
// Candle counts per timeframe:
//   1D → last 10 calendar days  (~5–7 trading days)
//   1W → last 21 calendar days  (~10–15 trading days)
//   1M → last 45 calendar days  (~30 trading days)
//   1Y → last 400 calendar days (~252 trading days)
// Buffers are added to account for weekends and public holidays.

const TTL_MAP: Record<Timeframe, number> = {
  "1D": TTL.CANDLE_1D,
  "1W": TTL.CANDLE_1W,
  "1M": TTL.CANDLE_1M,
  "1Y": TTL.CANDLE_1Y,
};

// How many calendar days to look back per timeframe (with weekend/holiday buffer)
const LOOKBACK_DAYS: Record<Timeframe, number> = {
  "1D": 10,
  "1W": 21,
  "1M": 45,
  "1Y": 400,
};

// Max candles to keep per timeframe after fetching (trim to relevant window)
const MAX_CANDLES: Record<Timeframe, number> = {
  "1D": 7,
  "1W": 15,
  "1M": 30,
  "1Y": 252,
};

function timeRange(timeframe: Timeframe): { from: number; to: number } {
  const to = Math.floor(Date.now() / 1000);
  const from = to - LOOKBACK_DAYS[timeframe] * 86400;
  return { from, to };
}

export async function fetchCandles(
  symbol: string,
  timeframe: Timeframe
): Promise<Candle[]> {
  const cacheKey = `candles:${symbol}:${timeframe}`;
  const cached = getCached<Candle[]>(cacheKey);
  if (cached) return cached;

  const { from, to } = timeRange(timeframe);
  // Always use daily resolution — reliably supported on Finnhub free tier
  const url = `${BASE}/stock/candle?symbol=${symbol}&resolution=D&from=${from}&to=${to}&token=${apiKey()}`;

  try {
    const res = await throttledFetch(url);
    if (!res.ok) return [];
    const data: FinnhubCandles = await res.json();
    if (data.s !== "ok" || !data.c?.length) return [];

    const candles: Candle[] = data.t.map((t, i) => ({
      time: t,
      open: data.o[i],
      high: data.h[i],
      low: data.l[i],
      close: data.c[i],
      volume: data.v[i],
    }));

    // Trim to the most relevant recent candles for this timeframe
    const trimmed = candles.slice(-MAX_CANDLES[timeframe]);
    setCached(cacheKey, trimmed, TTL_MAP[timeframe]);
    return trimmed;
  } catch {
    return [];
  }
}

// --- Validate ticker ---
export async function validateTicker(
  symbol: string
): Promise<{ valid: boolean; name: string }> {
  const url = `${BASE}/stock/profile2?symbol=${symbol}&token=${apiKey()}`;
  try {
    const res = await throttledFetch(url);
    if (!res.ok) return { valid: false, name: "" };
    const json: FinnhubProfile = await res.json();
    if (!json.name) return { valid: false, name: "" };
    // Cache the profile while we're at it
    setCached(`profile:${symbol}`, json.name, TTL.PROFILE);
    return { valid: true, name: json.name };
  } catch {
    return { valid: false, name: "" };
  }
}
