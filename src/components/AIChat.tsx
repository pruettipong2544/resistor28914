"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

interface Props {
  watchlist: string[];
}

const SUGGESTIONS = [
  "วิเคราะห์ NVDA",
  "IONQ vs RGTI สัญญาณต่างกันอย่างไร",
  "หุ้นไหนใน list สัญญาณเด่นช่วงนี้",
  "AAPL แนวรับ/แนวต้านอยู่ที่ไหน",
];

export default function AIChat({ watchlist }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [noKey, setNoKey] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const send = useCallback(async (text: string) => {
    const msg = text.trim();
    if (!msg || streaming) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: msg }]);
    setStreaming(true);

    // Add empty assistant message that we'll fill in
    setMessages(prev => [...prev, { role: "assistant", content: "", streaming: true }]);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, watchlist }),
        signal: ctrl.signal,
      });

      if (res.status === 503) {
        setNoKey(true);
        setMessages(prev => [
          ...prev.slice(0, -1),
          { role: "assistant", content: "⚠ ANTHROPIC_API_KEY ยังไม่ได้ตั้งค่าในเซิร์ฟเวอร์" },
        ]);
        return;
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "unknown error" }));
        setMessages(prev => [
          ...prev.slice(0, -1),
          { role: "assistant", content: `⚠ ${err.error ?? "เกิดข้อผิดพลาด"}` },
        ]);
        return;
      }

      const reader = res.body!.getReader();
      const dec = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += dec.decode(value, { stream: true });
        const final = accumulated;
        setMessages(prev => [
          ...prev.slice(0, -1),
          { role: "assistant", content: final, streaming: true },
        ]);
      }

      // Mark streaming done
      setMessages(prev => [
        ...prev.slice(0, -1),
        { role: "assistant", content: accumulated },
      ]);
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setMessages(prev => [
          ...prev.slice(0, -1),
          { role: "assistant", content: "⚠ เชื่อมต่อไม่ได้ — ลองใหม่อีกครั้ง" },
        ]);
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }, [streaming, watchlist]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`fixed bottom-6 right-6 z-40 w-13 h-13 rounded-full shadow-lg flex items-center justify-center text-xl transition-all ${
          open
            ? "bg-slate-700 text-slate-300 hover:bg-slate-600"
            : "bg-sky-600 hover:bg-sky-500 text-white"
        }`}
        style={{ width: 52, height: 52 }}
        title="AI Chat — วิเคราะห์หุ้นจาก watchlist"
        aria-label="เปิด/ปิดช่องแชท AI"
      >
        {open ? "✕" : "🤖"}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          className="fixed bottom-20 right-6 z-40 flex flex-col bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden"
          style={{ width: 380, height: 560, maxHeight: "70vh", maxWidth: "calc(100vw - 3rem)" }}
        >
          {/* Header */}
          <div className="flex-shrink-0 bg-slate-800 border-b border-slate-700 px-4 py-2.5 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">AI Technical Analyst</p>
              <p className="text-[10px] text-slate-500">วิเคราะห์เชิงเทคนิคจากข้อมูลจริงใน watchlist เท่านั้น</p>
            </div>
            <span className="text-[10px] text-slate-600 font-mono">Claude Haiku</span>
          </div>

          {/* Permanent disclaimer */}
          <div className="flex-shrink-0 bg-amber-900/20 border-b border-amber-700/30 px-3 py-1.5">
            <p className="text-[10px] text-amber-500/90">
              ⚠ ข้อมูลเชิงเทคนิคเพื่อประกอบการศึกษาเท่านั้น — ไม่ใช่คำแนะนำการลงทุน
            </p>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-xs text-slate-500 text-center">
                  ถามเกี่ยวกับหุ้นใน watchlist ({watchlist.length} ตัว) — ตอบโดยอิงข้อมูลจริงเท่านั้น
                </p>
                <div className="grid grid-cols-1 gap-1.5">
                  {SUGGESTIONS.map(s => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="text-left px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 border border-slate-700 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {noKey && (
              <div className="bg-red-900/20 border border-red-700/40 rounded-lg p-3 text-xs text-red-400">
                เพิ่ม <code className="font-mono">ANTHROPIC_API_KEY</code> ใน <code className="font-mono">.env.local</code> แล้วรีสตาร์ท dev server
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[90%] rounded-xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-sky-700/60 text-sky-100"
                      : "bg-slate-800 text-slate-200 border border-slate-700"
                  }`}
                >
                  {m.content}
                  {m.streaming && (
                    <span className="inline-block w-1.5 h-3.5 bg-sky-400 ml-0.5 animate-pulse rounded-sm align-middle" />
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="flex-shrink-0 border-t border-slate-700 p-3 flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="ถามเกี่ยวกับหุ้นใน watchlist... (Enter ส่ง)"
              disabled={streaming}
              rows={2}
              className="flex-1 resize-none bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500 disabled:opacity-50"
            />
            <button
              onClick={() => send(input)}
              disabled={streaming || !input.trim()}
              className="flex-shrink-0 w-9 h-9 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors"
              title="ส่ง"
            >
              {streaming ? (
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                  <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
