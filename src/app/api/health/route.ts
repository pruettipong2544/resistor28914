import { NextResponse } from "next/server";
import { probeQuote } from "@/lib/finnhub";
import { probeFmp } from "@/lib/fmp";
import { probeTwelveData } from "@/lib/twelvedata";

export interface HealthResponse {
  finnhub: ProviderStatus;
  fmp: ProviderStatus;
  twelvedata: ProviderStatus;
  overall: "real" | "partial" | "mock";
  checkedAt: number; // unix ms
}

interface ProviderStatus {
  configured: boolean;
  ok: boolean;
  price?: number;
  reason: string;
}

const PROBE_SYMBOL = "AAPL";

export async function GET() {
  const [fhResult, fmpResult, tdResult] = await Promise.all([
    probeQuote(PROBE_SYMBOL),
    probeFmp(PROBE_SYMBOL),
    probeTwelveData(PROBE_SYMBOL),
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

  const twelvedata: ProviderStatus = {
    configured: !!process.env.TWELVEDATA_API_KEY,
    ok: tdResult.ok,
    reason: tdResult.reason,
  };

  const workingCount = [finnhub, fmp, twelvedata].filter(p => p.ok).length;
  const overall: HealthResponse["overall"] =
    workingCount === 3 ? "real" :
    workingCount >= 1 ? "partial" :
    "mock";

  const body: HealthResponse = {
    finnhub,
    fmp,
    twelvedata,
    overall,
    checkedAt: Date.now(),
  };

  return NextResponse.json(body, {
    headers: { "Cache-Control": "no-store" },
  });
}
