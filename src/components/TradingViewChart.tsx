"use client";

import { useEffect, useRef } from "react";
import type { Timeframe } from "@/types";

interface Props {
  tvSymbol: string;  // e.g., "NASDAQ:AAPL"
  timeframe: Timeframe;
  height?: number;
}

// Maps our timeframe tabs to TradingView range + bar interval
const TF_CONFIG: Record<Timeframe, { range: string; interval: string }> = {
  "1D": { range: "1D",  interval: "30"  }, // today, 30-min bars
  "1W": { range: "5D",  interval: "60"  }, // 5 days, hourly bars
  "1M": { range: "1M",  interval: "D"   }, // 1 month, daily bars
  "1Y": { range: "12M", interval: "W"   }, // 1 year, weekly bars
};

// Re-mounts when tvSymbol or timeframe changes (via key prop at call site).
export default function TradingViewChart({ tvSymbol, timeframe, height = 450 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const { range, interval } = TF_CONFIG[timeframe];

    const widgetDiv = document.createElement("div");
    widgetDiv.className = "tradingview-widget-container__widget";
    container.appendChild(widgetDiv);

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: tvSymbol,
      interval,
      range,
      timezone: "America/New_York",
      theme: "dark",
      style: "1",
      locale: "en",
      hide_top_toolbar: false,
      save_image: false,
      studies: ["STD;RSI"],
      support_host: "https://www.tradingview.com",
    });
    container.appendChild(script);

    return () => { container.innerHTML = ""; };
  }, []); // deps intentionally empty — parent controls re-mount via key

  return (
    <div
      ref={containerRef}
      className="tradingview-widget-container w-full"
      style={{ height }}
    />
  );
}
