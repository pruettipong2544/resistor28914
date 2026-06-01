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

const RESOLUTION_MAP: Record<Timeframe, string> = {
  "1D": "5",
  "1W": "60",
  "1M": "D",
  "1Y": "D",
};

const TTL_MAP: Record<Timeframe, number> = {
  "1D": TTL.CANDLE_1D,
  "1W": TTL.CANDLE_1W,
  "1M": TTL.CANDLE_1M,
  "1Y": TTL.CANDLE_1Y,
};

function timeRange(timeframe: Timeframe): { from: number; to: number } {
  const to = Math.floor(Date.now() / 1000);
  const DAY = 86400;
  const from =
    timeframe === "1D" ? to - DAY :
    timeframe === "1W" ? to - 7 * DAY :
    timeframe === "1M" ? to - 30 * DAY :
    to - 365 * DAY;
  return { from, to };
}

export async function fetchCandles(
  symbol: string,
  timeframe: Timeframe
): Promise<Candle[]> {
  const cacheKey = `candles:${symbol}:${timeframe}`;
  const cached = getCached<Candle[]>(cacheKey);
  if (cached) return cached;

  const resolution = RESOLUTION_MAP[timeframe];
  const { from, to } = timeRange(timeframe);
  const url = `${BASE}/stock/candle?symbol=${symbol}&resolution=${resolution}&from=${from}&to=${to}&token=${apiKey()}`;

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

    setCached(cacheKey, candles, TTL_MAP[timeframe]);
    return candles;
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
