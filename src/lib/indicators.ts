// Technical indicator calculations — server-side only.
// Currently only Pivot Points (Standard) are used.
// Support/Resistance via swing high/low kept for future reference.

import type { Candle, PivotPoints } from "@/types";

// --- Standard Pivot Points ---
// Uses the previous completed bar's High, Low, Close to compute today's levels.
// Levels: PP (pivot), R1/R2/R3 (resistance), S1/S2/S3 (support)
export function computePivotPoints(candles: Candle[]): PivotPoints | null {
  if (candles.length < 2) return null;
  // Second-to-last is the last *completed* bar
  const { high: H, low: L, close: C } = candles[candles.length - 2];
  const PP = (H + L + C) / 3;
  return {
    PP,
    R1: 2 * PP - L,
    R2: PP + (H - L),
    R3: H + 2 * (PP - L),
    S1: 2 * PP - H,
    S2: PP - (H - L),
    S3: L - 2 * (H - PP),
  };
}
