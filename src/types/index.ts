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

// --- Signal types ---

export interface SignalVote {
  indicator: string;
  vote: "buy" | "sell" | "neutral";
  reason: string; // short phrase explaining the vote
}

export interface SignalSummary {
  label: string;        // Thai: "เอนไปทางซื้อ" / "ถือ/สังเกตการณ์" / "เอนไปทางขาย"
  direction: "bullish" | "neutral" | "bearish";
  score: number;        // (buy - sell) / total, range -1..+1
  buyCount: number;
  sellCount: number;
  neutralCount: number;
  votes: SignalVote[];
}

export interface TradeLevels {
  entry: number;     // PP if above PP, else S1
  target1: number;   // R1
  target2: number;   // R2
  stopLoss: number;  // max(S2, entry - 1.5×ATR)
  rrRatio: number;   // (target1 - entry) / (entry - stopLoss)
}

export interface SignalData {
  weekly: SignalSummary;    // short-term: RSI, MACD, EMA20, price vs PP
  monthly: SignalSummary;   // trend: EMA50, EMA200, golden/death cross
  tradeLevels: TradeLevels | null;
}

export interface CandleApiResponse {
  candles: Candle[];
  pivotPoints: PivotPoints | null;
  currentPrice: number;
  isMockData: boolean;
  signals: SignalData | null;
}

export interface QuoteData {
  price: number;
  change: number;
  changePct: number;
  isMock: boolean;
  // Extended / after-hours (present only when FMP returns them and they are recent)
  extendedPrice?: number;
  extendedChangePct?: number;
  extendedTimestamp?: number; // unix seconds
}


export interface ScreenerResult {
  symbol: string;
  name: string;
  price: number;
  yearHigh: number;
  pullbackPct: number;   // (yearHigh - price) / yearHigh, e.g. 0.25 = 25% off ATH
  marketCap: number;     // in USD
  avgVolume: number;
  isMock: boolean;
}
