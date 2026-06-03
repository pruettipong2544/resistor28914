"use client";

import { useEffect, useRef } from "react";
import type { Timeframe } from "@/types";

// Study ID type: plain string ID or object with custom inputs
export type TvStudyId = string | { id: string; inputs?: Record<string, unknown> };

interface Props {
  tvSymbol: string;
  timeframe: Timeframe;
  studies?: TvStudyId[];  // passed from parent; re-mount via key to apply changes
  height?: number;
}

// Maps our timeframe tabs to TradingView range + bar interval
const TF_CONFIG: Record<Timeframe, { range: string; interval: string }> = {
  "1D": { range: "1D",  interval: "30" },
  "1W": { range: "5D",  interval: "60" },
  "1M": { range: "1M",  interval: "D"  },
  "1Y": { range: "12M", interval: "W"  },
};

// TradingView Advanced Chart widget.
// Re-mounts when tvSymbol, timeframe, or studies change (via key prop at call site).
// Study IDs use "@tv-basicstudies" format — verified IDs as of 2025:
//   RSI:               "RSI@tv-basicstudies"
//   MACD:              "MACD@tv-basicstudies"
//   EMA (period):      { id: "MAExp@tv-basicstudies", inputs: { length: N } }
//   Pivot Pts Std:     "PivotPointsStandard@tv-basicstudies"
//   Linear Regression: "LinearRegression@tv-basicstudies"
export default function TradingViewChart({
  tvSymbol,
  timeframe,
  studies = ["RSI@tv-basicstudies"],
  height = 550,
}: Props) {
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
      studies,
      support_host: "https://www.tradingview.com",
    });
    container.appendChild(script);

    return () => { container.innerHTML = ""; };
  }, []); // deps empty — parent controls re-mount via key

  return (
    <div
      ref={containerRef}
      className="tradingview-widget-container w-full"
      style={{ height }}
    />
  );
}
