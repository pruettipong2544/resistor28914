"use client";

// useWatchlist — manages user's watchlist and hidden list via localStorage.
// Designed as a single storage layer so future DB/account migration only needs this file changed.

import { useState, useEffect, useCallback } from "react";
import { DEFAULT_STOCKS } from "@/config/stocks";

const KEY_WATCHLIST = "stock_watchlist_v1";
const KEY_HIDDEN = "stock_hidden_v1";

function loadList(key: string, fallback: string[]): string[] {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as string[];
  } catch {}
  return fallback;
}

function saveList(key: string, list: string[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {}
}

export function useWatchlist() {
  const [watchlist, setWatchlistState] = useState<string[]>([]);
  const [hidden, setHiddenState] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage after mount (avoids SSR mismatch)
  useEffect(() => {
    const w = loadList(KEY_WATCHLIST, DEFAULT_STOCKS);
    const h = loadList(KEY_HIDDEN, []);
    setWatchlistState(w);
    setHiddenState(h);
    setHydrated(true);
  }, []);

  const setWatchlist = useCallback((next: string[]) => {
    setWatchlistState(next);
    saveList(KEY_WATCHLIST, next);
  }, []);

  const setHidden = useCallback((next: string[]) => {
    setHiddenState(next);
    saveList(KEY_HIDDEN, next);
  }, []);

  // Add a stock to watchlist (must already be validated by caller)
  const addToWatchlist = useCallback(
    (symbol: string) => {
      const s = symbol.toUpperCase();
      setWatchlist(
        watchlist.includes(s) ? watchlist : [...watchlist, s]
      );
      // Remove from hidden if present
      if (hidden.includes(s)) setHidden(hidden.filter((h) => h !== s));
    },
    [watchlist, hidden, setWatchlist, setHidden]
  );

  // Remove a stock from watchlist and move to hidden
  const hideStock = useCallback(
    (symbol: string) => {
      const s = symbol.toUpperCase();
      setWatchlist(watchlist.filter((w) => w !== s));
      if (!hidden.includes(s)) setHidden([...hidden, s]);
    },
    [watchlist, hidden, setWatchlist, setHidden]
  );

  // Restore from hidden back to watchlist
  const restoreStock = useCallback(
    (symbol: string) => {
      const s = symbol.toUpperCase();
      setHidden(hidden.filter((h) => h !== s));
      if (!watchlist.includes(s)) setWatchlist([...watchlist, s]);
    },
    [watchlist, hidden, setWatchlist, setHidden]
  );

  // Remove from hidden permanently
  const removeHidden = useCallback(
    (symbol: string) => {
      setHidden(hidden.filter((h) => h !== symbol.toUpperCase()));
    },
    [hidden, setHidden]
  );

  // Reset to default seed
  const resetToDefaults = useCallback(() => {
    setWatchlist([...DEFAULT_STOCKS]);
    setHidden([]);
  }, [setWatchlist, setHidden]);

  return {
    watchlist,
    hidden,
    hydrated,
    addToWatchlist,
    hideStock,
    restoreStock,
    removeHidden,
    resetToDefaults,
  };
}
