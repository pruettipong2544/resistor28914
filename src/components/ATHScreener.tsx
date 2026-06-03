"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  onSelectSymbol: (symbol: string) => void;
}

export default function ATHScreener({ onSelectSymbol: _onSelectSymbol }: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const mounted = useRef(false);

  useEffect(() => {
    if (!open || mounted.current || !containerRef.current) return;
    mounted.current = true;

    const wrapper = document.createElement("div");
    wrapper.className = "tradingview-widget-container";
    wrapper.style.cssText = "width:100%;height:100%;";

    const inner = document.createElement("div");
    inner.className = "tradingview-widget-container__widget";
    inner.style.cssText = "width:100%;height:100%;";
    wrapper.appendChild(inner);

    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-screener.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      width: "100%",
      height: 550,
      defaultColumn: "performance",    // shows % from 52wk High column
      defaultScreen: "most_capitalized",
      market: "america",
      showToolbar: true,
      colorTheme: "dark",
      locale: "en",
      isTransparent: true,
    });
    wrapper.appendChild(script);

    containerRef.current.appendChild(wrapper);
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
            US stocks · เรียง % จาก 52wk High ใน widget
          </span>
        </div>
        <span className={`text-slate-400 text-xs transition-transform ${open ? "rotate-180" : ""}`}>▼</span>
      </button>

      {open && (
        <div className="bg-slate-800/50 px-4 pb-4 pt-3 space-y-3">
          {/* Usage hint */}
          <p className="text-[11px] text-slate-500">
            ข้างล่างคือ TradingView Screener (US) — view <span className="text-slate-300 font-medium">Performance</span> แสดงคอลัมน์
            <span className="text-slate-300"> % from 52wk High</span> ·
            คลิก header คอลัมน์นั้นเพื่อเรียงจากมากไปน้อย (pullback สูงสุด) ·
            กรองเพิ่มได้ด้วยปุ่ม <span className="text-slate-300">Filters</span> ใน widget
          </p>

          {/* TradingView Screener widget */}
          <div
            ref={containerRef}
            style={{ minHeight: 560 }}
            className="rounded-xl overflow-hidden"
          />

          <p className="text-[10px] text-slate-600">
            ข้อมูลจาก TradingView · การกรองเป็นเชิงกล ไม่ใช่คำแนะนำการลงทุน — ต้องวิเคราะห์เพิ่มก่อนตัดสินใจ
          </p>
        </div>
      )}
    </div>
  );
}
