"use client";

import type { SentimentResult } from "@/types";

interface Props {
  sentiment: SentimentResult;
}

const ZONE_COLORS = [
  { max: 24, color: "#ef4444", label: "Extreme Fear" },
  { max: 44, color: "#f97316", label: "Fear" },
  { max: 54, color: "#eab308", label: "Neutral" },
  { max: 74, color: "#84cc16", label: "Greed" },
  { max: 100, color: "#22c55e", label: "Extreme Greed" },
];

function zoneColor(score: number) {
  return ZONE_COLORS.find((z) => score <= z.max)?.color ?? "#22c55e";
}

// Convert score 0-100 → angle in degrees on a half-circle (0=left=180°, 100=right=0°)
function scoreToAngle(score: number): number {
  return 180 - score * 1.8; // 0→180°, 100→0°
}

// SVG arc path for a half-circle sector
function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const x1 = cx + r * Math.cos(toRad(startDeg));
  const y1 = cy + r * Math.sin(toRad(startDeg));
  const x2 = cx + r * Math.cos(toRad(endDeg));
  const y2 = cy + r * Math.sin(toRad(endDeg));
  const largeArc = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
}

export default function SentimentGauge({ sentiment }: Props) {
  const { score, label, components } = sentiment;
  const cx = 120, cy = 110, r = 90, trackW = 22;

  const needleAngle = scoreToAngle(score); // degrees
  const needleRad = (needleAngle * Math.PI) / 180;
  const needleX = cx + (r - 10) * Math.cos(needleRad);
  const needleY = cy + (r - 10) * Math.sin(needleRad);

  const color = zoneColor(score);

  // Zone arc segments (180° span = left 180 to right 0)
  const zones = [
    { start: 180, end: 148, color: "#ef4444" }, // 0-20
    { start: 148, end: 112, color: "#f97316" }, // 20-40
    { start: 112, end: 90,  color: "#eab308" }, // 40-50
    { start: 90,  end: 54,  color: "#84cc16" }, // 50-70
    { start: 54,  end: 0,   color: "#22c55e" }, // 70-100
  ];

  return (
    <div className="bg-slate-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-300">Sentiment Gauge</h3>
        <span className="text-xs text-slate-500">(Custom indicator — ไม่ใช่ CNN Fear & Greed)</span>
      </div>

      <div className="flex flex-col items-center">
        <svg width="240" height="130" viewBox="0 0 240 130">
          {/* Zone arcs */}
          {zones.map((z, i) => (
            <path
              key={i}
              d={arcPath(cx, cy, r, z.start, z.end)}
              fill="none"
              stroke={z.color}
              strokeWidth={trackW}
              strokeLinecap="butt"
              opacity={0.35}
            />
          ))}

          {/* Filled progress arc (from 180° to needle position) */}
          <path
            d={arcPath(cx, cy, r, 180, needleAngle)}
            fill="none"
            stroke={color}
            strokeWidth={trackW}
            strokeLinecap="round"
            opacity={0.85}
          />

          {/* Center circle */}
          <circle cx={cx} cy={cy} r={8} fill="#1e293b" />
          <circle cx={cx} cy={cy} r={5} fill={color} />

          {/* Needle */}
          <line
            x1={cx}
            y1={cy}
            x2={needleX}
            y2={needleY}
            stroke={color}
            strokeWidth={2.5}
            strokeLinecap="round"
          />

          {/* Labels */}
          <text x={12} y={120} fill="#ef4444" fontSize={9} fontWeight="500">Fear</text>
          <text x={188} y={120} fill="#22c55e" fontSize={9} fontWeight="500">Greed</text>

          {/* Score */}
          <text x={cx} y={98} textAnchor="middle" fill={color} fontSize={24} fontWeight="700">
            {score}
          </text>
        </svg>

        <div className="text-center mt-1">
          <span className="text-sm font-bold" style={{ color }}>{label}</span>
        </div>

        {/* Component breakdown */}
        <div className="mt-3 w-full grid grid-cols-2 gap-1.5 text-xs">
          {[
            { key: "RSI momentum", val: components.rsiScore },
            { key: "MA50 trend", val: components.maTrendScore },
            { key: "52wk range", val: components.rangeScore },
            { key: "ความผันผวน", val: components.volatilityScore },
            { key: "Volume trend", val: components.volumeScore },
          ].map(({ key, val }) => (
            <div key={key} className="flex items-center gap-1">
              <span className="text-slate-400 truncate">{key}</span>
              <div className="flex-1 bg-slate-700 rounded-full h-1">
                <div
                  className="h-1 rounded-full"
                  style={{ width: `${val}%`, backgroundColor: zoneColor(val) }}
                />
              </div>
              <span className="text-slate-300 w-6 text-right">{Math.round(val)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
