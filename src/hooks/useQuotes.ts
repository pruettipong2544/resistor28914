"use client";
import { useState, useEffect, useCallback } from "react";
import type { QuoteData } from "@/types";

export function useQuotes(symbols: string[]) {
  const [quotes, setQuotes] = useState<Record<string, QuoteData>>({});
  const [loading, setLoading] = useState(false);

  const fetch_ = useCallback(async () => {
    if (symbols.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/quotes?symbols=${symbols.join(",")}`);
      if (res.ok) setQuotes(await res.json());
    } finally {
      setLoading(false);
    }
  }, [symbols.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetch_();
    const id = setInterval(fetch_, 60_000);
    return () => clearInterval(id);
  }, [fetch_]);

  return { quotes, loading };
}
