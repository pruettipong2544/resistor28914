import { NextRequest, NextResponse } from "next/server";
import { fetchKeyMetricsTTM, fetchPrice, mockSeed } from "@/lib/fmp";
import type { DcfApiResponse } from "@/types";

// Fixed DCF assumptions — never exposed to client
const GROWTH_RATE   = 0.10; // 10% for years 1-5
const TERMINAL_G    = 0.03; // 3% terminal growth
const DISCOUNT_RATE = 0.10; // 10% WACC

function computeDcf(fcfPerShare: number): number {
  let pv = 0;
  let fcf = fcfPerShare;
  for (let y = 1; y <= 5; y++) {
    fcf *= (1 + GROWTH_RATE);
    pv += fcf / Math.pow(1 + DISCOUNT_RATE, y);
  }
  const terminalFcf = fcf * (1 + TERMINAL_G);
  pv += (terminalFcf / (DISCOUNT_RATE - TERMINAL_G)) / Math.pow(1 + DISCOUNT_RATE, 5);
  return pv;
}

function mockDcfResult(symbol: string): DcfApiResponse {
  const { price, rand } = mockSeed(symbol);
  if (rand() < 0.3) {
    return { notApplicable: true, reason: "FCF < 0 (ยังไม่มีกำไร — ข้อมูลสาธิต)", isMock: true };
  }
  const fcfPerShare = parseFloat((price * (0.03 + rand() * 0.05)).toFixed(4));
  const intrinsicValue = parseFloat(computeDcf(fcfPerShare).toFixed(2));
  return {
    notApplicable: false,
    intrinsicValue,
    currentPrice: price,
    upside: (intrinsicValue - price) / price,
    fcfPerShare,
    isMock: true,
  };
}

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol")?.toUpperCase();
  if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });

  const { data: metrics, isMock } = await fetchKeyMetricsTTM(symbol);

  if (!isMock && metrics) {
    const fcf = metrics.freeCashFlowPerShareTTM;
    if (fcf === undefined || fcf === null) {
      const resp: DcfApiResponse = { notApplicable: true, reason: "ไม่มีข้อมูล FCF", isMock: false };
      return NextResponse.json(resp, { headers: { "Cache-Control": "public, max-age=3600" } });
    }
    if (fcf <= 0) {
      const resp: DcfApiResponse = { notApplicable: true, reason: `FCF/share = $${fcf.toFixed(2)} (ยังไม่มีกำไร)`, isMock: false };
      return NextResponse.json(resp, { headers: { "Cache-Control": "public, max-age=3600" } });
    }
    const currentPrice = await fetchPrice(symbol);
    const intrinsicValue = parseFloat(computeDcf(fcf).toFixed(2));
    const resp: DcfApiResponse = {
      notApplicable: false,
      intrinsicValue,
      currentPrice,
      upside: currentPrice > 0 ? (intrinsicValue - currentPrice) / currentPrice : 0,
      fcfPerShare: fcf,
      isMock: false,
    };
    return NextResponse.json(resp, { headers: { "Cache-Control": "public, max-age=3600" } });
  }

  return NextResponse.json(mockDcfResult(symbol), { headers: { "Cache-Control": "no-store" } });
}
