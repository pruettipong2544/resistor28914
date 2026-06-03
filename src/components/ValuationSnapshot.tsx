"use client";

import { useEffect, useRef } from "react";
import type { ValuationType } from "@/config/stocks";
import type { QuoteData } from "@/types";

interface Props {
  symbol: string;
  tvSymbol: string;
  valuationType: ValuationType;
  quote: QuoteData | null;
}

interface ContextNote {
  badge: string;
  badgeColor: string;
  headline: string;
  focus: string[];
  caveat?: string;
}

const CONTEXT: Record<ValuationType, ContextNote> = {
  profitable: {
    badge: "Profitable",
    badgeColor: "bg-green-900/40 border-green-700/40 text-green-400",
    headline: "หุ้นมีกำไรสม่ำเสมอ — ใช้ multiple เปรียบเทียบได้",
    focus: [
      "P/E — เทียบกับ sector peer และค่าในอดีตของตัวเอง",
      "PEG — P/E ÷ อัตราเติบโต EPS (< 1 ถือว่า cheap โดยหยาบ)",
      "EV/EBITDA — ดีกว่า P/E ตอนมี leverage สูง",
      "P/FCF — ฟรีแคชโฟว์สำคัญกว่า reported earnings",
    ],
  },
  growth: {
    badge: "Growth",
    badgeColor: "bg-sky-900/40 border-sky-700/40 text-sky-400",
    headline: "หุ้นเติบโต — P/E อาจสูงหรือใช้ไม่ได้ถ้ายังขาดทุน",
    focus: [
      "EV/Sales — multiple หลักสำหรับหุ้นที่ยังไม่มี EBITDA บวก",
      "Revenue growth YoY — ยิ่งโตเร็ว premium ยิ่งสูง",
      "Gross margin — บอก pricing power และ unit economics",
      "Path to profitability — Operating leverage ในงบล่าสุด",
    ],
  },
  preRevenue: {
    badge: "Pre-Revenue",
    badgeColor: "bg-amber-900/40 border-amber-700/40 text-amber-400",
    headline: "รายได้น้อย/แทบไม่มี — multiple ใช้ประเมินค่าไม่ได้",
    focus: [
      "Market cap vs เงินสดคงเหลือ — dilution risk สูงแค่ไหน",
      "Cash runway — เผาเงินอยู่ที่ไหน จะ raise fund อีกเมื่อไร",
      "Analyst price target — consensus ที่มีข้อมูลเชิงลึกกว่า",
      "Milestones & timeline — มูลค่าอิงโอกาสในอนาคต ไม่ใช่ตัวเลขปัจจุบัน",
    ],
    caveat: "หุ้นกลุ่มนี้มูลค่าขึ้นอยู่กับ 'เรื่องราว' และ catalysts มากกว่า fundamentals — ความเสี่ยงสูงมาก",
  },
};

export default function ValuationSnapshot({ symbol, tvSymbol, valuationType, quote }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const ctx = CONTEXT[valuationType];

  // Pullback from 52-week high (from Finnhub/FMP quote data)
  const hasYearHigh = quote && !quote.isMock;
  // Quote doesn't carry yearHigh directly — we show it from the TV widget.
  // We compute pullback only if the parent passed yearHigh (via screener data).
  // For now surface what we have: show the quote price vs what TV widget shows.

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = "";

    const wrapper = document.createElement("div");
    wrapper.className = "tradingview-widget-container";
    wrapper.style.cssText = "width:100%;height:100%;";

    const inner = document.createElement("div");
    inner.className = "tradingview-widget-container__widget";
    inner.style.cssText = "width:100%;height:100%;";
    wrapper.appendChild(inner);

    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-symbol-info.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbol: tvSymbol,
      width: "100%",
      locale: "en",
      colorTheme: "dark",
      isTransparent: true,
    });
    wrapper.appendChild(script);

    containerRef.current.appendChild(wrapper);
  }, [tvSymbol]);

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-slate-700/60 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-white">Valuation Snapshot</h3>
            <span className="text-[10px] text-slate-500 font-mono">{symbol}</span>
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${ctx.badgeColor}`}>
              {ctx.badge}
            </span>
          </div>
          <p className="text-xs text-slate-400">{ctx.headline}</p>
        </div>
      </div>

      {/* TradingView Symbol Info widget */}
      <div ref={containerRef} style={{ minHeight: 120 }} />

      {/* Context note — what to focus on for this valuation type */}
      <div className="px-4 py-3 border-t border-slate-700/60 space-y-2">
        <p className="text-[11px] font-medium text-slate-300">
          {valuationType === "preRevenue" ? "แทน multiple — ดูสิ่งเหล่านี้:" : "โฟกัส:"}
        </p>
        <ul className="space-y-1">
          {ctx.focus.map((item, i) => (
            <li key={i} className="flex items-start gap-1.5 text-[11px] text-slate-400">
              <span className="text-slate-600 mt-0.5 flex-shrink-0">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
        {ctx.caveat && (
          <p className="text-[11px] text-amber-500/80 bg-amber-900/10 border border-amber-700/20 rounded px-2 py-1.5 mt-2">
            ⚠ {ctx.caveat}
          </p>
        )}

        {/* 52-week pull from quote */}
        {hasYearHigh && (
          <div className="pt-1 text-[11px] text-slate-500">
            ราคาปัจจุบัน (quote): <span className="font-mono text-slate-300">${quote.price.toFixed(2)}</span>
            {quote.changePct !== undefined && (
              <span className={`ml-2 font-mono ${quote.changePct >= 0 ? "text-green-400" : "text-red-400"}`}>
                {quote.changePct >= 0 ? "+" : ""}{quote.changePct.toFixed(2)}%
              </span>
            )}
            <span className="ml-2 text-slate-600">— 52wk high + pullback % ดูใน widget ด้านบน</span>
          </div>
        )}

        <p className="text-[10px] text-slate-600 border-t border-slate-700/40 pt-2 mt-1">
          ข้อมูลเพื่อศึกษา ไม่ใช่คำแนะนำการลงทุน — ทุก multiple ต้องเทียบกับ peer และค่าในอดีต ตัวเลขเดี่ยวๆ ไม่บอกถูก/แพง
        </p>
      </div>
    </div>
  );
}
