# 🧾 Kachha2GST
> **Handwritten & Paper Receipt-to-Compliance Assistant & Business Intelligence for Micro-Enterprises (MSMEs)**  
> *Track 4: MSME Growth & Productivity (Simplifying Compliance & Tax Filing)*

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-16.4+-black.svg?logo=next.js&logoColor=white)](https://nextjs.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38B2AC.svg?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![Ollama](https://img.shields.io/badge/Ollama-Offline%20Vision-orange.svg?logo=ollama&logoColor=white)](https://ollama.com)

---

## 🎯 The Problem
Kirana shops, hardware stores, and small workshops in India run on messy Hindi, Hinglish, and English paper slips without dedicated accountants.
* **Unflagged Errors:** Missing HSN codes, wrong GST slabs (e.g. 12% billed instead of 18%), invalid GSTINs, and duplicates go unnoticed.
* **Month-End Friction:** Delayed Input Tax Credit (ITC), hefty penalties, and CA back-and-forth drain micro-enterprises.

## 💡 The Solution: AI Reads Paper, Code Guards Every Rupee
Unlike typical AI wrappers that hallucinate math, **Kachha2GST** uses a hybrid architecture:
1. **Local Vision Engine (Ollama):** Reads vernacular handwriting (sariya, atta, taar, cement) into raw tokens — with **Zero AI Calculations**.
2. **Deterministic Mismatch Shield (Python):** 100% pure backend code verifies line-item arithmetic ($qty \times rate = amount$), official statutory GST slabs from `india-hsn-2026.json` (14,416 entries), and computes the exact **At-Risk ITC (₹)**.
3. **From Paper to Business Intelligence:** Transforms raw slips into real-time procurement analytics, top commodities, vendor spending velocity, and gamified **Monthly GST Readiness Scores (e.g., 86/100)**.

---

## ✨ Core Features

### 1. 🛡️ Deterministic Mismatch Shield (Zero AI Guesswork)
* **01. Tax Math Verification:** Checks line multiplications, taxable values, and CGST/SGST/IGST breakdown with decimal precision.
* **02. HSN GST Slab Check:** Validates rates against official `india-hsn-2026.json`.
* **03. GSTIN Checksum Guard:** Validates 15-character Indian GSTIN format and **Modulo-36 Luhn Checksum** to prevent fake/typo vendor tax claims.
* **04. Duplicate Bill Guard:** Flags repeated invoices to stop double ITC claim penalties.
* **At-Risk ITC Calculation:** Computes the exact amount of tax credit in danger of rejection under GST Section 16(2).

### 2. 📊 Business Intelligence & Health Dashboard
* **Spending Velocity:** Tracks total procurement spend vs tax paid.
* **Top Purchased Commodities:** Aggregates quantities & spending on key trade items (TMT Sariya, Cement, Wire, Atta).
* **Top Suppliers:** Ranks vendors by transaction volume.
* **Smart Fraud & Suspicious Pattern Detector:** Warns about sudden price volatility or unverified vendor spikes.

### 3. 🎯 Monthly GST Readiness Score (Gamified Compliance)
* Assigns an instant readiness rating (e.g., **86/100**) with clear tips to reach 100/100.
* Instant visual reward (confetti) when exceptions are resolved!

### 4. 🎙️ Voice-Based Shopkeeper Assistant ("Bol Ke Entry Banao")
* Spoken Hindi/Hinglish billing creator:
  > *"Maine Sharma ji se 10 bundle sariya 600 rupay me kharida aur 5 kilo taar 90 rupay me"*
* Automatically maps vernacular terms to official HSN codes and audits arithmetic in real-time.
* 1-Tap voice fixes: *"Sariya ka tax 18 percent kardo"*.

### 5. 🤖 Vyaapar CA Assistant (Hindi / Hinglish AI Guide)
* Explains tax notices, ITC rejections, and HSN nuances in comforting vernacular language for non-tech shop owners.

### 6. 📱 WhatsApp Billing Bot Simulator
* Demonstrates seamless WhatsApp workflow: Shopkeeper sends photo $\rightarrow$ Bot returns summary + At-Risk ITC alert with 1-Tap approval buttons.

### 7. 📁 Two-Bucket Compliance & GSTR-2B Export
* **Verified / Clean Entries:** Ready for 1-click CSV download formatted for Tally, ClearTax, and GST Portal.
* **CA Exception Queue:** Bundled with original slips and 1-Tap quick fixes.

---

## 🏗️ Architecture & Tech Stack

```
hackwithdelhi/
├── backend/
│   ├── core/
│   │   ├── math_engine.py           # Pure Decimal arithmetic (Rate * Qty, Totals)
│   │   ├── gstin_guard.py           # 15-char Modulo-36 Luhn Checksum Guard
│   │   ├── hsn_validator.py         # Statutory rate validator (14,416 HSN codes)
│   │   ├── alias_resolver.py        # Hinglish vernacular trade dictionary
│   │   ├── duplicate_guard.py       # Duplicate invoice detector
│   │   ├── itc_shield.py            # At-Risk ITC calculation engine
│   │   ├── business_intelligence.py # BI & GST Readiness Score engine
│   │   ├── voice_shopkeeper.py      # Conversational speech-to-bill parser
│   │   └── ai_ca_assistant.py       # Vernacular financial guide
│   ├── ocr_ollama/
│   │   └── extractor.py             # Local Ollama vision/multimodal extractor
│   ├── main.py                      # FastAPI REST server
│   └── requirements.txt
├── frontend/
│   ├── app/
│   │   ├── page.tsx                 # Full Next.js interactive dashboard
│   │   ├── layout.tsx
│   │   └── globals.css              # Tailwind CSS styling
│   └── package.json
└── india-hsn-2026.json              # Official statutory 2026 HSN & GST rate catalog
```

---

## ⚡ Quick Start

### Prerequisites
* Python 3.9+
* Node.js 18+
* [Ollama](https://ollama.com/) (Optional for live image transcription; mock demo mode works out of the box)

### 1. Backend Setup
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py # Runs on http://localhost:8000
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev # Runs on http://localhost:3000
```

### 3. Open Web App
Visit **`http://localhost:3000`** in your browser.

---

## 👥 Built for Hack With Delhi
* **Track 4:** MSME Growth & Productivity
* **Project:** Kachha2GST
