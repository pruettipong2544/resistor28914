# Stock Dashboard

แดชบอร์ดหุ้น Next.js 14 พร้อม TradingView widgets, แนวรับ/แนวต้าน, Signal Summary, DCF Valuation และ ATH Pullback Screener

## เริ่มต้นใช้งาน

```bash
npm install
npm run dev        # เปิดที่ http://localhost:3000
npm run build      # build production
```

## ตั้งค่า API Keys

สร้างไฟล์ `.env.local` ที่ root ของโปรเจกต์:

```env
# Finnhub — ราคาหุ้น + OHLCV candles
# สมัครฟรีที่ https://finnhub.io/register (60 req/min)
FINNHUB_API_KEY=your_finnhub_key_here

# Financial Modeling Prep (FMP) — ราคา, DCF fundamentals, screener
# สมัครฟรีที่ https://financialmodelingprep.com/developer/docs (250 req/day free)
FMP_API_KEY=your_fmp_key_here
```

> **หมายเหตุ:** `.env.local` อยู่ใน `.gitignore` แล้ว — ไม่มีทางรั่วขึ้น git

---

## ทำไมถึงขึ้น MOCK / placeholder?

badge **REAL / PARTIAL / MOCK** มุมขวาของ header คือตัวบอกสถานะแบบ real-time — คลิกเพื่อดูรายละเอียด

### สาเหตุที่พบบ่อย

| อาการ | สาเหตุ | วิธีแก้ |
|-------|--------|---------|
| การ์ดโชว์ "ต่อ API จริงเพื่อดูราคา" | `FINNHUB_API_KEY` หรือ `FMP_API_KEY` ไม่ได้ตั้งค่า | เพิ่ม key ใน `.env.local` แล้วรีสตาร์ท |
| แนวรับ/แนวต้านไม่โชว์ | Candle data เป็น mock (ทั้ง Finnhub และ FMP ล้มเหลว) | ดู log ในเทอร์มินัล server |
| DCF โชว์ "ต่อ FMP_API_KEY" | ไม่มี `FMP_API_KEY` | เพิ่ม key ใน `.env.local` |
| ATH Screener โชว์ placeholder | ไม่มี `FMP_API_KEY` | เพิ่ม key ใน `.env.local` |
| มี key แต่ยังเป็น mock | API call ล้มเหลว (network/rate limit/IP block) | ดู log และ `/api/health` |

### ดู log โดยตรง

เมื่อรัน `npm run dev` log จะขึ้นในเทอร์มินัล:

```
[finnhub:quote:NVDA] ok — price=222.81
[finnhub:quote:IONQ] fail — HTTP 429 — rate limited
[fmp:quote] ok — 21/21 symbols
[fmp:hist:AAPL] ok — 30 bars
[candles:TSLA:1M] both providers failed — using mock data
```

### ตรวจสอบ health ด้วย API

```bash
curl http://localhost:3000/api/health | jq
```

```json
{
  "finnhub": { "configured": true, "ok": true, "price": 189.30, "reason": "ok" },
  "fmp": { "configured": false, "ok": false, "reason": "missing FMP_API_KEY" },
  "overall": "partial",
  "checkedAt": 1717430400000
}
```

---

## รันนอก sandbox (local / production)

### Local development

```bash
git clone https://github.com/pruettipong2544/resistor28914
cd resistor28914
npm install
cp .env.local.example .env.local   # แล้วใส่ key จริง
npm run dev
```

> ถ้ารัน local แล้ว log ขึ้น `network error — ECONNREFUSED` แสดงว่า sandbox/container นั้น block outbound ไปยัง API — ลองรันบนเครื่องตัวเองแทน

### Production (Vercel)

1. Push โค้ดขึ้น GitHub
2. Import project ใน [vercel.com](https://vercel.com)
3. ใส่ environment variables ใน **Vercel Dashboard → Settings → Environment Variables**:
   - `FINNHUB_API_KEY`
   - `FMP_API_KEY`
4. Deploy (Vercel จะ redeploy อัตโนมัติ)

> **สำคัญ:** ทั้งสอง key ต้องอยู่ฝั่ง server เท่านั้น — ห้ามใช้ prefix `NEXT_PUBLIC_` เด็ดขาด มิฉะนั้น key จะรั่วไปยัง browser

---

## สถาปัตยกรรมข้อมูล

```
Client (browser)
    │
    ├─ TradingView widgets (chart, TA, ticker tape, price) ← ข้อมูลจาก TradingView โดยตรง
    │
    └─ Next.js API Routes (server-side — key ไม่รั่ว client)
           ├─ /api/quotes   → Finnhub quote → FMP quote → mock (isMock: true)
           ├─ /api/candles  → Finnhub OHLCV → FMP OHLCV → mock (isMock: true)
           ├─ /api/dcf      → FMP key-metrics-ttm → "ต่อ API จริง" placeholder
           ├─ /api/screener → FMP stock-screener  → "ต่อ API จริง" placeholder
           └─ /api/health   → probe ทั้งสอง provider แล้วคืนสถานะ JSON
```

## Features

| Feature | Provider | Fallback |
|---------|----------|---------|
| กราฟ (chart) | TradingView | — (เสมอ) |
| ราคา popup + after-hours | TradingView + FMP/Finnhub | TV เสมอ |
| การ์ดหน้าแรก (ราคา + %) | Finnhub → FMP | placeholder |
| แนวรับ/แนวต้าน | Finnhub → FMP OHLCV | ซ่อน |
| Signal Summary | Finnhub → FMP OHLCV | ซ่อน |
| DCF Valuation | FMP key-metrics-ttm | placeholder |
| ATH Screener | FMP screener + quotes | placeholder |
| Theme filter | Static config | เสมอ |
