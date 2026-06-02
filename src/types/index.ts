export type Timeframe = "1D" | "1W" | "1M" | "1Y";

export interface Candle {
  time: number; // unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface PivotPoints {
  PP: number;
  R1: number; R2: number; R3: number;
  S1: number; S2: number; S3: number;
}

export interface CandleApiResponse {
  candles: Candle[];
  pivotPoints: PivotPoints | null;
  currentPrice: number;
  isMockData: boolean;
}
