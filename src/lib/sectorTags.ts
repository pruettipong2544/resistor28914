// Auto sector/industry tag lookup — SERVER-SIDE ONLY.
// Used when adding a new stock that has no manual theme mapping in config/stocks.ts.
// Tries FMP profile first, falls back to Finnhub profile2, then a generic tag.

import { getCached, setCached, TTL } from "./cache";

const FMP_BASE = "https://financialmodelingprep.com/stable";
const FINNHUB_BASE = "https://finnhub.io/api/v1";

function fmpKey(): string | null { return process.env.FMP_API_KEY ?? null; }
function finnhubKey(): string | null { return process.env.FINNHUB_API_KEY ?? null; }

// Maps standard sector/industry strings (FMP `sector`, Finnhub `finnhubIndustry`)
// to the short Thai-app tag vocabulary used elsewhere (STOCK_THEMES values).
const SECTOR_TAG_MAP: Record<string, string> = {
  "technology": "Tech",
  "information technology": "Tech",
  "communication services": "Tech",
  "energy": "Energy",
  "utilities": "Energy",
  "financial services": "Fintech",
  "financials": "Fintech",
  "healthcare": "Healthcare",
  "health care": "Healthcare",
  "biotechnology": "Biotech",
  "industrials": "Defense",
  "aerospace & defense": "Defense",
  "consumer cyclical": "Tech",
  "consumer defensive": "Tech",
  "basic materials": "Energy",
  "real estate": "Stock",
  "semiconductors": "Semiconductor",
  "semiconductor": "Semiconductor",
};

function mapSectorToTag(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const key = raw.trim().toLowerCase();
  if (SECTOR_TAG_MAP[key]) return SECTOR_TAG_MAP[key];
  // partial match (e.g. "Semiconductors & Semiconductor Equipment")
  for (const [k, v] of Object.entries(SECTOR_TAG_MAP)) {
    if (key.includes(k)) return v;
  }
  return null;
}

interface FmpProfile {
  sector?: string;
  industry?: string;
}

async function fetchFmpSector(symbol: string): Promise<string | null> {
  const key = fmpKey();
  if (!key) return null;
  try {
    const res = await fetch(`${FMP_BASE}/profile?symbol=${symbol}&apikey=${key}`, { next: { revalidate: 0 } });
    if (!res.ok) return null;
    const json: FmpProfile[] | FmpProfile = await res.json();
    const profile = Array.isArray(json) ? json[0] : json;
    if (!profile) return null;
    return mapSectorToTag(profile.sector) ?? mapSectorToTag(profile.industry);
  } catch {
    return null;
  }
}

interface FinnhubProfile2 {
  finnhubIndustry?: string;
}

async function fetchFinnhubSector(symbol: string): Promise<string | null> {
  const key = finnhubKey();
  if (!key) return null;
  try {
    const res = await fetch(`${FINNHUB_BASE}/stock/profile2?symbol=${symbol}&token=${key}`, { next: { revalidate: 0 } });
    if (!res.ok) return null;
    const json: FinnhubProfile2 = await res.json();
    return mapSectorToTag(json.finnhubIndustry);
  } catch {
    return null;
  }
}

/**
 * Returns one or more short tags for a ticker based on sector/industry data.
 * Chain: FMP profile → Finnhub profile2 → generic "Stock" fallback.
 * Result is cached (24h) since sector classification rarely changes.
 */
export async function fetchAutoTags(symbol: string): Promise<string[]> {
  const cacheKey = `autotags:${symbol}`;
  const cached = getCached<string[]>(cacheKey);
  if (cached) return cached;

  let tag = await fetchFmpSector(symbol);
  if (!tag) tag = await fetchFinnhubSector(symbol);
  const tags = tag ? [tag] : ["Stock"];

  setCached(cacheKey, tags, TTL.PROFILE);
  return tags;
}
