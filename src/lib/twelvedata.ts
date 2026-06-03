// Twelve Data API client — SERVER-SIDE ONLY.
// Free plan: 800 req/day, ~8 req/min.
// We only fetch when a user opens a stock detail (per-symbol, on-demand),
// and cache aggressively (daily bars change at most once per day).

import { getCached, setCached } from "./cache";
import type { Candle } from "@/types";

const BASE = "https://api.twelvedata.com";

function apiKey(): string | null {
  return process.env.TWELVEDATA_API_KEY ?? null;
}

// Cache daily bars for 1 hour — data is EOD and won't change within the day.
const CACHE_TTL = 60 * 60_000;

interface TwelveDataValue {
  datetime: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
}

interface TwelveDataResponse {
  status: string;
  code?: number;
  message?: string;
  values?: TwelveDataValue[];
}

function tdReason(res: TwelveDataResponse, httpStatus: number): string {
  if (httpStatus === 401 || res.code === 401) return `HTTP 401 — invalid TWELVEDATA_API_KEY`;
  if (httpStatus === 429 || res.code === 429) return `HTTP 429 — Twelve Data rate limit`;
  if (res.code === 400) return `400 — bad request: ${res.message ?? "unknown"}`;
  if (res.message) return `code ${res.code ?? httpStatus}: ${res.message}`;
  return `HTTP ${httpStatus}`;
}

export async function fetchTwelveDataCandles(
  symbol: string,
  outputsize = 400
): Promise<{ candles: Candle[]; isMock: boolean; reason?: string }> {
  const cacheKey = `td:candles:${symbol}:${outputsize}`;
  const cached = getCached<Candle[]>(cacheKey);
  if (cached) return { candles: cached, isMock: false };

  const key = apiKey();
  if (!key) {
    console.log(`[twelvedata:candles:${symbol}] skip — missing TWELVEDATA_API_KEY`);
    return { candles: [], isMock: true, reason: "missing TWELVEDATA_API_KEY" };
  }

  const url = `${BASE}/time_series?symbol=${symbol}&interval=1day&outputsize=${outputsize}&apikey=${key}`;
  try {
    const res = await fetch(url, { next: { revalidate: 0 } });
    const json: TwelveDataResponse = await res.json();

    if (!res.ok || json.status === "error") {
      const reason = tdReason(json, res.status);
      console.log(`[twelvedata:candles:${symbol}] fail — ${reason}`);
      return { candles: [], isMock: true, reason };
    }

    if (!json.values || json.values.length === 0) {
      console.log(`[twelvedata:candles:${symbol}] fail — empty values`);
      return { candles: [], isMock: true, reason: "empty values" };
    }

    // API returns newest → oldest; reverse to oldest → newest for indicators
    const candles: Candle[] = json.values
      .slice()
      .reverse()
      .map((v) => ({
        time: Math.floor(new Date(v.datetime).getTime() / 1000),
        open:   parseFloat(v.open),
        high:   parseFloat(v.high),
        low:    parseFloat(v.low),
        close:  parseFloat(v.close),
        volume: parseFloat(v.volume),
      }));

    console.log(`[twelvedata:candles:${symbol}] ok — ${candles.length} bars`);
    setCached(cacheKey, candles, CACHE_TTL);
    return { candles, isMock: false };
  } catch (e) {
    const reason = `network error — ${e instanceof Error ? e.message : String(e)}`;
    console.log(`[twelvedata:candles:${symbol}] fail — ${reason}`);
    return { candles: [], isMock: true, reason };
  }
}

export async function probeTwelveData(symbol: string): Promise<{ ok: boolean; reason: string }> {
  const key = apiKey();
  if (!key) return { ok: false, reason: "missing TWELVEDATA_API_KEY" };
  try {
    // Use outputsize=1 to minimise quota usage for health probes
    const url = `${BASE}/time_series?symbol=${symbol}&interval=1day&outputsize=1&apikey=${key}`;
    const res = await fetch(url, { next: { revalidate: 0 } });
    const json: TwelveDataResponse = await res.json();
    if (!res.ok || json.status === "error") {
      return { ok: false, reason: tdReason(json, res.status) };
    }
    return { ok: true, reason: "ok" };
  } catch (e) {
    return { ok: false, reason: `network error — ${e instanceof Error ? e.message : String(e)}` };
  }
}
