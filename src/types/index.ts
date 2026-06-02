export type Timeframe = "1D" | "1W" | "1M" | "1Y";

export interface Quote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  prevClose: number;
  volume: number;
  timestamp: number;
}

export interface Candle {
  time: number; // unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TechnicalIndicators {
  rsi: number | null;
  ma20: number | null;
  ma50: number | null;
  ma200: number | null;
  support: number | null;
  resistance: number | null;
  atr: number | null;
  volumeMA20: number | null;
  high52w: number | null;
  low52w: number | null;
}

export type SignalDirection = "bullish" | "neutral" | "bearish";

export interface TechnicalSignal {
  direction: SignalDirection;
  reasons: string[];
}

export interface SentimentComponents {
  rsiScore: number;       // 0-100
  maTrendScore: number;   // 0-100
  rangeScore: number;     // 0-100: position in 52wk range
  volatilityScore: number;// 0-100: inverted (high vol → low score)
  volumeScore: number;    // 0-100: volume trend
}

export interface SentimentResult {
  score: number; // 0-100 composite
  label: "Extreme Fear" | "Fear" | "Neutral" | "Greed" | "Extreme Greed";
  components: SentimentComponents;
}

export interface StockDetailData {
  candles: Candle[];
  indicators: TechnicalIndicators;
  signalWeekly: TechnicalSignal;
  signalMonthly: TechnicalSignal;
  sentiment: SentimentResult;
  isMockData?: boolean; // true when live API unavailable — shows demo banner in UI
}
