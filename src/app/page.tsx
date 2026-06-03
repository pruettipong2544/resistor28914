"use client";

import { useState } from "react";
import { useWatchlist } from "@/hooks/useWatchlist";
import { useQuotes } from "@/hooks/useQuotes";
import { getCompanyName, ALL_THEMES, getThemes } from "@/config/stocks";
import StockCard from "@/components/StockCard";
import StockDetail from "@/components/StockDetail";
import AddStockModal from "@/components/AddStockModal";
import HiddenList from "@/components/HiddenList";
import Disclaimer from "@/components/Disclaimer";
import TradingViewTickerTape from "@/components/TradingViewTickerTape";
import ATHScreener from "@/components/ATHScreener";
import DataSourceBadge from "@/components/DataSourceBadge";

export default function Home() {
  const { watchlist, hidden, hydrated, addToWatchlist, hideStock, restoreStock, removeHidden, resetToDefaults } = useWatchlist();
  const { quotes } = useQuotes(watchlist);

  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [filter, setFilter] = useState("");
  const [themeFilter, setThemeFilter] = useState<string | null>(null);

  const handleHide = (symbol: string) => {
    if (confirm(`ซ่อน ${symbol} ออกจาก watchlist?`)) {
      hideStock(symbol);
      if (selectedSymbol === symbol) setSelectedSymbol(null);
    }
  };

  const handleReset = () => {
    resetToDefaults();
    setShowResetConfirm(false);
    setFilter("");
    setThemeFilter(null);
  };

  const filteredWatchlist = watchlist
    .filter((s) =>
      s.toLowerCase().includes(filter.toLowerCase()) ||
      getCompanyName(s).toLowerCase().includes(filter.toLowerCase())
    )
    .filter((s) => !themeFilter || getThemes(s).includes(themeFilter));

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 pb-16">
      {/* TradingView Ticker Tape — live prices for all watchlist symbols */}
      <div key={watchlist.join(",")}>
        <TradingViewTickerTape symbols={watchlist} />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur border-b border-slate-700 px-4 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-white">📈</span>
            <h1 className="text-lg font-bold text-white hidden sm:block">Stock Dashboard</h1>
          </div>

          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="ค้นหา ticker / ชื่อบริษัท..."
            className="flex-1 min-w-[160px] max-w-xs bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
          />

          <div className="flex items-center gap-2 ml-auto">
            <DataSourceBadge />
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

      <main className="max-w-7xl mx-auto px-4 py-5 space-y-4">
        <p className="text-sm text-slate-500">
          {watchlist.length} หุ้นใน watchlist — คลิกการ์ดเพื่อดูกราฟ TradingView + แนวรับ/แนวต้าน
        </p>

        {/* Theme filter pills */}
        <div className="overflow-x-auto">
          <div className="flex gap-2 pb-1">
            <button
              onClick={() => setThemeFilter(null)}
              className={`whitespace-nowrap px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                themeFilter === null
                  ? "bg-sky-600 border-sky-500 text-white"
                  : "bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-500 hover:text-slate-200"
              }`}
            >
              ทั้งหมด
            </button>
            {ALL_THEMES.map((theme) => (
              <button
                key={theme}
                onClick={() => setThemeFilter(t => t === theme ? null : theme)}
                className={`whitespace-nowrap px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                  themeFilter === theme
                    ? "bg-sky-600 border-sky-500 text-white"
                    : "bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-500 hover:text-slate-200"
                }`}
              >
                {theme}
              </button>
            ))}
          </div>
        </div>

        {filteredWatchlist.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            {filter || themeFilter ? `ไม่พบผลลัพธ์` : "ไม่มีหุ้นใน watchlist กด + เพื่อเพิ่ม"}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {filteredWatchlist.map((symbol) => (
              <StockCard
                key={symbol}
                symbol={symbol}
                quote={quotes[symbol]}
                onClick={() => setSelectedSymbol(symbol)}
                onHide={() => handleHide(symbol)}
              />
            ))}
          </div>
        )}

        {/* ATH Pullback Screener */}
        <ATHScreener onSelectSymbol={(sym) => setSelectedSymbol(sym)} />

        <HiddenList hidden={hidden} onRestore={restoreStock} onRemove={removeHidden} />
      </main>

      {/* Reset confirm */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-800 border border-slate-600 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">Reset รายการ?</h3>
            <p className="text-slate-400 text-sm mb-5">
              จะคืนกลับเป็น 21 หุ้นเริ่มต้น และล้างรายการที่ซ่อนทั้งหมด
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowResetConfirm(false)} className="flex-1 py-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors text-sm">
                ยกเลิก
              </button>
              <button onClick={handleReset} className="flex-1 py-2 rounded-lg bg-red-600 text-white hover:bg-red-500 transition-colors text-sm font-medium">
                Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock detail modal */}
      {selectedSymbol && (
        <StockDetail symbol={selectedSymbol} onClose={() => setSelectedSymbol(null)} />
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
