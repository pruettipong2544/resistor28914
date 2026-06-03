import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { fetchTwelveDataCandles } from "@/lib/twelvedata";
import { fetchBatchQuotes } from "@/lib/finnhub";
import { computePivotPoints, computeSignals } from "@/lib/indicators";
import { getValuationType } from "@/config/stocks";
import type { Candle, PivotPoints, SignalData } from "@/types";

// ─── Rate limiter — simple in-memory per IP, resets every minute ─────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 15; // requests per minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

// ─── Symbol extraction ────────────────────────────────────────────────────────
function extractSymbols(message: string, watchlist: string[]): string[] {
  const wlSet = new Set(watchlist.map(s => s.toUpperCase()));
  const found = new Set<string>();
  // Match uppercase-looking tokens in the message (handles mixed Thai/English)
  const tokens = message.toUpperCase().match(/\b[A-Z]{1,6}\b/g) ?? [];
  for (const t of tokens) {
    if (wlSet.has(t)) found.add(t);
  }
  return Array.from(found).slice(0, 5);
}

// ─── Per-symbol context builder ───────────────────────────────────────────────
function fmtPP(p: PivotPoints): string {
  return `PP=${p.PP.toFixed(2)}, R1=${p.R1.toFixed(2)}, R2=${p.R2.toFixed(2)}, R3=${p.R3.toFixed(2)}, S1=${p.S1.toFixed(2)}, S2=${p.S2.toFixed(2)}, S3=${p.S3.toFixed(2)}`;
}

function fmtSignals(s: SignalData): string {
  const w = s.weekly;
  const m = s.monthly;
  const wVotes = w.votes.map(v => `${v.indicator}:${v.vote}(${v.reason})`).join(", ");
  const mVotes = m.votes.map(v => `${v.indicator}:${v.vote}(${v.reason})`).join(", ");
  return [
    `Weekly: ${w.label} [score=${w.score.toFixed(2)}, buy=${w.buyCount}, sell=${w.sellCount}, neutral=${w.neutralCount}]`,
    `  votes: ${wVotes}`,
    `Monthly: ${m.label} [score=${m.score.toFixed(2)}, buy=${m.buyCount}, sell=${m.sellCount}, neutral=${m.neutralCount}]`,
    `  votes: ${mVotes}`,
    s.tradeLevels
      ? `Trade levels: entry=${s.tradeLevels.entry.toFixed(2)}, target1=${s.tradeLevels.target1.toFixed(2)}, target2=${s.tradeLevels.target2.toFixed(2)}, stopLoss=${s.tradeLevels.stopLoss.toFixed(2)}, R/R=${s.tradeLevels.rrRatio.toFixed(2)}`
      : "",
  ].filter(Boolean).join("\n");
}

async function buildSymbolContext(
  symbol: string,
  candles: Candle[],
  isMock: boolean,
  price: number | null,
  changePct: number | null,
  yearHigh: number | null,
): Promise<string> {
  if (isMock || candles.length < 20) {
    return `### ${symbol}\nไม่มีข้อมูล candle จริง — ไม่สามารถคำนวณ indicator หรือ pivot ได้`;
  }

  const vt = getValuationType(symbol);
  const pp = computePivotPoints(candles);
  const sig = computeSignals(candles, pp);

  const priceStr = price != null
    ? `$${price.toFixed(2)} (${changePct != null ? (changePct >= 0 ? "+" : "") + changePct.toFixed(2) + "%" : "n/a"})`
    : `$${candles[candles.length - 1].close.toFixed(2)} (from candle — may be delayed)`;

  const pullbackStr = (price != null && yearHigh != null && yearHigh > 0)
    ? ` · ${((yearHigh - price) / yearHigh * 100).toFixed(1)}% below 52wk high ($${yearHigh.toFixed(2)})`
    : "";

  const lines = [
    `### ${symbol} [${vt}]`,
    `Price: ${priceStr}${pullbackStr}`,
    `Pivot points: ${pp ? fmtPP(pp) : "insufficient data"}`,
    sig ? fmtSignals(sig) : "Signals: insufficient data",
  ];
  return lines.join("\n");
}

