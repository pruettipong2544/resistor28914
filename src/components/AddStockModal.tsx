"use client";

import { useState, useRef, useEffect } from "react";

interface Props {
  onAdd: (symbol: string, name: string, tags: string[]) => void;
  onClose: () => void;
  existingSymbols: string[];
}

export default function AddStockModal({ onAdd, onClose, existingSymbols }: Props) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const symbol = input.trim().toUpperCase();
    if (!symbol) return;

    if (existingSymbols.includes(symbol)) {
      setError(`${symbol} อยู่ใน watchlist แล้ว`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/validate?symbol=${symbol}`);
      const data: { valid: boolean; name: string } = await res.json();
      if (!data.valid) {
        setError(`ไม่พบ ticker "${symbol}" — กรุณาตรวจสอบชื่อ`);
        return;
      }

      // Best-effort sector lookup — used as a fallback tag when no manual
      // theme mapping exists for this ticker. Failure shouldn't block adding.
      let tags: string[] = ["Stock"];
      try {
        const tagRes = await fetch(`/api/sector?symbol=${symbol}`);
        if (tagRes.ok) {
          const tagData: { tags: string[] } = await tagRes.json();
          if (tagData.tags?.length) tags = tagData.tags;
        }
      } catch {}

      onAdd(symbol, data.name, tags);
      onClose();
    } catch {
      setError("เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-slate-800 border border-slate-600 rounded-2xl p-6 shadow-2xl">
        <h2 className="text-lg font-bold text-white mb-4">เพิ่มหุ้นใหม่</h2>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => { setInput(e.target.value); setError(null); }}
              placeholder="พิมพ์ ticker เช่น AAPL, TSLA"
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500 uppercase font-mono"
              maxLength={10}
              disabled={loading}
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm flex items-center gap-1">
              <span>⚠</span> {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors text-sm"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="flex-1 py-2 rounded-lg bg-sky-600 text-white hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              {loading ? "กำลังตรวจสอบ…" : "เพิ่ม"}
            </button>
          </div>
        </form>

        <p className="text-xs text-slate-500 mt-3 text-center">
          ระบบจะตรวจสอบกับ API ก่อนเพิ่มลงรายการ
        </p>
      </div>
    </div>
  );
}
