"use client";

import { useState, useEffect } from "react";

interface Props {
  date: Date | null;
  label?: string;
  className?: string;
}

function elapsed(d: Date): string {
  const secs = Math.floor((Date.now() - d.getTime()) / 1000);
  if (secs < 10) return "เมื่อสักครู่";
  if (secs < 60) return `${secs} วินาทีที่แล้ว`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} นาทีที่แล้ว`;
  return d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default function Timestamp({ date, label = "อัปเดต", className = "" }: Props) {
  const [text, setText] = useState("");

  useEffect(() => {
    if (!date) { setText(""); return; }
    setText(elapsed(date));
    const id = setInterval(() => setText(elapsed(date)), 15_000);
    return () => clearInterval(id);
  }, [date]);

  if (!date || !text) return null;
  return (
    <span className={`text-[10px] text-slate-500 ${className}`}>
      {label} {text}
    </span>
  );
}
