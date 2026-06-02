// Finnhub API client — SERVER-SIDE ONLY.
// API key is read from environment variables and never exposed to the client.

import { getCached, setCached, TTL } from "./cache";
import type { Candle, Timeframe } from "@/types";

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
// All timeframes use daily bars. Lookback with buffer for weekends/holidays.
const TTL_MAP: Record<Timeframe, number> = {
  "1D": TTL.CANDLE_1D,
  "1W": TTL.CANDLE_1W,
  "1M": TTL.CANDLE_1M,
  "1Y": TTL.CANDLE_1Y,
};

const LOOKBACK_DAYS: Record<Timeframe, number> = {
  "1D": 10,
  "1W": 21,
  "1M": 45,
  "1Y": 400,
};

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

// --- Mock candle generator ---
// Deterministic price anchor — same symbol always yields the same price,
// so the pivot points panel and any UI references stay consistent.
function mockSeedPrice(symbol: string): number {
  const seed = symbol.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  let rng = (seed * 69069 + 1) >>> 0;
  const rand = () => { rng = (rng * 1664525 + 1013904223) & 0xffffffff; return (rng >>> 0) / 0xffffffff; };
  const base = (seed % 280) + 20;
  return parseFloat((base * (0.85 + rand() * 0.3)).toFixed(2));
}

function mockCandles(symbol: string, timeframe: Timeframe): Candle[] {
  const targetPrice = mockSeedPrice(symbol);
  const seed = symbol.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  let rng = (seed * 1566083941 + 1) >>> 0;
  const rand = () => { rng = (rng * 1664525 + 1013904223) & 0xffffffff; return (rng >>> 0) / 0xffffffff; };

  const now = Math.floor(Date.now() / 1000);

  let times: number[];
  if (timeframe === "1D") {
    const BAR = 1800;
    times = Array.from({ length: 13 }, (_, i) => now - (12 - i) * BAR);
  } else {
    const count = MAX_CANDLES[timeframe];
    times = [];
    let d = now;
    while (times.length < count) {
      const dow = new Date(d * 1000).getDay();
      if (dow !== 0 && dow !== 6) times.unshift(d);
      d -= 86400;
    }
  }

  const volPerBar = timeframe === "1D" ? 0.003 : timeframe === "1W" ? 0.012 : 0.015;

  let price = targetPrice;
  const raw: Candle[] = [];
  for (const time of times) {
    const open = price;
    const move = (rand() - 0.48) * volPerBar * price;
    price = Math.max(0.01, price + move);
    const swing = rand() * volPerBar * 0.4 * price;
    raw.push({
      time,
      open,
      high: Math.max(open, price) + swing,
      low: Math.min(open, price) - swing,
      close: price,
      volume: Math.floor(rand() * 5_000_000 + 500_000),
    });
  }

  // Scale so last close == targetPrice
  const scale = targetPrice / raw[raw.length - 1].close;
  return raw.map((c) => ({
    ...c,
    open: parseFloat((c.open * scale).toFixed(4)),
    high: parseFloat((c.high * scale).toFixed(4)),
    low: parseFloat((c.low * scale).toFixed(4)),
    close: parseFloat((c.close * scale).toFixed(4)),
  }));
}

export async function fetchCandles(
  symbol: string,
  timeframe: Timeframe
): Promise<{ candles: Candle[]; isMock: boolean }> {
  const cacheKey = `candles:${symbol}:${timeframe}`;
  const cached = getCached<{ candles: Candle[]; isMock: boolean }>(cacheKey);
  if (cached) return cached;

  const { from, to } = timeRange(timeframe);
  const url = `${BASE}/stock/candle?symbol=${symbol}&resolution=D&from=${from}&to=${to}&token=${apiKey()}`;

  try {
    const res = await throttledFetch(url);
    if (res.ok) {
      const text = await res.text();
      if (text.startsWith("{")) {
        const data: FinnhubCandles = JSON.parse(text);
        if (data.s === "ok" && data.c?.length) {
          const candles = data.t
            .map((t, i) => ({
              time: t,
              open: data.o[i],
              high: data.h[i],
              low: data.l[i],
              close: data.c[i],
              volume: data.v[i],
            }))
            .slice(-MAX_CANDLES[timeframe]);
          const result = { candles, isMock: false };
          setCached(cacheKey, result, TTL_MAP[timeframe]);
          return result;
        }
      }
    }
  } catch {
    // fall through to mock
  }

  const result = { candles: mockCandles(symbol, timeframe), isMock: true };
  setCached(cacheKey, result, 60_000);
  return result;
}

// --- Validate ticker ---
export async function validateTicker(
  symbol: string
): Promise<{ valid: boolean; name: string }> {
  const url = `${BASE}/stock/profile2?symbol=${symbol}&token=${apiKey()}`;
  try {
    const res = await throttledFetch(url);
    if (!res.ok) return { valid: true, name: symbol }; // mock fallback
    const json: FinnhubProfile = await res.json();
    if (!json.name) return { valid: true, name: symbol }; // mock fallback
    setCached(`profile:${symbol}`, json.name, TTL.PROFILE);
    return { valid: true, name: json.name };
  } catch {
    return { valid: true, name: symbol }; // mock fallback
  }
}
