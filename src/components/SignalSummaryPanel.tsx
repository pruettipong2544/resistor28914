"use client";

import type { SignalData, SignalSummary, TradeLevels } from "@/types";

interface Props {
  signals: SignalData;
  currentPrice: number;
}

// ── Direction badge ────────────────────────────────────────────────────────────

function DirectionBadge({ summary }: { summary: SignalSummary }) {
  const cfg = {
    bullish: { bg: "bg-green-900/40 border-green-600/50", text: "text-green-300", icon: "▲" },
    neutral: { bg: "bg-slate-700/40 border-slate-500/50",  text: "text-slate-300",  icon: "—" },
    bearish: { bg: "bg-red-900/40 border-red-600/50",      text: "text-red-300",    icon: "▼" },
  }[summary.direction];

  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-sm font-semibold ${cfg.bg} ${cfg.text}`}>
      <span>{cfg.icon}</span>
      <span>{summary.label}</span>
    </div>
  );
}

// ── Vote list ─────────────────────────────────────────────────────────────────

function VoteList({ summary }: { summary: SignalSummary }) {
  const colors = { buy: "text-green-400", sell: "text-red-400", neutral: "text-slate-400" };
  const icons  = { buy: "↑", sell: "↓", neutral: "–" };
  return (
    <div className="space-y-1 mt-2">
      {summary.votes.map((v, i) => (
        <div key={i} className="flex items-baseline gap-2 text-xs">
          <span className={`font-mono font-semibold w-4 flex-shrink-0 ${colors[v.vote]}`}>{icons[v.vote]}</span>
          <span className="text-slate-400 w-24 flex-shrink-0">{v.indicator}</span>
          <span className="text-slate-300">{v.reason}</span>
        </div>
      ))}
    </div>
  );
}

// ── Score bar ─────────────────────────────────────────────────────────────────

function ScoreBar({ summary }: { summary: SignalSummary }) {
  const { buyCount, sellCount, neutralCount } = summary;
  const total = buyCount + sellCount + neutralCount || 1;
  return (
    <div className="flex gap-1 h-2 rounded-full overflow-hidden mt-2">
      <div className="bg-green-600" style={{ width: `${(buyCount / total) * 100}%` }} />
      <div className="bg-slate-600" style={{ width: `${(neutralCount / total) * 100}%` }} />
      <div className="bg-red-600"   style={{ width: `${(sellCount / total) * 100}%` }} />
    </div>
  );
}

// ── Signal section ────────────────────────────────────────────────────────────

function SignalSection({ title, summary, indicators }: { title: string; summary: SignalSummary; indicators: string }) {
  return (
    <div className="bg-slate-800/70 rounded-xl p-3 space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="text-xs font-semibold text-slate-400">{title}</span>
        <DirectionBadge summary={summary} />
      </div>
      <ScoreBar summary={summary} />
      <div className="flex gap-3 text-xs">
        <span className="text-green-400">Buy {summary.buyCount}</span>
        <span className="text-slate-500">Neutral {summary.neutralCount}</span>
        <span className="text-red-400">Sell {summary.sellCount}</span>
      </div>
      <VoteList summary={summary} />
      <p className="text-[10px] text-slate-600 mt-1">Indicators: {indicators}</p>
    </div>
  );
}

// ── Trade levels ──────────────────────────────────────────────────────────────

function pct(a: number, b: number) {
  return ((a - b) / b * 100).toFixed(2) + "%";
}

function TradeLevelsCard({ levels, cur }: { levels: TradeLevels; cur: number }) {
  const rr = levels.rrRatio.toFixed(2);
  return (
    <div className="bg-slate-800/70 rounded-xl p-3 space-y-2">
      <h4 className="text-xs font-semibold text-slate-400">ระดับราคาเชิงเทคนิค (Pivot + ATR)</h4>
      <div className="grid grid-cols-2 gap-2 text-xs">
        {[
          { label: "แนวเข้า (Entry)",        val: levels.entry,    color: "text-sky-300" },
          { label: "เป้าหมาย 1 (Target 1)",  val: levels.target1,  color: "text-green-300" },
          { label: "เป้าหมาย 2 (Target 2)",  val: levels.target2,  color: "text-green-400" },
          { label: "ตัดขาดทุน (Stop Loss)",  val: levels.stopLoss, color: "text-red-400" },
        ].map(({ label, val, color }) => (
          <div key={label} className="bg-slate-700/50 rounded p-2">
            <p className="text-slate-500 text-[10px]">{label}</p>
            <p className={`font-mono font-semibold ${color}`}>${val.toFixed(2)}</p>
            <p className="text-slate-500 text-[10px]">{pct(val, cur)} จากราคา</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-400">
        Risk:Reward ≈ <span className="font-semibold text-slate-200">1:{rr}</span>
        <span className="text-slate-600 ml-1">(entry→T1 vs entry→stop)</span>
      </p>
      <p className="text-[10px] text-slate-600">
        Entry = PP หรือ S1 ตาม pivot, Stop = max(S2, Entry−1.5×ATR)
      </p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

const WEEKLY_INDICATORS  = "RSI(14), EMA(20), MACD(12,26,9), Pivot PP";
const MONTHLY_INDICATORS = "EMA(50), EMA(200), Golden/Death cross, RSI(14), Pivot PP";

export default function SignalSummaryPanel({ signals, currentPrice }: Props) {
  return (
    <div className="space-y-3">
      {/* Big disclaimer — required */}
      <div className="bg-amber-900/20 border border-amber-700/40 rounded-xl px-3 py-2 text-xs text-amber-400 leading-relaxed">
        <strong>⚠ สัญญาณเชิงสถิติ/เทคนิค — ไม่ใช่คำแนะนำการลงทุน</strong><br />
        ตัวเลขด้านล่างคำนวณจากกฎ indicator อัตโนมัติ ไม่ใช่ความเห็น
        ผลอาจผิดพลาด โปรดตัดสินใจเองและศึกษาข้อมูลเพิ่มเติมก่อนลงทุน
      </div>

      <SignalSection
        title="สัญญาณระยะสั้น (รายสัปดาห์)"
        summary={signals.weekly}
        indicators={WEEKLY_INDICATORS}
      />

      <SignalSection
        title="สัญญาณเทรนด์ (รายเดือน)"
        summary={signals.monthly}
        indicators={MONTHLY_INDICATORS}
      />

      {signals.tradeLevels && (
        <TradeLevelsCard levels={signals.tradeLevels} cur={currentPrice} />
      )}
    </div>
  );
}
