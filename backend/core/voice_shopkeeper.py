"""
Conversational Voice-to-Billing Assistant for Shopkeepers
Translates Hindi & Hinglish voice input into structured draft bills.
Example: 'Maine Sharma ji se 10 bundle sariya 600 rupay me kharida'
"""

import re
from typing import Dict, Any, List
from .alias_resolver import AliasResolver

class VoiceShopkeeperAssistant:
    def __init__(self, alias_resolver: AliasResolver):
        self.alias_resolver = alias_resolver

    def parse_spoken_entry(self, spoken_text: str) -> Dict[str, Any]:
        text = spoken_text.strip().lower()
        
        # 1. Vendor Extraction
        vendor_name = "Local Trade Vendor"
        vendor_match = re.search(r"(?:se|from|ne|shop)\s+([a-zA-Z\s]+?)(?:\s+se|\s+ko|\s+se\s+|\s+1|\s+2|\s+5|\s+10|\s+sariya|\s+atta|\s+cement|\s+maal)", text)
        if not vendor_match:
            # Try simple vendor detection
            v_alt = re.search(r"([a-zA-Z]+\s+(?:ji|traders|hardware|store|kirana|enterprises|mart))", text)
            if v_alt:
                vendor_name = v_alt.group(1).title()
        else:
            cand = vendor_match.group(1).strip()
            if len(cand) > 2 and cand not in ["aaj", "kal", "maine", "bill", "maal"]:
                vendor_name = cand.title()

        # 2. Extract items, quantities and rates
        items: List[Dict[str, Any]] = []

        # Common known commodity patterns in Hinglish
        commodity_terms = [
            "sariya", "saria", "tmt", "taar", "wire", "cement", "atta", "maida", "suji", 
            "chawal", "rice", "daal", "dal", "tel", "oil", "chini", "chinni", "sugar", 
            "chai", "tea", "ghee", "keel", "paint", "pipe", "bulb", "tyre", "mobil oil"
        ]

        # Scan for commodities mentioned in text
        for term in commodity_terms:
            if term in text:
                alias = self.alias_resolver.resolve_item(term)
                hsn = alias["hsn"] if alias else ""
                official_rate = alias["official_rate"] if alias else 18

                # Look for numbers near the term
                # E.g. "10 bundle sariya 600 rupay" or "5000 ka sariya"
                qty = 1.0
                rate = 100.0

                # Match: <num> (kilo/bundle/kg/packet/bag/bori)? <term> <num> (rupay/rs/me)?
                pattern1 = rf"(\d+)\s*(?:bundle|kilo|kg|packet|bag|bori|pcs|piece|ltr|l)?\s+{term}\s+(\d+)"
                m1 = re.search(pattern1, text)
                if m1:
                    qty = float(m1.group(1))
                    rate = float(m1.group(2))
                else:
                    # Match: <term> <num> rupay
                    pattern2 = rf"{term}\s+(\d+)\s*(?:rupay|rs|me)?"
                    m2 = re.search(pattern2, text)
                    if m2:
                        rate = float(m2.group(1))

                items.append({
                    "name": alias["canonical_name"] if alias else term.title(),
                    "hsn": hsn,
                    "qty": qty,
                    "rate": rate,
                    "amount": round(qty * rate, 2),
                    "tax_rate": official_rate
                })

        # Fallback if no specific commodity matched, but an overall amount was spoken
        # E.g. "Maine aaj 5000 ka maal kharida"
        if not items:
            amt_match = re.search(r"(\d+)\s*(?:ka\s+maal|rupay|rs|hazaar|thousand)", text)
            total_amt = float(amt_match.group(1)) if amt_match else 5000.0
            items.append({
                "name": "General Shop Inventory / Maal",
                "hsn": "9999",
                "qty": 1.0,
                "rate": total_amt,
                "amount": total_amt,
                "tax_rate": 18.0
            })

        calc_taxable = sum(it["amount"] for it in items)
        calc_tax = round(sum(it["amount"] * (it["tax_rate"] / 100) for it in items), 2)
        calc_grand = round(calc_taxable + calc_tax, 2)

        return {
            "vendor_name": vendor_name,
            "vendor_gstin": "07AAAAA0000A1Z4", # Default Delhi vendor format
            "invoice_no": f"VOICE-{abs(hash(text)) % 10000:04d}",
            "date": "2026-11-24",
            "items": items,
            "taxable_amount": calc_taxable,
            "tax_amount": calc_tax,
            "grand_total": calc_grand,
            "spoken_transcript": spoken_text
        }
