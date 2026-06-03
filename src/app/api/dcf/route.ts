import { NextRequest, NextResponse } from "next/server";
import type { DcfApiResponse } from "@/types";

// Fixed DCF assumptions — never exposed to client
const GROWTH_RATE   = 0.10;  // 10% for years 1-5
const TERMINAL_G    = 0.03;  // 3% terminal growth
const DISCOUNT_RATE = 0.10;  // 10% WACC

function computeDcf(fcfPerShare: number): number {
  let pv = 0;
  let fcf = fcfPerShare;
  for (let y = 1; y <= 5; y++) {
    fcf *= (1 + GROWTH_RATE);
    pv += fcf / Math.pow(1 + DISCOUNT_RATE, y);
  }
  // Terminal value (Gordon Growth Model)
  const terminalFcf = fcf * (1 + TERMINAL_G);
  const terminalValue = terminalFcf / (DISCOUNT_RATE - TERMINAL_G);
  pv += terminalValue / Math.pow(1 + DISCOUNT_RATE, 5);
  return pv;
}

function mockDcf(symbol: string): DcfApiResponse {
  const seed = symbol.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  let rng = (seed * 69069 + 1) >>> 0;
  const rand = () => { rng = (rng * 1664525 + 1013904223) & 0xffffffff; return (rng >>> 0) / 0xffffffff; };
  const base = (seed % 280) + 20;
  const price = parseFloat((base * (0.85 + rand() * 0.3)).toFixed(2));
  // Mock: ~30% of symbols are "not applicable"
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

interface FmpKeyMetrics { freeCashFlowPerShareTTM?: number }

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol")?.toUpperCase();
  if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });

  const apiKey = process.env.FMP_API_KEY;

  if (apiKey) {
    try {
      const res = await fetch(
        `https://financialmodelingprep.com/api/v3/key-metrics-ttm/${symbol}?apikey=${apiKey}`,
        { next: { revalidate: 3600 } }
      );
      if (res.ok) {
        const data: FmpKeyMetrics[] = await res.json();
        const metrics = Array.isArray(data) ? data[0] : null;
        if (metrics) {
          const fcf = metrics.freeCashFlowPerShareTTM;
          if (fcf === undefined || fcf === null) {
            const resp: DcfApiResponse = { notApplicable: true, reason: "ไม่มีข้อมูล FCF", isMock: false };
            return NextResponse.json(resp, { headers: { "Cache-Control": "public, max-age=3600" } });
          }
          if (fcf <= 0) {
            const resp: DcfApiResponse = { notApplicable: true, reason: `FCF/share = $${fcf.toFixed(2)} (ยังไม่มีกำไร)`, isMock: false };
            return NextResponse.json(resp, { headers: { "Cache-Control": "public, max-age=3600" } });
          }
          // Fetch current price from quotes API (same process, avoid re-calling FMP for price)
          let currentPrice = 0;
          try {
            const qRes = await fetch(
              `https://financialmodelingprep.com/api/v3/quote-short/${symbol}?apikey=${apiKey}`,
              { next: { revalidate: 60 } }
            );
            if (qRes.ok) {
              const qData: { price?: number }[] = await qRes.json();
              currentPrice = qData[0]?.price ?? 0;
            }
          } catch { /* ignore */ }

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
      }
    } catch { /* fall through */ }
  }

  return NextResponse.json(mockDcf(symbol), { headers: { "Cache-Control": "no-store" } });
}
