"use client";

export default function Disclaimer() {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur border-t border-slate-700 px-4 py-2 text-center text-xs text-slate-400">
      ⚠️ ข้อมูลราคาอาจมีดีเลย์ 15–30 วินาที • ข้อมูลและสัญญาณทางเทคนิคทั้งหมดใช้เพื่อการศึกษาเท่านั้น{" "}
      <strong className="text-amber-400">ไม่ใช่คำแนะนำการลงทุน</strong> • การลงทุนมีความเสี่ยง ผู้ลงทุนควรศึกษาข้อมูลก่อนตัดสินใจ
    </div>
  );
}
