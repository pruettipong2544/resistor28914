"use client";

import { useEffect, useRef } from "react";
import type { Timeframe } from "@/types";

export type TvStudyId = string | { id: string; inputs?: Record<string, unknown> };

interface Props {
  tvSymbol: string;
  timeframe: Timeframe;
  studies?: TvStudyId[];
}

const TF_CONFIG: Record<Timeframe, { range: string; interval: string }> = {
  "1D": { range: "1D",  interval: "30" },
  "1W": { range: "5D",  interval: "60" },
  "1M": { range: "1M",  interval: "D"  },
  "1Y": { range: "12M", interval: "W"  },
};

// TV study IDs verified 2025:
//   RSI:               RSI@tv-basicstudies
//   MACD:              MACD@tv-basicstudies
//   EMA (custom len):  { id:"MAExp@tv-basicstudies", inputs:{ length:N } }
//   Pivot Pts Std:     PivotPointsStandard@tv-basicstudies
//   Linear Regression: LinearRegression@tv-basicstudies
export default function TradingViewChart({ tvSymbol, timeframe, studies = ["RSI@tv-basicstudies"] }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Inner widget div must fill 100% so autosize picks up parent height
    const widgetDiv = document.createElement("div");
    widgetDiv.className = "tradingview-widget-container__widget";
    widgetDiv.style.cssText = "height:100%;width:100%;";
    container.appendChild(widgetDiv);

    const { range, interval } = TF_CONFIG[timeframe];
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;
    // autosize:true reads the CSS height of the container — do NOT pass a fixed height here
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
  }, []);

  // height/width:100% so the chart fills whatever CSS height the parent sets
  return (
    <div
      ref={containerRef}
      className="tradingview-widget-container"
      style={{ height: "100%", width: "100%" }}
    />
  );
}
