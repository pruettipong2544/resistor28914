// Technical indicator calculations.
// All functions are pure — given candle data, return computed values.
// Exported separately so they can be unit-tested without any API dependencies.

import type {
  Candle,
  TechnicalIndicators,
  TechnicalSignal,
  SentimentResult,
  SentimentComponents,
} from "@/types";

// --- Moving Average (SMA) ---
export function sma(values: number[], period: number): (number | null)[] {
  return values.map((_, i) => {
    if (i < period - 1) return null;
    const slice = values.slice(i - period + 1, i + 1);
    return slice.reduce((a, b) => a + b, 0) / period;
  });
}

// Latest SMA value (or null if insufficient data)
export function latestSma(values: number[], period: number): number | null {
  if (values.length < period) return null;
  const slice = values.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

// --- RSI (Wilder's smoothing, period=14) ---
export function computeRsi(closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null;

  let avgGain = 0;
  let avgLoss = 0;

  // Initial average
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) avgGain += diff;
    else avgLoss -= diff;
  }
  avgGain /= period;
  avgLoss /= period;

  // Smooth remaining
  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

// RSI series (one value per candle)
export function rsiSeries(closes: number[], period = 14): (number | null)[] {
  return closes.map((_, i) => {
    if (i < period) return null;
    return computeRsi(closes.slice(0, i + 1), period);
  });
}

// --- ATR (Average True Range, period=14) ---
export function computeAtr(candles: Candle[], period = 14): number | null {
  if (candles.length < period + 1) return null;

  const trs = candles.slice(1).map((c, i) => {
    const prev = candles[i];
    return Math.max(
      c.high - c.low,
      Math.abs(c.high - prev.close),
      Math.abs(c.low - prev.close)
    );
  });

  // Simple average for first ATR
  let atr = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < trs.length; i++) {
    atr = (atr * (period - 1) + trs[i]) / period;
  }
  return atr;
}

// --- Support & Resistance ---
// Finds most significant swing low (support) and swing high (resistance)
// within the given candle window using a simple local-extrema approach.
export function computeSupportResistance(
  candles: Candle[],
  lookback = 20
): { support: number | null; resistance: number | null } {
  const window = candles.slice(-Math.min(lookback, candles.length));
  if (window.length < 3) return { support: null, resistance: null };

  const lows = window.map((c) => c.low);
  const highs = window.map((c) => c.high);

  // Cluster similar price levels — take most recent significant swing
  const swingLows: number[] = [];
  const swingHighs: number[] = [];

  for (let i = 1; i < window.length - 1; i++) {
    if (lows[i] < lows[i - 1] && lows[i] < lows[i + 1]) swingLows.push(lows[i]);
    if (highs[i] > highs[i - 1] && highs[i] > highs[i + 1]) swingHighs.push(highs[i]);
  }

  const currentPrice = window[window.length - 1].close;

  // Nearest support below current price
  const belowLows = swingLows.filter((l) => l < currentPrice);
  const support = belowLows.length ? Math.max(...belowLows) : Math.min(...lows);

  // Nearest resistance above current price
  const aboveHighs = swingHighs.filter((h) => h > currentPrice);
  const resistance = aboveHighs.length ? Math.min(...aboveHighs) : Math.max(...highs);

  return { support, resistance };
}

// --- 52-Week High / Low ---
export function compute52wRange(candles: Candle[]): {
  high52w: number | null;
  low52w: number | null;
} {
  if (!candles.length) return { high52w: null, low52w: null };
  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);
  return { high52w: Math.max(...highs), low52w: Math.min(...lows) };
}

// --- Compute all indicators from candle array ---
export function computeIndicators(candles: Candle[]): TechnicalIndicators {
  const closes = candles.map((c) => c.close);
  const volumes = candles.map((c) => c.volume);

  const rsi = computeRsi(closes);
  const ma20 = latestSma(closes, 20);
  const ma50 = latestSma(closes, 50);
  const ma200 = latestSma(closes, 200);
  const { support, resistance } = computeSupportResistance(candles);
  const atr = computeAtr(candles);
  const volumeMA20 = latestSma(volumes, 20);
  const { high52w, low52w } = compute52wRange(candles);

  return { rsi, ma20, ma50, ma200, support, resistance, atr, volumeMA20, high52w, low52w };
}

