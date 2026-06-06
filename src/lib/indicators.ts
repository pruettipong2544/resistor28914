// Technical indicator calculations — server-side only, pure functions.
// Each indicator votes Buy/Sell/Neutral independently; caller aggregates.
//
// Vote criteria (documented here so they're easy to tune):
//
//   RSI(14):
//     < 30  → Buy   (oversold)
//     > 70  → Sell  (overbought)
//     >= 50 → mild Buy  (positive momentum)
//     < 50  → mild Sell (weak momentum)
//
//   EMA cross:
//     price > EMA  → Buy
//     price < EMA  → Sell
//
//   MACD(12,26,9):
//     histogram > 0 → Buy  (bullish momentum)
//     histogram < 0 → Sell (bearish momentum)
//     |histogram| < 0.01% of price → Neutral (near zero)
//
//   EMA50 vs EMA200 (golden/death cross):
//     EMA50 > EMA200 → Buy  (golden cross zone)
//     EMA50 < EMA200 → Sell (death cross zone)
//
//   Price vs Pivot PP:
//     price > PP → Buy
//     price < PP → Sell

import type { Candle, PivotPoints, SignalVote, SignalSummary, SignalData, TradeLevels } from "@/types";

// ─── Pivot Points (Standard) ────────────────────────────────────────────────

export function computePivotPoints(candles: Candle[]): PivotPoints | null {
  if (candles.length < 2) return null;

  // Standard pivot uses the *previous complete* trading day's H/L/C.
  // Twelve Data may include today's partial bar as the newest entry (before EOD).
  // Detect this: if the last bar's date matches today's UTC date it's partial →
  // step back one more. Otherwise the last bar is itself the prior complete day.
  const lastBar = candles[candles.length - 1];
  const lastDate = new Date(lastBar.time * 1000).toISOString().slice(0, 10);
  const todayUtc = new Date().toISOString().slice(0, 10);
  const refIdx = lastDate === todayUtc ? candles.length - 2 : candles.length - 1;
  if (refIdx < 0) return null;

  const ref = candles[refIdx];
  const pivotCandleDate = new Date(ref.time * 1000).toISOString().slice(0, 10);
  const { high: H, low: L, close: C } = ref;
  const PP = (H + L + C) / 3;
  return {
    PP,
    R1: 2 * PP - L, R2: PP + (H - L), R3: H + 2 * (PP - L),
    S1: 2 * PP - H, S2: PP - (H - L), S3: L - 2 * (H - PP),
    pivotCandleDate,
  };
}

// ─── EMA ─────────────────────────────────────────────────────────────────────

export function emaLatest(values: number[], period: number): number | null {
  if (values.length < period) return null;
  const k = 2 / (period + 1);
  let val = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < values.length; i++) val = values[i] * k + val * (1 - k);
  return val;
}

// Returns full EMA series (null for leading values before first window fills)
export function emaSeries(values: number[], period: number): (number | null)[] {
  if (values.length < period) return values.map(() => null);
  const k = 2 / (period + 1);
  const result: (number | null)[] = new Array(values.length).fill(null);
  let prev = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  result[period - 1] = prev;
  for (let i = period; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
    result[i] = prev;
  }
  return result;
}

// ─── RSI (Wilder's smoothing) ────────────────────────────────────────────────

export function rsiLatest(closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null;
  let avgGain = 0, avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d > 0) avgGain += d; else avgLoss -= d;
  }
  avgGain /= period; avgLoss /= period;
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(0, d)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(0, -d)) / period;
  }
  if (avgLoss === 0) return 100;
  return 100 - 100 / (1 + avgGain / avgLoss);
}

// ─── MACD (12, 26, 9) ────────────────────────────────────────────────────────

export interface MACDResult { macd: number; signal: number; histogram: number; }

