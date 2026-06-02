"use client";

import { useEffect, useRef } from "react";
import { getTvSymbol, getCompanyName } from "@/config/stocks";

interface Props {
  symbols: string[];  // plain tickers from watchlist, e.g., ["AAPL", "TSLA"]
}

// Re-mounts when the symbols list changes (via key={symbols.join(",")} at call site).
export default function TradingViewTickerTape({ symbols }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !symbols.length) return;

    const widgetDiv = document.createElement("div");
    widgetDiv.className = "tradingview-widget-container__widget";
    container.appendChild(widgetDiv);

    const tvSymbols = symbols.map((s) => ({
      proName: getTvSymbol(s),
      title: getCompanyName(s),
    }));

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbols: tvSymbols,
      showSymbolLogo: true,
      isTransparent: true,
      displayMode: "adaptive",
      colorTheme: "dark",
      locale: "en",
    });
    container.appendChild(script);

    return () => { container.innerHTML = ""; };
  }, []);

  return (
    <div ref={containerRef} className="tradingview-widget-container w-full" />
  );
}
