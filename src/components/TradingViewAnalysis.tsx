"use client";

import { useEffect, useRef } from "react";
import type { Timeframe } from "@/types";

interface Props {
  tvSymbol: string;
  timeframe: Timeframe;
}

const TF_INTERVAL: Record<Timeframe, string> = {
  "1D": "1D",
  "1W": "1W",
  "1M": "1M",
  "1Y": "12M",
};

// Re-mounts when tvSymbol or timeframe changes (via key prop at call site).
export default function TradingViewAnalysis({ tvSymbol, timeframe }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const widgetDiv = document.createElement("div");
    widgetDiv.className = "tradingview-widget-container__widget";
    container.appendChild(widgetDiv);

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-technical-analysis.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      interval: TF_INTERVAL[timeframe],
      width: "100%",
      isTransparent: true,
      height: 400,
      symbol: tvSymbol,
      showIntervalTabs: true,
      displayMode: "single",
      locale: "en",
      colorTheme: "dark",
    });
    container.appendChild(script);

    return () => { container.innerHTML = ""; };
  }, []);

  return (
    <div ref={containerRef} className="tradingview-widget-container w-full" />
  );
}
