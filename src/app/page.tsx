"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Quote } from "@/types";
import { useWatchlist } from "@/hooks/useWatchlist";
import StockCard from "@/components/StockCard";
import StockDetail from "@/components/StockDetail";
import AddStockModal from "@/components/AddStockModal";
import HiddenList from "@/components/HiddenList";
import Disclaimer from "@/components/Disclaimer";

const REFRESH_INTERVAL = 30_000; // 30 seconds

export default function Home() {
  const { watchlist, hidden, hydrated, addToWatchlist, hideStock, restoreStock, removeHidden, resetToDefaults } = useWatchlist();

  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [sparklines, setSparklines] = useState<Record<string, number[]>>({});
  const [loadingQuotes, setLoadingQuotes] = useState(false);
  const [quotesError, setQuotesError] = useState<string | null>(null);

  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [filter, setFilter] = useState("");

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchQuotes = useCallback(async (symbols: string[]) => {
    if (!symbols.length) return;
    setLoadingQuotes(true);
    setQuotesError(null);
    try {
      const res = await fetch(`/api/quotes?symbols=${symbols.join(",")}`);
      if (!res.ok) throw new Error("ไม่สามารถดึงข้อมูลราคาได้");
      const data: Record<string, Quote> = await res.json();
      setQuotes((prev) => ({ ...prev, ...data }));

      // Update sparklines (last-N close prices)
      setSparklines((prev) => {
        const next = { ...prev };
        for (const [sym, q] of Object.entries(data)) {
          const existing = prev[sym] ?? [];
          // Keep last 20 price points for sparkline
          next[sym] = [...existing, q.price].slice(-20);
        }
        return next;
      });
    } catch (e) {
      setQuotesError(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
    } finally {
      setLoadingQuotes(false);
    }
  }, []);

  // Initial fetch and refresh loop
  useEffect(() => {
    if (!hydrated || !watchlist.length) return;
    fetchQuotes(watchlist);

    timerRef.current = setInterval(() => fetchQuotes(watchlist), REFRESH_INTERVAL);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [hydrated, watchlist, fetchQuotes]);

  const selectedQuote = selectedSymbol ? quotes[selectedSymbol] : null;

  const handleHide = useCallback((symbol: string) => {
    if (confirm(`ซ่อน ${symbol} ออกจาก watchlist?`)) {
      hideStock(symbol);
      if (selectedSymbol === symbol) setSelectedSymbol(null);
    }
  }, [hideStock, selectedSymbol]);

  const handleReset = () => {
    resetToDefaults();
    setShowResetConfirm(false);
    setFilter("");
  };

  const filteredWatchlist = watchlist.filter((s) =>
    s.toLowerCase().includes(filter.toLowerCase()) ||
    (quotes[s]?.name ?? "").toLowerCase().includes(filter.toLowerCase())
  );

  // Sort: by %change descending
  const sorted = [...filteredWatchlist].sort((a, b) => {
    const qa = quotes[a];
    const qb = quotes[b];
    if (!qa || !qb) return 0;
    return qb.changePercent - qa.changePercent;
  });

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 pb-16">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur border-b border-slate-700 px-4 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-white">📈</span>
            <h1 className="text-lg font-bold text-white hidden sm:block">Stock Dashboard</h1>
          </div>

          {/* Search/filter */}
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="ค้นหา ticker / ชื่อบริษัท..."
            className="flex-1 min-w-[160px] max-w-xs bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
          />

          <div className="flex items-center gap-2 ml-auto">
            {/* Refresh indicator */}
            {loadingQuotes && (
              <div className="w-4 h-4 border border-sky-500 border-t-transparent rounded-full animate-spin" />
            )}
            {quotesError && (
              <span className="text-xs text-red-400 hidden sm:block">⚠ {quotesError}</span>
            )}

            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <span>+</span>
              <span>เพิ่มหุ้น</span>
            </button>

            <button
              onClick={() => setShowResetConfirm(true)}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm transition-colors"
              title="Reset เป็นค่าเริ่มต้น"
            >
              Reset
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-5 space-y-6">
        {/* Stats bar */}
        <div className="flex flex-wrap gap-4 text-sm text-slate-400">
          <span>
            {watchlist.length} หุ้นใน watchlist
          </span>
          {Object.keys(quotes).length > 0 && (
            <>
              <span className="text-green-400">
                ▲ {Object.values(quotes).filter((q) => q.changePercent >= 0).length} ตัว
              </span>
              <span className="text-red-400">
                ▼ {Object.values(quotes).filter((q) => q.changePercent < 0).length} ตัว
              </span>
            </>
          )}
          {!loadingQuotes && Object.keys(quotes).length > 0 && (
            <span className="text-slate-500 text-xs ml-auto">
              อัพเดตทุก 30 วิ
            </span>
          )}
        </div>

        {/* Stock grid */}
        {filteredWatchlist.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            {filter ? `ไม่พบ "${filter}"` : "ไม่มีหุ้นใน watchlist กด + เพื่อเพิ่ม"}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {sorted.map((symbol) => {
              const quote = quotes[symbol];
              if (!quote) {
                // Loading skeleton
                return (
                  <div key={symbol} className="bg-slate-800 border border-slate-700 rounded-xl p-4 animate-pulse">
                    <div className="h-4 bg-slate-700 rounded w-16 mb-2" />
                    <div className="h-3 bg-slate-700 rounded w-24 mb-4" />
                    <div className="h-6 bg-slate-700 rounded w-20 mb-2" />
                    <div className="h-4 bg-slate-700 rounded w-14" />
                  </div>
                );
              }
              return (
                <StockCard
                  key={symbol}
                  quote={quote}
                  sparklineData={sparklines[symbol]}
                  onClick={() => setSelectedSymbol(symbol)}
                  onHide={() => handleHide(symbol)}
                />
              );
            })}
          </div>
        )}

        {/* Hidden stocks */}
        <HiddenList
          hidden={hidden}
          onRestore={restoreStock}
          onRemove={removeHidden}
        />
      </main>

      {/* Reset confirm dialog */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-800 border border-slate-600 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">Reset รายการ?</h3>
            <p className="text-slate-400 text-sm mb-5">
              จะคืนกลับเป็น 21 หุ้นเริ่มต้น และล้างรายการที่ซ่อนทั้งหมด
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors text-sm"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleReset}
                className="flex-1 py-2 rounded-lg bg-red-600 text-white hover:bg-red-500 transition-colors text-sm font-medium"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail modal */}
      {selectedQuote && (
        <StockDetail
          quote={selectedQuote}
          onClose={() => setSelectedSymbol(null)}
        />
      )}

      {/* Add stock modal */}
      {showAddModal && (
        <AddStockModal
          onAdd={(symbol) => addToWatchlist(symbol)}
          onClose={() => setShowAddModal(false)}
          existingSymbols={[...watchlist, ...hidden]}
        />
      )}

      <Disclaimer />
    </div>
  );
}
