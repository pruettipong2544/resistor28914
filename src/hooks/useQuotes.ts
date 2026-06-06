"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import type { QuoteData } from "@/types";

const REFRESH_THROTTLE_MS = 15_000; // 15 s — protect Finnhub + Twelve Data quotas

export function useQuotes(symbols: string[]) {
  const [quotes, setQuotes] = useState<Record<string, QuoteData>>({});
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const lastRefreshRef = useRef<number>(0);
  const symbolsKey = symbols.join(",");

  const fetchQuotes = useCallback(async (force = false) => {
    if (symbols.length === 0) return;

    if (force) {
      const now = Date.now();
      if (now - lastRefreshRef.current < REFRESH_THROTTLE_MS) return; // throttled
      lastRefreshRef.current = now;
    }

    setLoading(true);
    setRefreshError(null);
    try {
      const url = `/api/quotes?symbols=${symbolsKey}${force ? "&refresh=1" : ""}`;
      const res = await fetch(url);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        setRefreshError(err.error ?? `HTTP ${res.status}`);
        return;
      }
      setQuotes(await res.json());
      setLastUpdated(new Date());
    } catch (e) {
      if (force) setRefreshError(`เชื่อมต่อไม่ได้: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
    }
  }, [symbolsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchQuotes();
    const id = setInterval(() => fetchQuotes(), 60_000);
    return () => clearInterval(id);
  }, [fetchQuotes]);

  const refresh = useCallback(() => fetchQuotes(true), [fetchQuotes]);

  return { quotes, loading, lastUpdated, refreshError, refresh };
}