export function macdLatest(closes: number[], fast = 12, slow = 26, sig = 9): MACDResult | null {
  if (closes.length < slow + sig) return null;
  // Compute MACD line at each point (once slow EMA is available)
  const kFast = 2 / (fast + 1), kSlow = 2 / (slow + 1);
  let eFast = closes.slice(0, fast).reduce((a, b) => a + b, 0) / fast;
  let eSlow = closes.slice(0, slow).reduce((a, b) => a + b, 0) / slow;
  for (let i = fast; i < slow; i++) eFast = closes[i] * kFast + eFast * (1 - kFast);
  const macdLine: number[] = [];
  for (let i = slow; i < closes.length; i++) {
    eFast = closes[i] * kFast + eFast * (1 - kFast);
    eSlow = closes[i] * kSlow + eSlow * (1 - kSlow);
    macdLine.push(eFast - eSlow);
  }
  if (macdLine.length < sig) return null;
  const kSig = 2 / (sig + 1);
  let eSig = macdLine.slice(0, sig).reduce((a, b) => a + b, 0) / sig;
  for (let i = sig; i < macdLine.length; i++) eSig = macdLine[i] * kSig + eSig * (1 - kSig);
  const latestMacd = macdLine[macdLine.length - 1];
  return { macd: latestMacd, signal: eSig, histogram: latestMacd - eSig };
}

// ─── ATR (Wilder, period=14) ──────────────────────────────────────────────────

export function atrLatest(candles: Candle[], period = 14): number | null {
  if (candles.length < period + 1) return null;
  const trs = candles.slice(1).map((c, i) =>
    Math.max(c.high - c.low, Math.abs(c.high - candles[i].close), Math.abs(c.low - candles[i].close))
  );
  let atr = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < trs.length; i++) atr = (atr * (period - 1) + trs[i]) / period;
  return atr;
}

// ─── Individual vote helpers ──────────────────────────────────────────────────

function voteRsi(closes: number[]): SignalVote | null {
  const rsi = rsiLatest(closes);
  if (rsi === null) return null;
  const r = rsi.toFixed(1);
  if (rsi < 30)  return { indicator: "RSI(14)", vote: "buy",     reason: `RSI ${r} — oversold` };
  if (rsi > 70)  return { indicator: "RSI(14)", vote: "sell",    reason: `RSI ${r} — overbought` };
  if (rsi >= 50) return { indicator: "RSI(14)", vote: "buy",     reason: `RSI ${r} — momentum บวก (>50)` };
                 return { indicator: "RSI(14)", vote: "sell",    reason: `RSI ${r} — momentum ลบ (<50)` };
}

function voteEma(closes: number[], period: number): SignalVote | null {
  const e = emaLatest(closes, period);
  if (e === null) return null;
  const cur = closes[closes.length - 1];
  const lbl = `EMA(${period})`;
  if (cur > e) return { indicator: lbl, vote: "buy",  reason: `ราคา $${cur.toFixed(2)} > ${lbl} $${e.toFixed(2)}` };
               return { indicator: lbl, vote: "sell", reason: `ราคา $${cur.toFixed(2)} < ${lbl} $${e.toFixed(2)}` };
}

function voteMacd(closes: number[]): SignalVote | null {
  const m = macdLatest(closes);
  if (m === null) return null;
  const h = m.histogram;
  const cur = closes[closes.length - 1];
  // "near-zero" = histogram < 0.01% of price
  if (Math.abs(h) < cur * 0.0001) return { indicator: "MACD(12,26,9)", vote: "neutral", reason: `MACD ใกล้ signal line (histogram ≈0)` };
  if (h > 0) return { indicator: "MACD(12,26,9)", vote: "buy",  reason: `MACD histogram +${h.toFixed(4)} (bullish momentum)` };
             return { indicator: "MACD(12,26,9)", vote: "sell", reason: `MACD histogram ${h.toFixed(4)} (bearish momentum)` };
}

function voteEmaCross(closes: number[]): SignalVote | null {
  const e50  = emaLatest(closes, 50);
  const e200 = emaLatest(closes, 200);
  if (e50 === null || e200 === null) return null;
  if (e50 > e200) return { indicator: "EMA50/200", vote: "buy",  reason: `EMA50 $${e50.toFixed(2)} > EMA200 $${e200.toFixed(2)} (Golden cross zone)` };
                  return { indicator: "EMA50/200", vote: "sell", reason: `EMA50 $${e50.toFixed(2)} < EMA200 $${e200.toFixed(2)} (Death cross zone)` };
}

function votePivot(cur: number, pp: PivotPoints): SignalVote {
  if (cur > pp.PP) return { indicator: "Pivot PP", vote: "buy",  reason: `ราคา $${cur.toFixed(2)} > PP $${pp.PP.toFixed(2)}` };
  if (cur < pp.S1) return { indicator: "Pivot S1", vote: "buy",  reason: `ราคา $${cur.toFixed(2)} ใกล้/ต่ำกว่า S1 $${pp.S1.toFixed(2)} (แนวรับ)` };
                   return { indicator: "Pivot PP", vote: "sell", reason: `ราคา $${cur.toFixed(2)} < PP $${pp.PP.toFixed(2)}` };
}

