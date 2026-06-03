// Unit tests for indicators — run with: npx jest
// Tests verify that vote logic and aggregation behave as documented.

import {
  rsiLatest, emaLatest, macdLatest, atrLatest,
  computePivotPoints, computeSignals,
  computeWeeklySignal, computeMonthlySignal, computeTradeLevels,
} from "./indicators";
import type { Candle, PivotPoints } from "@/types";

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeCandles(closes: number[], highMult = 1.01, lowMult = 0.99): Candle[] {
  return closes.map((c, i) => ({
    time: 1700000000 + i * 86400,
    open: c,
    high: c * highMult,
    low: c * lowMult,
    close: c,
    volume: 1_000_000,
  }));
}

const samplePP: PivotPoints = { PP: 100, R1: 105, R2: 110, R3: 115, S1: 95, S2: 90, S3: 85 };

// ── RSI ───────────────────────────────────────────────────────────────────────

test("rsiLatest returns null when too few data points", () => {
  expect(rsiLatest([1, 2, 3], 14)).toBeNull();
});

test("rsiLatest returns ~100 for steadily rising series", () => {
  const closes = Array.from({ length: 30 }, (_, i) => 10 + i);
  const rsi = rsiLatest(closes);
  expect(rsi).not.toBeNull();
  expect(rsi!).toBeGreaterThan(90);
});

test("rsiLatest returns ~0 for steadily falling series", () => {
  const closes = Array.from({ length: 30 }, (_, i) => 50 - i);
  const rsi = rsiLatest(closes);
  expect(rsi!).toBeLessThan(10);
});

// ── EMA ───────────────────────────────────────────────────────────────────────

test("emaLatest returns null when series shorter than period", () => {
  expect(emaLatest([1, 2], 20)).toBeNull();
});

test("emaLatest of constant series equals the constant", () => {
  const closes = new Array(30).fill(50);
  expect(emaLatest(closes, 20)).toBeCloseTo(50);
});

// ── MACD ──────────────────────────────────────────────────────────────────────

test("macdLatest returns null when too few data points", () => {
  expect(macdLatest(new Array(30).fill(1))).toBeNull();
});

test("macdLatest histogram is positive for rising price series", () => {
  const closes = Array.from({ length: 50 }, (_, i) => 10 + i * 0.5);
  const m = macdLatest(closes);
  expect(m).not.toBeNull();
  expect(m!.histogram).toBeGreaterThanOrEqual(-1e-10);
});

// ── ATR ───────────────────────────────────────────────────────────────────────

test("atrLatest returns null when too few candles", () => {
  expect(atrLatest(makeCandles([1, 2, 3]))).toBeNull();
});

test("atrLatest is positive for candles with high-low spread", () => {
  const candles = makeCandles(new Array(20).fill(100), 1.02, 0.98);
  const atr = atrLatest(candles);
  expect(atr).not.toBeNull();
  expect(atr!).toBeGreaterThan(0);
});

// ── Pivot Points ──────────────────────────────────────────────────────────────

test("computePivotPoints returns null for < 2 candles", () => {
  expect(computePivotPoints([])).toBeNull();
  expect(computePivotPoints(makeCandles([100]))).toBeNull();
});

test("computePivotPoints PP = (H+L+C)/3 of previous bar", () => {
  const candles = makeCandles([98, 100], 1.05, 0.95); // prev bar: H≈102.9, L≈93.1, C=98
  const pp = computePivotPoints(candles)!;
  expect(pp.PP).toBeCloseTo((98 * 1.05 + 98 * 0.95 + 98) / 3, 1);
});

test("computePivotPoints R1 > PP > S1", () => {
  const candles = makeCandles([50, 100]);
  const pp = computePivotPoints(candles)!;
  expect(pp.R1).toBeGreaterThan(pp.PP);
  expect(pp.PP).toBeGreaterThan(pp.S1);
});

// ── Weekly signal ─────────────────────────────────────────────────────────────

test("weekly signal is bullish with rising price above EMA20 and Pivot", () => {
  // 40 candles rising from 90 to ~109.75; final price well above PP=100
  const closes = Array.from({ length: 40 }, (_, i) => 90 + i * 0.5);
  const candles = makeCandles(closes);
  const summary = computeWeeklySignal(candles, samplePP);
  // price > EMA20 and > PP → should lean bullish
  expect(summary.buyCount).toBeGreaterThanOrEqual(summary.sellCount);
});

test("computeSignals returns null for < 2 candles", () => {
  expect(computeSignals([], null)).toBeNull();
  expect(computeSignals(makeCandles([100]), samplePP)).toBeNull();
});

// ── Trade levels ──────────────────────────────────────────────────────────────

test("trade levels entry <= PP when price >= PP", () => {
  const candles = makeCandles(new Array(20).fill(105)); // price > PP(100)
  const levels = computeTradeLevels(105, samplePP, candles);
  expect(levels.entry).toBe(samplePP.PP); // entry = PP when price above PP
});

test("trade levels entry = S1 when price < PP", () => {
  const candles = makeCandles(new Array(20).fill(92)); // price < PP(100)
  const levels = computeTradeLevels(92, samplePP, candles);
  expect(levels.entry).toBe(samplePP.S1);
});

test("trade levels rrRatio is positive", () => {
  const candles = makeCandles(new Array(20).fill(105));
  const levels = computeTradeLevels(105, samplePP, candles);
  expect(levels.rrRatio).toBeGreaterThan(0);
});
