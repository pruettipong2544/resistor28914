import { NextResponse } from "next/server";
import { probeQuote } from "@/lib/finnhub";
import { probeFmp } from "@/lib/fmp";

export interface HealthResponse {
  finnhub: ProviderStatus;
  fmp: ProviderStatus;
  overall: "real" | "partial" | "mock";
  checkedAt: number; // unix ms
}

interface ProviderStatus {
  configured: boolean; // API key is set in env
  ok: boolean;
  price?: number;      // sample price from AAPL probe
  reason: string;
}

const PROBE_SYMBOL = "AAPL";

export async function GET() {
  const [fhResult, fmpResult] = await Promise.all([
    probeQuote(PROBE_SYMBOL),
    probeFmp(PROBE_SYMBOL),
  ]);

  const finnhub: ProviderStatus = {
    configured: !!process.env.FINNHUB_API_KEY,
    ok: fhResult.ok,
    price: fhResult.price,
    reason: fhResult.reason,
  };

  const fmp: ProviderStatus = {
    configured: !!process.env.FMP_API_KEY,
    ok: fmpResult.ok,
    price: fmpResult.price,
    reason: fmpResult.reason,
  };

  const workingCount = [finnhub, fmp].filter(p => p.ok).length;
  const overall: HealthResponse["overall"] =
    workingCount === 2 ? "real" :
    workingCount === 1 ? "partial" :
    "mock";

  const body: HealthResponse = {
    finnhub,
    fmp,
    overall,
    checkedAt: Date.now(),
  };

  return NextResponse.json(body, {
    headers: { "Cache-Control": "no-store" },
  });
}
