// Default watchlist seed — 21 stocks covering tech, quantum, nuclear, space
export const DEFAULT_STOCKS: string[] = [
  "AAPL","MSFT","NVDA","TSLA","AMZN",
  "IONQ","RGTI","QBTS","OKLO","ASPI",
  "RDW","KTOS","SOFI","NOW","EOSE",
  "ASTS","CRML","AMPX","INTC","AXTI","IREN",
];

// TradingView symbol format (exchange:ticker) — verified for US equities.
// For user-added stocks not in this map, plain ticker is used as fallback
// (TradingView auto-resolves most US tickers without prefix).
export const TV_SYMBOL_MAP: Record<string, string> = {
  AAPL: "NASDAQ:AAPL",
  MSFT: "NASDAQ:MSFT",
  NVDA: "NASDAQ:NVDA",
  TSLA: "NASDAQ:TSLA",
  AMZN: "NASDAQ:AMZN",
  IONQ: "NYSE:IONQ",    // IonQ Inc.
  RGTI: "NASDAQ:RGTI",  // Rigetti Computing
  QBTS: "NYSE:QBTS",    // D-Wave Quantum
  OKLO: "NYSE:OKLO",    // Oklo Inc.
  ASPI: "NASDAQ:ASPI",  // ASP Isotopes (≠ APSI — different company)
  RDW:  "NYSE:RDW",     // Redwire Corporation
  KTOS: "NASDAQ:KTOS",  // Kratos Defense
  SOFI: "NASDAQ:SOFI",  // SoFi Technologies
  NOW:  "NYSE:NOW",     // ServiceNow
  EOSE: "NASDAQ:EOSE",  // Eos Energy Enterprises
  ASTS: "NASDAQ:ASTS",  // AST SpaceMobile
  CRML: "NASDAQ:CRML",  // Carisma Therapeutics — verify if delisted
  AMPX: "NYSE:AMPX",    // Amprius Technologies
  INTC: "NASDAQ:INTC",  // Intel
  AXTI: "NASDAQ:AXTI",  // AXT Inc.
  IREN: "NASDAQ:IREN",  // Iris Energy
};

// Static company names for the default 21 stocks (no API call needed)
export const COMPANY_NAMES: Record<string, string> = {
  AAPL: "Apple Inc.",
  MSFT: "Microsoft Corp.",
  NVDA: "NVIDIA Corp.",
  TSLA: "Tesla Inc.",
  AMZN: "Amazon.com Inc.",
  IONQ: "IonQ Inc.",
  RGTI: "Rigetti Computing",
  QBTS: "D-Wave Quantum",
  OKLO: "Oklo Inc.",
  ASPI: "ASP Isotopes",
  RDW:  "Redwire Corp.",
  KTOS: "Kratos Defense",
  SOFI: "SoFi Technologies",
  NOW:  "ServiceNow Inc.",
  EOSE: "Eos Energy",
  ASTS: "AST SpaceMobile",
  CRML: "Carisma Therapeutics",
  AMPX: "Amprius Technologies",
  INTC: "Intel Corp.",
  AXTI: "AXT Inc.",
  IREN: "Iris Energy",
};

/** Returns TV-formatted symbol, falling back to plain ticker for user-added stocks */
export function getTvSymbol(ticker: string): string {
  return TV_SYMBOL_MAP[ticker] ?? ticker;
}

/** Returns company name, falling back to ticker for user-added stocks */
export function getCompanyName(ticker: string): string {
  return COMPANY_NAMES[ticker] ?? ticker;
}

export const STOCK_THEMES: Record<string, string[]> = {
  AAPL: ["AI", "Tech"],
  MSFT: ["AI", "Tech"],
  NVDA: ["AI", "Semiconductor"],
  TSLA: ["EV", "AI"],
  AMZN: ["AI", "Tech"],
  IONQ: ["Quantum"],
  RGTI: ["Quantum"],
  QBTS: ["Quantum"],
  OKLO: ["Nuclear"],
  ASPI: ["Nuclear"],
  RDW:  ["Space", "Defense"],
  KTOS: ["Defense"],
  SOFI: ["Fintech"],
  NOW:  ["AI", "Tech"],
  EOSE: ["Energy"],
  ASTS: ["Space"],
  CRML: ["Biotech"],
  AMPX: ["Energy", "Semiconductor"],
  INTC: ["AI", "Semiconductor"],
  AXTI: ["Semiconductor"],
  IREN: ["Crypto", "AI"],
};

export const ALL_THEMES = Array.from(new Set(Object.values(STOCK_THEMES).flat())).sort();

export function getThemes(ticker: string): string[] { return STOCK_THEMES[ticker] ?? []; }