// ─── System prompt ────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are a technical analysis assistant for a personal stock watchlist dashboard.

YOUR ROLE:
- Explain technical signals (pivot points, RSI, EMA, MACD) based ONLY on the data provided in each request.
- Help the user understand what the signals suggest about short-term price action.

STRICT RULES — follow these exactly:
1. NEVER fabricate, estimate, or guess any price levels, pivot points, or indicator values not explicitly given to you.
2. If a symbol has no real candle data (marked as such), say clearly: "ไม่มีข้อมูล candle จริงสำหรับ [symbol] — ไม่สามารถวิเคราะห์ทางเทคนิคได้"
3. Only analyze stocks present in the user's watchlist context. If asked about a stock not in context, say it is not in the watchlist.
4. When asked whether to buy/sell:
   - Explain what the signals indicate and which indicators drive the bias
   - Name the key risk factors or counter-signals
   - NEVER give a direct buy/sell command or guarantee any outcome
   - End with: "⚠ ข้อมูลนี้เป็นการวิเคราะห์ทางเทคนิคเพื่อประกอบการตัดสินใจเท่านั้น ไม่ใช่คำแนะนำการลงทุน"
5. For short-term signals (weekly/monthly): always note that short-term signals are uncertain and can fail.
6. Keep responses clear and concise. Respond in the same language as the user (Thai or English).
7. If multiple symbols are compared, structure the response clearly per symbol.`;

// ─── Route handler ────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // Rate limit
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "คำขอเกินจำนวน — กรุณารอสักครู่" }, { status: 429 });
  }

  const key = process.env.ANTHROPIC_API_KEY;
  console.log(`[analyze] ANTHROPIC_API_KEY configured: ${!!key}`);
  if (!key) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY ยังไม่ได้ตั้งค่าใน .env.local — รีสตาร์ท dev server หลังเพิ่ม key" }, { status: 503 });
  }

  let body: { message?: string; watchlist?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const message = (body.message ?? "").trim();
  const watchlist: string[] = Array.isArray(body.watchlist) ? body.watchlist.slice(0, 30) : [];

  if (!message) return NextResponse.json({ error: "message required" }, { status: 400 });
  if (!watchlist.length) return NextResponse.json({ error: "watchlist required" }, { status: 400 });

  // Identify which symbols to fetch data for
  let targetSymbols = extractSymbols(message, watchlist);
  // If no specific symbol found, use the first 5 from watchlist for broad questions
  if (targetSymbols.length === 0) {
    targetSymbols = watchlist.slice(0, 5);
  }

  // Fetch candles + quotes in parallel
  const [candleResults, { results: quoteMap }] = await Promise.all([
    Promise.all(targetSymbols.map(sym => fetchTwelveDataCandles(sym, 400))),
    fetchBatchQuotes(targetSymbols),
  ]);

  // Build per-symbol context
  const contextParts = await Promise.all(
    targetSymbols.map((sym, i) => {
      const { candles, isMock } = candleResults[i];
      const q = quoteMap.get(sym) ?? null;
      return buildSymbolContext(sym, candles, isMock, q?.price ?? null, q?.changePct ?? null, null);
    })
  );

  const dataContext = contextParts.join("\n\n");
  const watchlistStr = watchlist.join(", ");

  const userMessageWithContext = `Watchlist: ${watchlistStr}

=== MARKET DATA (fetched live — use ONLY these numbers) ===
${dataContext}
=== END MARKET DATA ===

User question: ${message}`;

  // Stream Claude response
  const anthropic = new Anthropic({ apiKey: key });

  const stream = anthropic.messages.stream({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessageWithContext }],
  });

  const readable = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      try {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(enc.encode(event.delta.text));
          }
        }
      } finally {
        controller.close();
      }
    },
    cancel() {
      stream.abort();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
