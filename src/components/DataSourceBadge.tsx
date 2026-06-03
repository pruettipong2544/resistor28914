"use client";

import { useState, useEffect, useRef } from "react";
import type { HealthResponse } from "@/app/api/health/route";

export default function DataSourceBadge() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/health")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setHealth(d); })
      .catch(() => {});
  }, []);

  // Close tooltip on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!health) return null; // invisible until health check completes

  const isReal    = health.overall === "real";
  const isPartial = health.overall === "partial";

  const badgeColor = isReal
    ? "bg-green-900/60 border-green-700/50 text-green-400"
    : isPartial
    ? "bg-yellow-900/60 border-yellow-700/50 text-yellow-400"
    : "bg-slate-700/60 border-slate-600/50 text-slate-400";

  const dot = isReal ? "bg-green-400" : isPartial ? "bg-yellow-400" : "bg-slate-500";
  const label = isReal ? "REAL" : isPartial ? "PARTIAL" : "MOCK";

  function ProviderRow({ name, p }: { name: string; p: HealthResponse["finnhub"] }) {
    return (
      <div className="flex items-start gap-2">
        <span className={`mt-0.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${p.ok ? "bg-green-400" : "bg-red-400"}`} />
        <div className="min-w-0">
          <span className="text-slate-300 font-medium">{name}</span>
          {p.ok
            ? <span className="text-green-400 ml-1 text-[10px]">ok{p.price ? ` · AAPL $${p.price.toFixed(2)}` : ""}</span>
            : <>
                <span className="text-red-400 ml-1 text-[10px]">fail</span>
                <p className="text-slate-500 text-[10px] mt-0.5 break-words">{p.reason}</p>
              </>
          }
          {!p.configured && <p className="text-amber-500 text-[10px]">API key ไม่ได้ตั้งค่าใน .env.local</p>}
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1.5 px-2 py-1 rounded-full border text-[11px] font-medium transition-colors ${badgeColor} hover:opacity-80`}
        title="Data source status — คลิกเพื่อดูรายละเอียด"
      >
        <span className={`w-1.5 h-1.5 rounded-full ${dot} ${isReal ? "animate-pulse" : ""}`} />
        {label}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-3 space-y-3 text-xs">
          <p className="text-slate-400 font-semibold">แหล่งข้อมูลตอนนี้</p>

          <ProviderRow name="Finnhub" p={health.finnhub} />
          <ProviderRow name="FMP" p={health.fmp} />

          {health.overall === "mock" && (
            <div className="border-t border-slate-700 pt-2 text-slate-500 space-y-1">
              <p className="font-medium text-slate-400">วิธีเปิดข้อมูลจริง:</p>
              <p>1. เพิ่ม key ใน <code className="text-slate-300">.env.local</code></p>
              <p>2. รีสตาร์ท dev server</p>
              <p>3. ดู README สำหรับรายละเอียด</p>
            </div>
          )}

          <p className="text-slate-600 text-[10px] border-t border-slate-800 pt-2">
            checked {new Date(health.checkedAt).toLocaleTimeString()}
          </p>
        </div>
      )}
    </div>
  );
}
