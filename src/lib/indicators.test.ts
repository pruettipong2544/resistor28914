import { computeRsi, latestSma, computeSentiment, computeSupportResistance } from "./indicators";
import type { TechnicalIndicators } from "@/types";

// --- RSI tests ---
describe("computeRsi", () => {
  it("returns null when insufficient data", () => {
    expect(computeRsi([1, 2, 3], 14)).toBeNull();
  });

  it("returns 100 when there are only gains", () => {
    const closes = Array.from({ length: 20 }, (_, i) => 100 + i);
    const rsi = computeRsi(closes);
    expect(rsi).toBe(100);
  });

  it("returns 0 when there are only losses", () => {
    const closes = Array.from({ length: 20 }, (_, i) => 100 - i);
    const rsi = computeRsi(closes);
    expect(rsi).toBe(0);
  });

  it("returns ~50 for alternating up/down", () => {
    const closes = Array.from({ length: 30 }, (_, i) => (i % 2 === 0 ? 100 : 99));
    const rsi = computeRsi(closes);
    expect(rsi).toBeGreaterThan(40);
    expect(rsi).toBeLessThan(60);
  });
});

// --- SMA tests ---
describe("latestSma", () => {
  it("returns null when insufficient data", () => {
    expect(latestSma([1, 2], 5)).toBeNull();
  });

  it("computes correct SMA-3", () => {
    expect(latestSma([1, 2, 3, 4, 5], 3)).toBeCloseTo(4); // last 3: 3,4,5 → 4
  });

  it("handles exact period length", () => {
    expect(latestSma([2, 4, 6], 3)).toBeCloseTo(4);
  });
});

// --- Support / Resistance tests ---
describe("computeSupportResistance", () => {
  it("returns nulls for tiny data", () => {
    const { support, resistance } = computeSupportResistance([
      { time: 0, open: 10, high: 11, low: 9, close: 10, volume: 1000 },
    ]);
    expect(support).toBeNull();
    expect(resistance).toBeNull();
  });

  it("support is below and resistance above current price", () => {
    const candles = [
      { time: 1, open: 100, high: 105, low: 95, close: 100, volume: 1000 },
      { time: 2, open: 102, high: 110, low: 98, close: 105, volume: 1000 },
      { time: 3, open: 104, high: 108, low: 100, close: 102, volume: 1000 },
      { time: 4, open: 101, high: 106, low: 97, close: 100, volume: 1000 },
      { time: 5, open: 100, high: 104, low: 98, close: 101, volume: 1000 },
    ];
    const { support, resistance } = computeSupportResistance(candles);
    if (support !== null) expect(support).toBeLessThanOrEqual(101);
    if (resistance !== null) expect(resistance).toBeGreaterThanOrEqual(101);
  });
});

// --- Sentiment tests ---
describe("computeSentiment", () => {
  const baseIndicators: TechnicalIndicators = {
    rsi: 50,
    ma20: 100,
    ma50: 100,
    ma200: 100,
    support: 95,
    resistance: 105,
    atr: 2,
    volumeMA20: 1_000_000,
    high52w: 120,
    low52w: 80,
  };

  it("score is between 0 and 100", () => {
    const result = computeSentiment(100, baseIndicators, 1_000_000);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("has a valid label", () => {
    const result = computeSentiment(100, baseIndicators, 1_000_000);
    const validLabels = ["Extreme Fear", "Fear", "Neutral", "Greed", "Extreme Greed"];
    expect(validLabels).toContain(result.label);
  });

  it("extreme greed for overbought high-momentum stock", () => {
    const indicators = {
      ...baseIndicators,
      rsi: 80,
      ma50: 80, // price 120 is well above MA50
      atr: 0.5, // low volatility
    };
    const result = computeSentiment(120, indicators, 2_000_000); // double avg volume
    expect(result.score).toBeGreaterThan(55);
  });

  it("fear for oversold stock", () => {
    const indicators = {
      ...baseIndicators,
      rsi: 20,
      ma50: 100, // price 80 is below MA50
      atr: 8,    // high volatility
    };
    const result = computeSentiment(80, indicators, 500_000);
    expect(result.score).toBeLessThan(50);
  });

  it("returns 5 components", () => {
    const result = computeSentiment(100, baseIndicators, 1_000_000);
    const keys = Object.keys(result.components);
    expect(keys).toHaveLength(5);
  });
});
