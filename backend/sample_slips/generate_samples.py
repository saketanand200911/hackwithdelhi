"""
Generator for Realistic Indian Kachha Bills & Receipts
Produces SVGs and JSON fixtures for instant hackathon demo.
"""

import os
import json

SAMPLE_BILLS = [
    {
        "id": "sample-1-hardware-flawed",
        "title": "Sharma Ji Iron & Hardware (Flagged Slip)",
        "subtitle": "Hinglish slip with Wrong GST Slab (12% vs 18%) & Line Math Error",
        "category": "Hardware / TMT",
        "badge": "FLAGGED (At-Risk ITC)",
        "bill_data": {
            "vendor_name": "Sharma Ji Loha & Hardware",
            "vendor_gstin": "07AAAAA0000A1Z4",
            "invoice_no": "SH-2026/089",
            "date": "2026-11-20",
            "items": [
                {
                    "name": "TATA Sariya 12mm",
                    "qty": 10,
                    "rate": 600,
                    "amount": 6000,
                    "tax_rate": 12, # Intentional flaw: Sariya HSN 7214 has 18% GST!
                    "hsn": "" # Missing HSN: Hinglish alias will resolve to 7214
                },
                {
                    "name": "Binding Taar (Wire)",
                    "qty": 5,
                    "rate": 90,
                    "amount": 550, # Intentional flaw: 5 * 90 = 450, slip wrote 550!
                    "tax_rate": 18,
                    "hsn": "7217"
                }
            ],
            "taxable_amount": 6550,
            "tax_amount": 819,
            "grand_total": 7369
        },
        "svg_text": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 450 620" width="100%" height="100%" style="background:#fdfbf7; font-family:'Courier New', monospace; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
  <defs>
    <filter id="roughpaper">
      <feTurbulence type="fractalNoise" baseFrequency="0.04" result="noise" numOctaves="5"/>
      <feDiffuseLighting in="noise" lighting-color="#fff8e7" surfaceScale="1.2">
        <feDistantLight azimuth="60" elevation="50"/>
      </feDiffuseLighting>
      <feBlend mode="multiply" in="SourceGraphic"/>
    </filter>
  </defs>
  <rect width="450" height="620" fill="#fcf8ed" stroke="#dcd3c1" stroke-width="2"/>
  <rect x="15" y="15" width="420" height="590" fill="none" stroke="#2563eb" stroke-dasharray="6,4" stroke-width="1.5"/>
  
  <text x="225" y="55" font-size="20" font-weight="bold" fill="#1e293b" text-anchor="middle">SHARMA JI LOHA &amp; HARDWARE</text>
  <text x="225" y="75" font-size="12" fill="#475569" text-anchor="middle">Ring Road, Maya Puri Ind. Area, New Delhi - 110064</text>
  <text x="225" y="92" font-size="11" fill="#1e3a8a" text-anchor="middle">GSTIN: 07AAAAA0000A1Z4 | Mob: 9811XXXXXX</text>
  
  <line x1="25" y1="105" x2="425" y2="105" stroke="#1e293b" stroke-width="1.5"/>
  
  <text x="35" y="130" font-size="13" font-weight="bold" fill="#0f172a">ESTIMATE / KACHHA BILL</text>
  <text x="280" y="130" font-size="12" fill="#334155">Inv: SH-2026/089</text>
  <text x="280" y="150" font-size="12" fill="#334155">Date: 20-11-2026</text>
  <text x="35" y="150" font-size="12" fill="#334155">Buyer: Verma Construction</text>

  <!-- Table Header -->
  <line x1="25" y1="165" x2="425" y2="165" stroke="#64748b" stroke-width="1"/>
  <text x="35" y="182" font-size="11" font-weight="bold" fill="#0f172a">ITEM DESCRIPTION</text>
  <text x="220" y="182" font-size="11" font-weight="bold" fill="#0f172a">QTY</text>
  <text x="280" y="182" font-size="11" font-weight="bold" fill="#0f172a">RATE</text>
  <text x="360" y="182" font-size="11" font-weight="bold" fill="#0f172a">AMOUNT (₹)</text>
  <line x1="25" y1="192" x2="425" y2="192" stroke="#64748b" stroke-width="1"/>

  <!-- Row 1 -->
  <text x="35" y="220" font-size="13" font-family="'Caveat', cursive, sans-serif" fill="#1d4ed8">1. TATA Sariya 12mm</text>
  <text x="220" y="220" font-size="13" fill="#1d4ed8">10 bdl</text>
  <text x="280" y="220" font-size="13" fill="#1d4ed8">600</text>
  <text x="360" y="220" font-size="13" fill="#1d4ed8">6,000.00</text>
  <text x="35" y="238" font-size="10" fill="#dc2626">GST billed: 12% [WRONG SLAB! Sariya is 18%]</text>

  <!-- Row 2 -->
  <text x="35" y="275" font-size="13" font-family="'Caveat', cursive, sans-serif" fill="#1d4ed8">2. Binding Taar (Wire)</text>
  <text x="220" y="275" font-size="13" fill="#1d4ed8">5 kg</text>
  <text x="280" y="275" font-size="13" fill="#1d4ed8">90</text>
  <text x="360" y="275" font-size="13" fill="#dc2626">550.00</text>
  <text x="35" y="293" font-size="10" fill="#dc2626">[MATH ERROR: 5 × 90 = 450, slip wrote 550]</text>

  <line x1="25" y1="340" x2="425" y2="340" stroke="#cbd5e1" stroke-width="1"/>
  
  <text x="240" y="370" font-size="12" fill="#334155">Subtotal:</text>
  <text x="360" y="370" font-size="12" fill="#334155">₹ 6,550.00</text>
  
  <text x="240" y="395" font-size="12" fill="#dc2626">GST (Billed):</text>
  <text x="360" y="395" font-size="12" fill="#dc2626">₹ 819.00</text>
  
  <line x1="230" y1="415" x2="425" y2="415" stroke="#1e293b" stroke-width="1.5"/>
  <text x="240" y="440" font-size="15" font-weight="bold" fill="#0f172a">GRAND TOTAL:</text>
  <text x="360" y="440" font-size="15" font-weight="bold" fill="#0f172a">₹ 7,369.00</text>
  <line x1="230" y1="450" x2="425" y2="450" stroke="#1e293b" stroke-width="1.5"/>

  <!-- Stamp -->
  <g transform="translate(70, 480) rotate(-12)">
    <rect width="160" height="50" rx="6" fill="none" stroke="#2563eb" stroke-width="2" stroke-dasharray="4,2"/>
    <text x="80" y="25" font-size="11" font-weight="bold" fill="#2563eb" text-anchor="middle">SHARMA JI HARDWARE</text>
    <text x="80" y="42" font-size="10" fill="#2563eb" text-anchor="middle">RECEIVED / CASH</text>
  </g>
</svg>"""
    },
    {
        "id": "sample-2-kirana-clean",
        "title": "Gupta Kirana & General Store (Clean Bill)",
        "subtitle": "Vernacular Kirana items (Atta 0%, Sugar 5%, Mustard Oil 5%) 100% Validated",
        "category": "Kirana / Grocery",
        "badge": "CLEAN (Zero Risk)",
        "bill_data": {
            "vendor_name": "Gupta Kirana & Provision Store",
            "vendor_gstin": "07AAAAA0000A1Z4",
            "invoice_no": "GKP-104",
            "date": "2026-11-22",
            "items": [
                {
                    "name": "Chakki Atta (Wheat Flour)",
                    "qty": 2,
                    "rate": 350,
                    "amount": 700,
                    "tax_rate": 5,
                    "hsn": "1101"
                },
                {
                    "name": "Chinni / Sugar (M30)",
                    "qty": 5,
                    "rate": 44,
                    "amount": 220,
                    "tax_rate": 5,
                    "hsn": "1701"
                },
                {
                    "name": "Sarson Ka Tel (Mustard Oil 1L)",
                    "qty": 2,
                    "rate": 160,
                    "amount": 320,
                    "tax_rate": 5,
                    "hsn": "1514"
                }
            ],
            "taxable_amount": 1240,
            "tax_amount": 62,
            "grand_total": 1302
        },
        "svg_text": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 450 620" width="100%" height="100%" style="background:#fdfbf7; font-family:'Courier New', monospace;">
  <rect width="450" height="620" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
  <rect x="15" y="15" width="420" height="590" fill="none" stroke="#16a34a" stroke-width="1.5"/>
  
  <text x="225" y="55" font-size="20" font-weight="bold" fill="#14532d" text-anchor="middle">GUPTA KIRANA &amp; STORE</text>
  <text x="225" y="75" font-size="12" fill="#475569" text-anchor="middle">Shop No. 4, Main Market, Karol Bagh, Delhi</text>
  <text x="225" y="92" font-size="11" fill="#15803d" text-anchor="middle">GSTIN: 07AAAAA0000A1Z4 | Bill of Supply / Tax Inv</text>
  <line x1="25" y1="105" x2="425" y2="105" stroke="#14532d" stroke-width="1.5"/>
  
  <text x="35" y="130" font-size="12" fill="#334155">Inv No: GKP-104</text>
  <text x="280" y="130" font-size="12" fill="#334155">Date: 22-11-2026</text>

  <line x1="25" y1="150" x2="425" y2="150" stroke="#64748b" stroke-width="1"/>
  <text x="35" y="168" font-size="11" font-weight="bold" fill="#0f172a">ITEM</text>
  <text x="170" y="168" font-size="11" font-weight="bold" fill="#0f172a">HSN</text>
  <text x="230" y="168" font-size="11" font-weight="bold" fill="#0f172a">QTY</text>
  <text x="280" y="168" font-size="11" font-weight="bold" fill="#0f172a">RATE</text>
  <text x="360" y="168" font-size="11" font-weight="bold" fill="#0f172a">AMOUNT</text>
  <line x1="25" y1="178" x2="425" y2="178" stroke="#64748b" stroke-width="1"/>

  <text x="35" y="205" font-size="12" fill="#0f172a">1. Chakki Atta (10kg)</text>
  <text x="170" y="205" font-size="11" fill="#64748b">1101 (5%)</text>
  <text x="230" y="205" font-size="12" fill="#0f172a">2</text>
  <text x="280" y="205" font-size="12" fill="#0f172a">350.00</text>
  <text x="360" y="205" font-size="12" fill="#0f172a">700.00</text>

  <text x="35" y="240" font-size="12" fill="#0f172a">2. Chinni / Sugar (1kg)</text>
  <text x="170" y="240" font-size="11" fill="#64748b">1701 (5%)</text>
  <text x="230" y="240" font-size="12" fill="#0f172a">5</text>
  <text x="280" y="240" font-size="12" fill="#0f172a">44.00</text>
  <text x="360" y="240" font-size="12" fill="#0f172a">220.00</text>

  <text x="35" y="275" font-size="12" fill="#0f172a">3. Sarson Tel (1L)</text>
  <text x="170" y="275" font-size="11" fill="#64748b">1514 (5%)</text>
  <text x="230" y="275" font-size="12" fill="#0f172a">2</text>
  <text x="280" y="275" font-size="12" fill="#0f172a">160.00</text>
  <text x="360" y="275" font-size="12" fill="#0f172a">320.00</text>

  <line x1="25" y1="320" x2="425" y2="320" stroke="#cbd5e1" stroke-width="1"/>
  <text x="240" y="350" font-size="12" fill="#334155">Taxable Value:</text>
  <text x="360" y="350" font-size="12" fill="#334155">₹ 1,240.00</text>

  <text x="240" y="375" font-size="12" fill="#334155">CGST (2.5%):</text>
  <text x="360" y="375" font-size="12" fill="#334155">₹ 31.00</text>
  
  <text x="240" y="400" font-size="12" fill="#334155">SGST (2.5%):</text>
  <text x="360" y="400" font-size="12" fill="#334155">₹ 31.00</text>

  <line x1="230" y1="420" x2="425" y2="420" stroke="#14532d" stroke-width="1.5"/>
  <text x="240" y="445" font-size="15" font-weight="bold" fill="#14532d">NET PAYABLE:</text>
  <text x="360" y="445" font-size="15" font-weight="bold" fill="#14532d">₹ 1,302.00</text>
  
  <g transform="translate(80, 500)">
    <text x="0" y="0" font-size="12" font-weight="bold" fill="#15803d">✓ 100% VERIFIED: ZERO ITC RISK</text>
  </g>
</svg>"""
    },
    {
        "id": "sample-3-auto-fake-gstin",
        "title": "Verma Auto Workshop (Invalid GSTIN Checksum)",
        "subtitle": "Typo / Fake GSTIN triggers 100% At-Risk ITC rejection alert",
        "category": "Auto Workshop",
        "badge": "CRITICAL (Fake GSTIN)",
        "bill_data": {
            "vendor_name": "Verma Motor Garage & Spares",
            "vendor_gstin": "07AAAAA0000A1Z9", # Intentional flaw: checksum digit is 9 instead of 4!
            "invoice_no": "VM-502",
            "date": "2026-11-23",
            "items": [
                {
                    "name": "Mobil Engine Oil 3.5L",
                    "qty": 1,
                    "rate": 1800,
                    "amount": 1800,
                    "tax_rate": 18,
                    "hsn": "2710"
                },
                {
                    "name": "Brake Shoe Set",
                    "qty": 2,
                    "rate": 450,
                    "amount": 900,
                    "tax_rate": 18,
                    "hsn": "8708"
                }
            ],
            "taxable_amount": 2700,
            "tax_amount": 486,
            "grand_total": 3186
        },
        "svg_text": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 450 620" width="100%" height="100%" style="background:#fdfbf7; font-family:'Courier New', monospace;">
  <rect width="450" height="620" fill="#fff7ed" stroke="#fed7aa" stroke-width="2"/>
  <rect x="15" y="15" width="420" height="590" fill="none" stroke="#ea580c" stroke-width="1.5"/>
  
  <text x="225" y="55" font-size="18" font-weight="bold" fill="#9a3412" text-anchor="middle">VERMA MOTOR GARAGE &amp; SPARES</text>
  <text x="225" y="75" font-size="11" fill="#475569" text-anchor="middle">Plot 12, Wazirpur Industrial Area, Delhi - 110052</text>
  <text x="225" y="95" font-size="12" font-weight="bold" fill="#dc2626" text-anchor="middle">GSTIN: 07AAAAA0000A1Z9 [CHECKSUM MISMATCH!]</text>
  <line x1="25" y1="110" x2="425" y2="110" stroke="#ea580c" stroke-width="1.5"/>
  
  <text x="35" y="135" font-size="12" fill="#334155">Inv: VM-502</text>
  <text x="280" y="135" font-size="12" fill="#334155">Date: 23-11-2026</text>

  <line x1="25" y1="155" x2="425" y2="155" stroke="#64748b" stroke-width="1"/>
  <text x="35" y="175" font-size="11" font-weight="bold" fill="#0f172a">PART / DESCRIPTION</text>
  <text x="230" y="175" font-size="11" font-weight="bold" fill="#0f172a">QTY</text>
  <text x="280" y="175" font-size="11" font-weight="bold" fill="#0f172a">RATE</text>
  <text x="360" y="175" font-size="11" font-weight="bold" fill="#0f172a">TOTAL</text>
  <line x1="25" y1="185" x2="425" y2="185" stroke="#64748b" stroke-width="1"/>

  <text x="35" y="215" font-size="12" fill="#0f172a">Mobil Engine Oil 3.5L</text>
  <text x="230" y="215" font-size="12" fill="#0f172a">1</text>
  <text x="280" y="215" font-size="12" fill="#0f172a">1,800.00</text>
  <text x="360" y="215" font-size="12" fill="#0f172a">1,800.00</text>

  <text x="35" y="250" font-size="12" fill="#0f172a">Brake Shoe Set</text>
  <text x="230" y="250" font-size="12" fill="#0f172a">2</text>
  <text x="280" y="250" font-size="12" fill="#0f172a">450.00</text>
  <text x="360" y="250" font-size="12" fill="#0f172a">900.00</text>

  <line x1="25" y1="290" x2="425" y2="290" stroke="#cbd5e1" stroke-width="1"/>
  <text x="240" y="320" font-size="12" fill="#334155">Taxable:</text>
  <text x="360" y="320" font-size="12" fill="#334155">₹ 2,700.00</text>
  
  <text x="240" y="345" font-size="12" fill="#dc2626">GST 18%:</text>
  <text x="360" y="345" font-size="12" fill="#dc2626">₹ 486.00</text>

  <line x1="230" y1="365" x2="425" y2="365" stroke="#ea580c" stroke-width="1.5"/>
  <text x="240" y="390" font-size="15" font-weight="bold" fill="#0f172a">TOTAL:</text>
  <text x="360" y="390" font-size="15" font-weight="bold" fill="#0f172a">₹ 3,186.00</text>
  
  <rect x="35" y="440" width="380" height="70" fill="#fee2e2" stroke="#ef4444" rx="4"/>
  <text x="50" y="465" font-size="12" font-weight="bold" fill="#b91c1c">⚠️ CRITICAL ITC ALERT (₹ 486.00 At Risk)</text>
  <text x="50" y="485" font-size="10" fill="#991b1b">GSTIN Checksum Failed (Typo/Fake). Sahi checksum digit '4' hona chahiye.</text>
  <text x="50" y="498" font-size="10" fill="#991b1b">Bina valid GSTIN ke ITC claim reject ho jayega.</text>
</svg>"""
    }
]

def save_sample_fixtures(out_dir: str):
    os.makedirs(out_dir, exist_ok=True)
    with open(os.path.join(out_dir, "sample_bills.json"), "w", encoding="utf-8") as f:
        json.dump(SAMPLE_BILLS, f, indent=2)

if __name__ == "__main__":
    save_sample_fixtures("backend/data")
    print("Sample fixtures generated successfully!")
