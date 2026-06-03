"use client";

import { useEffect, useRef } from "react";

interface Props {
  tvSymbol: string; // e.g. "NASDAQ:NVDA"
}

// Embeds TradingView's "single-quote" widget — same data source as the chart.
// Height of the outer div controls widget height; widget uses autosize internally.
export default function TradingViewSingleQuote({ tvSymbol }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = "";

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-single-quote.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbol: tvSymbol,
      width: "100%",
      locale: "en",
      colorTheme: "dark",
      isTransparent: true,
    });
    el.appendChild(script);

    return () => { el.innerHTML = ""; };
  }, [tvSymbol]);

  return (
    <div
      ref={ref}
      className="tradingview-widget-container"
      style={{ width: "100%", height: "60px", overflow: "hidden" }}
    />
  );
}