// ─── Aggregate votes → SignalSummary ─────────────────────────────────────────

function aggregate(votes: SignalVote[]): SignalSummary {
  const buy     = votes.filter(v => v.vote === "buy").length;
  const sell    = votes.filter(v => v.vote === "sell").length;
  const neutral = votes.filter(v => v.vote === "neutral").length;
  const total   = votes.length || 1;
  const score   = (buy - sell) / total;

  let direction: SignalSummary["direction"];
  let label: string;
  if (score > 0.25)       { direction = "bullish"; label = "เอนไปทางซื้อ"; }
  else if (score < -0.25) { direction = "bearish"; label = "เอนไปทางขาย"; }
  else                    { direction = "neutral";  label = "ถือ/สังเกตการณ์"; }

  return { label, direction, score, buyCount: buy, sellCount: sell, neutralCount: neutral, votes };
}

// ─── Weekly signal (short-term focus) ────────────────────────────────────────
// Indicators: RSI(14), EMA(20), MACD(12,26,9), price vs Pivot PP/S1

export function computeWeeklySignal(candles: Candle[], pp: PivotPoints | null): SignalSummary {
  const closes = candles.map(c => c.close);
  const cur = closes[closes.length - 1];
  const votes: SignalVote[] = [];

  const vRsi  = voteRsi(closes);      if (vRsi)  votes.push(vRsi);
  const vE20  = voteEma(closes, 20);  if (vE20)  votes.push(vE20);
  const vMacd = voteMacd(closes);     if (vMacd) votes.push(vMacd);
  if (pp) votes.push(votePivot(cur, pp));

  return aggregate(votes);
}

// ─── Monthly signal (trend focus) ────────────────────────────────────────────
// Indicators: EMA(50), EMA(200), EMA50 vs EMA200 cross, RSI, price vs Pivot

export function computeMonthlySignal(candles: Candle[], pp: PivotPoints | null): SignalSummary {
  const closes = candles.map(c => c.close);
  const cur = closes[closes.length - 1];
  const votes: SignalVote[] = [];

  const vE50  = voteEma(closes, 50);  if (vE50)  votes.push(vE50);
  const vCross = voteEmaCross(closes); if (vCross) votes.push(vCross);
  const vRsi  = voteRsi(closes);      if (vRsi)  votes.push(vRsi);
  if (pp) votes.push(votePivot(cur, pp));

  return aggregate(votes);
}

// ─── Trade levels (mechanical, no opinion — pivot + ATR) ─────────────────────
// Entry:    PP if price above PP, else S1 (nearest meaningful support)
// Target1:  R1
// Target2:  R2
// Stop:     tighter of S2 or entry − 1.5×ATR  (whichever is higher = less risk)

export function computeTradeLevels(
  currentPrice: number,
  pp: PivotPoints,
  candles: Candle[]
): TradeLevels {
  const entry    = currentPrice >= pp.PP ? pp.PP : pp.S1;
  const target1  = pp.R1;
  const target2  = pp.R2;
  const atr      = atrLatest(candles);
  const atrStop  = atr !== null ? entry - 1.5 * atr : null;
  // Take the higher stop (less aggressive, closer to entry) to limit risk
  const stopLoss = atrStop !== null ? Math.max(atrStop, pp.S2) : pp.S2;
  const upside   = target1 - entry;
  const downside = Math.max(entry - stopLoss, 0.0001);
  return { entry, target1, target2, stopLoss, rrRatio: upside / downside };
}

// ─── Public entry point ───────────────────────────────────────────────────────

export function computeSignals(
  candles: Candle[],
  pp: PivotPoints | null
): SignalData | null {
  if (candles.length < 2) return null;
  const cur = candles[candles.length - 1].close;
  const weekly  = computeWeeklySignal(candles, pp);
  const monthly = computeMonthlySignal(candles, pp);
  const levels  = pp ? computeTradeLevels(cur, pp, candles) : null;
  return { weekly, monthly, tradeLevels: levels };
}

// Re-export for tests
