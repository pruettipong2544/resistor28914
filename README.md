# 📈 Stock Dashboard — แดชบอร์ดหุ้นสหรัฐ

แดชบอร์ดติดตามราคาหุ้นสหรัฐ 21 ตัว พร้อมการวิเคราะห์ทางเทคนิคและ sentiment รายตัว

**Stack:** Next.js 14 (App Router) · TypeScript · Tailwind CSS · Recharts  
**API:** Finnhub (ผ่าน server-side proxy — API key ไม่เปิดเผยสู่ client)

---

## 🚀 เริ่มต้นใช้งาน

### 1. ขอ API Key จาก Finnhub

1. ไปที่ [https://finnhub.io/register](https://finnhub.io/register)
2. สมัครบัญชีฟรี (ไม่ต้องใส่บัตรเครดิต)
3. หลัง login ไปที่ [Dashboard](https://finnhub.io/dashboard) แล้วคัดลอก API Key

**Free tier:** 60 requests/minute · ครอบคลุมทุก ticker ในรายการ · ไม่หมดอายุ

### 2. ตั้งค่า Environment Variable

```bash
cp .env.local.example .env.local
```

แล้วแก้ไขไฟล์ `.env.local`:

```env
FINNHUB_API_KEY=your_actual_api_key_here
```

> ⚠️ ห้าม commit ไฟล์ `.env.local` — มีอยู่ใน `.gitignore` แล้ว

### 3. ติดตั้ง Dependencies

```bash
npm install
```

### 4. รัน Development Server

```bash
npm run dev
```

เปิด [http://localhost:3000](http://localhost:3000)

---

## ✨ ฟีเจอร์

| ฟีเจอร์ | รายละเอียด |
|---|---|
| **หุ้น 21 ตัวเริ่มต้น** | AAPL MSFT NVDA TSLA AMZN + quantum/nuclear/space stocks |
| **ราคา near real-time** | อัพเดตทุก 30 วินาที ผ่าน server proxy |
| **กราฟ multi-timeframe** | 1D / 1W / 1M / 1Y พร้อม MA20, MA50, Volume, RSI |
| **แนวรับ/แนวต้าน** | คำนวณจาก swing lows/highs อัตโนมัติ |
| **สัญญาณเทคนิค** | ระยะ 1 สัปดาห์ และ 1 เดือน พร้อมเหตุผล |
| **Sentiment Gauge** | Composite score 0–100 (Fear/Greed) รายหุ้น |
| **จัดการ Watchlist** | เพิ่ม/ลบ/ซ่อนหุ้น บันทึกใน localStorage |
| **Validate Ticker** | ตรวจสอบกับ API ก่อนเพิ่ม กัน ticker มั่ว |
| **Responsive** | มือถือ + เดสก์ท็อป |

---

## 🏗️ สถาปัตยกรรม

```
src/
├── app/
│   ├── api/
│   │   ├── quotes/route.ts   # Server proxy — batch quote fetch
│   │   ├── candles/route.ts  # Server proxy — chart data + indicators
│   │   └── validate/route.ts # Server proxy — ticker validation
│   ├── layout.tsx
│   └── page.tsx              # Main dashboard (client component)
├── components/
│   ├── StockCard.tsx          # การ์ดสรุปรายตัว + sparkline
│   ├── StockDetail.tsx        # Modal รายละเอียด
│   ├── PriceChart.tsx         # กราฟ Recharts + MA + Volume + RSI
│   ├── SentimentGauge.tsx     # Gauge ครึ่งวงกลม SVG
│   ├── SignalBadge.tsx        # ป้ายสัญญาณซื้อ/ขาย/กลาง
│   ├── AddStockModal.tsx      # Modal เพิ่มหุ้น
│   └── HiddenList.tsx         # รายการหุ้นที่ซ่อนไว้
├── hooks/
│   └── useWatchlist.ts        # localStorage abstraction layer
├── lib/
│   ├── cache.ts               # In-memory TTL cache (server-side)
│   ├── finnhub.ts             # Finnhub API client (server-side only)
│   ├── indicators.ts          # RSI, MA, ATR, Support/Resistance, Sentiment
│   └── indicators.test.ts     # Unit tests
├── config/
│   └── stocks.ts              # Default seed list (แก้ที่นี่ที่เดียว)
└── types/
    └── index.ts               # TypeScript interfaces
```

### ความปลอดภัย API Key

- API key อยู่ใน `.env.local` ฝั่ง server เท่านั้น
- Client ไม่เคยเห็น key — ทุก request วิ่งผ่าน `/api/*` routes
- ตรวจสอบด้วย DevTools → Network ว่าไม่มี key ใน payload

### Caching

| ข้อมูล | TTL |
|---|---|
| ราคาหุ้น (quote) | 30 วินาที |
| กราฟ 1D | 5 นาที |
| กราฟ 1W | 15 นาที |
| กราฟ 1M | 30 นาที |
| กราฟ 1Y | 1 ชั่วโมง |
| ชื่อบริษัท (profile) | 24 ชั่วโมง |

---

## 🧮 Sentiment Gauge

Custom indicator คำนวณเองต่อหุ้น **ไม่ใช่** CNN Fear & Greed Index

| องค์ประกอบ | น้ำหนัก | อธิบาย |
|---|---|---|
| RSI(14) | 25% | โมเมนตัม — RSI สูง = greed |
| ราคา vs MA50 | 25% | เทรนด์ — เหนือ MA50 = greed |
| ตำแหน่งใน 52wk range | 20% | ใกล้ high = greed |
| ความผันผวน (ATR) | 15% | inverted — ผันผวนสูง = fear |
| Volume trend | 15% | volume > MA20 = greed |

แก้น้ำหนักได้ที่ `src/lib/indicators.ts` → `WEIGHTS`

---

## 🧪 รัน Tests

```bash
npm test
```

Tests ครอบคลุม: RSI, SMA, Support/Resistance, Sentiment score bounds

---

## ⚠️ ข้อจำกัด

- **localStorage** — watchlist ผูกกับเบราว์เซอร์/เครื่องนั้น เปลี่ยนเครื่องหรือล้าง browser data รายการจะหาย
- **ข้อมูลอาจมีดีเลย์** 15–30 วินาที และอาจไม่ครบถ้วนสมบูรณ์
- **ไม่ใช่คำแนะนำการลงทุน** — สัญญาณและข้อมูลทั้งหมดใช้เพื่อการศึกษาเท่านั้น
- **Finnhub free tier** — 60 req/min หากใช้งานหนักอาจ rate limit ชั่วคราว

---

## 🔧 เพิ่ม/ลบหุ้น Default

แก้ไข `src/config/stocks.ts`:

```typescript
export const DEFAULT_STOCKS = ["AAPL", "MSFT", /* เพิ่มที่นี่ */];
```

ผู้ใช้สามารถแก้รายการของตัวเองผ่าน UI ได้ โดยบันทึกใน localStorage