// --- Technical Signal ---
// Generates a directional signal based on a set of indicators.
// `candles` is the dataset for the chosen horizon (weekly/monthly candles).
export function computeSignal(indicators: TechnicalIndicators, currentPrice: number): TechnicalSignal {
  const reasons: string[] = [];
  let bullPoints = 0;
  let bearPoints = 0;

  const { rsi, ma20, ma50, ma200 } = indicators;

  if (rsi !== null) {
    if (rsi < 30) {
      reasons.push(`RSI ${rsi.toFixed(0)} — oversold (สัญญาณซื้อ)`);
      bullPoints += 2;
    } else if (rsi < 50) {
      reasons.push(`RSI ${rsi.toFixed(0)} — อ่อนแรง`);
      bearPoints += 1;
    } else if (rsi < 70) {
      reasons.push(`RSI ${rsi.toFixed(0)} — โมเมนตัมแข็ง`);
      bullPoints += 1;
    } else {
      reasons.push(`RSI ${rsi.toFixed(0)} — overbought (ระวังแรงขาย)`);
      bearPoints += 2;
    }
  }

  if (ma50 !== null) {
    if (currentPrice > ma50) {
      reasons.push(`ราคา > MA50 (${ma50.toFixed(2)}) — เทรนด์ขึ้น`);
      bullPoints += 1;
    } else {
      reasons.push(`ราคา < MA50 (${ma50.toFixed(2)}) — เทรนด์ลง`);
      bearPoints += 1;
    }
  }

  if (ma20 !== null && ma50 !== null) {
    if (ma20 > ma50) {
      reasons.push("MA20 > MA50 — Golden cross zone");
      bullPoints += 1;
    } else {
      reasons.push("MA20 < MA50 — Death cross zone");
      bearPoints += 1;
    }
  }

  if (ma200 !== null) {
    if (currentPrice > ma200) {
      reasons.push(`ราคา > MA200 — Bull market structure`);
      bullPoints += 1;
    } else {
      reasons.push(`ราคา < MA200 — Bear market structure`);
      bearPoints += 1;
    }
  }

  const direction =
    bullPoints > bearPoints + 1
      ? "bullish"
      : bearPoints > bullPoints + 1
      ? "bearish"
      : "neutral";

  return { direction, reasons: reasons.slice(0, 3) };
}

// --- Sentiment Score (per-stock "Fear & Greed") ---
// Composite 0–100 score computed from 5 normalized sub-components.
// Weights are tunable — see comments on each component.
//
// Score bands:
//   0–24  → Extreme Fear
//   25–44 → Fear
//   45–54 → Neutral
//   55–74 → Greed
//   75–100→ Extreme Greed

const WEIGHTS = {
  rsi: 0.25,          // RSI momentum
  maTrend: 0.25,      // Price position relative to MA50
  rangePos: 0.20,     // Position in 52-week high/low range
  volatility: 0.15,   // ATR-based volatility (inverted — high vol = fear)
  volumeTrend: 0.15,  // Volume vs 20-day average
};

function clamp(v: number): number {
  return Math.max(0, Math.min(100, v));
}

export function computeSentiment(
  currentPrice: number,
  indicators: TechnicalIndicators,
  latestVolume: number
): SentimentResult {
  // RSI directly maps to 0-100 (already normalized)
  const rsiScore = clamp(indicators.rsi ?? 50);

  // MA Trend: distance from MA50 mapped to 0-100
  // +10% above → 100, at MA50 → 50, -10% below → 0
  let maTrendScore = 50;
  if (indicators.ma50 !== null && indicators.ma50 > 0) {
    const pct = (currentPrice - indicators.ma50) / indicators.ma50;
    maTrendScore = clamp(50 + pct * 500); // ±10% → ±50 points
  }

  // 52-week range position: (price - low52) / (high52 - low52) * 100
  let rangeScore = 50;
  if (indicators.high52w !== null && indicators.low52w !== null) {
    const range = indicators.high52w - indicators.low52w;
    if (range > 0) {
      rangeScore = clamp(((currentPrice - indicators.low52w) / range) * 100);
    }
  }

  // Volatility (inverted): ATR/price ratio — higher ratio = more fear
  // Baseline ATR ratio ~2% → neutral (50). 5%+ → extreme fear (0). 0% → 100
  let volatilityScore = 50;
  if (indicators.atr !== null && currentPrice > 0) {
    const atrRatio = indicators.atr / currentPrice; // e.g. 0.02 = 2%
    volatilityScore = clamp(100 - atrRatio * 2000); // 5% ATR → score 0
  }

  // Volume trend: current volume vs 20-day MA
  let volumeScore = 50;
  if (indicators.volumeMA20 !== null && indicators.volumeMA20 > 0 && latestVolume > 0) {
    const ratio = latestVolume / indicators.volumeMA20;
    // Volume 2× average → greed (100), half → fear (25)
    volumeScore = clamp(ratio * 50);
  }

  const components: SentimentComponents = {
    rsiScore,
    maTrendScore,
    rangeScore,
    volatilityScore,
    volumeScore,
  };

  const score = clamp(
    Math.round(
      rsiScore * WEIGHTS.rsi +
      maTrendScore * WEIGHTS.maTrend +
      rangeScore * WEIGHTS.rangePos +
      volatilityScore * WEIGHTS.volatility +
      volumeScore * WEIGHTS.volumeTrend
    )
  );

  const label =
    score < 25 ? "Extreme Fear" :
    score < 45 ? "Fear" :
    score < 55 ? "Neutral" :
    score < 75 ? "Greed" :
    "Extreme Greed";

  return { score, label, components };
}
