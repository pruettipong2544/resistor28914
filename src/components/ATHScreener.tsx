"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  onSelectSymbol: (symbol: string) => void;
}

export default function ATHScreener({ onSelectSymbol: _onSelectSymbol }: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !containerRef.current) return;

    const container = containerRef.current;
    container.innerHTML = ""; // clear any stale content from previous open

    const wrapper = document.createElement("div");
    wrapper.className = "tradingview-widget-container";
    wrapper.style.cssText = "width:100%;height:490px;";

    const inner = document.createElement("div");
    inner.className = "tradingview-widget-container__widget";
    inner.style.cssText = "width:100%;height:490px;";
    wrapper.appendChild(inner);

    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-screener.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      width: "100%",
      height: 490,
      defaultColumn: "overview",
      defaultScreen: "most_capitalized",
      market: "america",
      showToolbar: true,
      colorTheme: "dark",
      locale: "en",
    });
    wrapper.appendChild(script);

    container.appendChild(wrapper);
  }, [open]);

  return (
    <div className="border border-slate-700 rounded-2xl overflow-hidden">
      {/* Header / toggle */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-800 hover:bg-slate-750 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white">ATH Pullback Screener</span>
          <span className="text-[10px] text-slate-500 border border-slate-600 px-1.5 py-0.5 rounded">
            US stocks · TradingView
          </span>
        </div>
        <span className={`text-slate-400 text-xs transition-transform ${open ? "rotate-180" : ""}`}>▼</span>
      </button>

      {open && (
        <div className="bg-slate-800/50 px-4 pb-4 pt-3 space-y-3">
          <p className="text-[11px] text-slate-500">
            TradingView Screener (US) · คลิก header คอลัมน์ <span className="text-slate-300">% from 52wk High</span> เพื่อเรียงจาก pullback มากไปน้อย ·
            กดปุ่ม <span className="text-slate-300">Filters</span> ใน widget เพื่อกรอง exchange / market cap / volume
          </p>

          {/* Widget container — explicit height required for iframe to render */}
          <div
            ref={containerRef}
            style={{ height: 490 }}
          />

          <p className="text-[10px] text-slate-600">
            ข้อมูลจาก TradingView · การกรองเป็นเชิงกล ไม่ใช่คำแนะนำการลงทุน — ต้องวิเคราะห์เพิ่มก่อนตัดสินใจ
          </p>
        </div>
      )}
    </div>
  );
}
