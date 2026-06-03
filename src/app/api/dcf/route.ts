import { NextRequest, NextResponse } from "next/server";
import { fetchFmpDcf, mockSeed } from "@/lib/fmp";
import type { DcfApiResponse } from "@/types";

function mockDcfResult(symbol: string): DcfApiResponse {
  const { price, rand } = mockSeed(symbol);
  if (rand() < 0.3) {
    return { notApplicable: true, reason: "FCF < 0 (ยังไม่มีกำไร — ข้อมูลสาธิต)", isMock: true };
  }
  const fcfPerShare = parseFloat((price * (0.03 + rand() * 0.05)).toFixed(4));
  // Simple DCF mock: 10% growth × 5y, 10% WACC, 3% terminal
  let pv = 0, fcf = fcfPerShare;
  for (let y = 1; y <= 5; y++) { fcf *= 1.1; pv += fcf / Math.pow(1.1, y); }
  pv += (fcf * 1.03 / (0.10 - 0.03)) / Math.pow(1.1, 5);
  return {
    notApplicable: false,
    intrinsicValue: parseFloat(pv.toFixed(2)),
    currentPrice: price,
    upside: (pv - price) / price,
    fcfPerShare,
    isMock: true,
  };
}

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol")?.toUpperCase();
  if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });

  const { data, isMock, planError } = await fetchFmpDcf(symbol);

  if (!isMock && data) {
    const resp: DcfApiResponse = {
      notApplicable: false,
      intrinsicValue: parseFloat(data.dcf.toFixed(2)),
      currentPrice: data.stockPrice,
      upside: data.stockPrice > 0 ? (data.dcf - data.stockPrice) / data.stockPrice : 0,
      isMock: false,
    };
    return NextResponse.json(resp, { headers: { "Cache-Control": "public, max-age=3600" } });
  }

  if (planError) {
    const resp: DcfApiResponse = {
      notApplicable: true,
      reason: "endpoint นี้ต้องการ FMP plan ที่สูงกว่า free",
      isMock: false,
    };
    return NextResponse.json(resp, { headers: { "Cache-Control": "public, max-age=3600" } });
  }

  return NextResponse.json(mockDcfResult(symbol), { headers: { "Cache-Control": "no-store" } });
}
