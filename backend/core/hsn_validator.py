"""
Deterministic HSN Code & GST Slab Validator
Directly loaded from india-hsn-2026.json (Zero AI Guesswork)
Checks if billed tax rate matches the statutory IGST/CGST/SGST slab for the HSN code.
"""

import json
import os
from typing import Dict, Any, Optional, List

class HSNValidator:
    def __init__(self, json_path: str):
        self.json_path = json_path
        self.hsn_map: Dict[str, Dict[str, Any]] = {}
        self.chapter_map: Dict[int, List[Dict[str, Any]]] = {}
        self._load_data()

    def _load_data(self):
        if not os.path.exists(self.json_path):
            return
        try:
            with open(self.json_path, "r", encoding="utf-8") as f:
                content = json.load(f)
                items = content.get("data", [])
                for it in items:
                    raw_hsn = str(it.get("hsn", "")).strip()
                    if not raw_hsn:
                        continue
                    # Store exact 8-digit
                    self.hsn_map[raw_hsn] = it
                    # Also index 6-digit, 4-digit, 2-digit if not already set
                    for prefix_len in [6, 4, 2]:
                        if len(raw_hsn) >= prefix_len:
                            prefix = raw_hsn[:prefix_len]
                            if prefix not in self.hsn_map:
                                self.hsn_map[prefix] = it

                    ch = it.get("chapter")
                    if ch:
                        if ch not in self.chapter_map:
                            self.chapter_map[ch] = []
                        self.chapter_map[ch].append(it)
        except Exception as e:
            print(f"Error loading HSN file: {e}")

    def lookup_hsn(self, hsn_code: str) -> Optional[Dict[str, Any]]:
        clean_code = str(hsn_code or "").replace(".", "").strip()
        if not clean_code:
            return None
        # Try exact match, then progressively shorter prefixes (6-digit, 4-digit)
        for l in [len(clean_code), 8, 6, 4, 2]:
            if l <= len(clean_code):
                sub = clean_code[:l]
                if sub in self.hsn_map:
                    return self.hsn_map[sub]
        return None

    def validate_item_slab(self, hsn_code: str, billed_rate: float, item_name: str = "") -> Dict[str, Any]:
        hsn_entry = self.lookup_hsn(hsn_code)
        
        if not hsn_entry:
            return {
                "is_valid": False,
                "hsn": hsn_code,
                "official_rate": None,
                "billed_rate": billed_rate,
                "error_type": "HSN_NOT_FOUND",
                "message": f"HSN code '{hsn_code}' (Item: {item_name}) official GST schedule me nahi mila. Sahi HSN verify karein.",
                "suggested_rate": billed_rate
            }

        official_igst = float(hsn_entry.get("igst", 0))
        # Rate mismatch check (allow tiny float difference)
        diff = abs(billed_rate - official_igst)
        if diff > 0.1:
            return {
                "is_valid": False,
                "hsn": hsn_entry["hsn"],
                "description": hsn_entry.get("description", ""),
                "official_rate": official_igst,
                "billed_rate": billed_rate,
                "error_type": "SLAB_MISMATCH",
                "message": f"Wrong GST Slab for '{item_name}' (HSN {hsn_entry['hsn']}): Bill me {billed_rate}% lagaya hai, jabki official GST rate {official_igst}% hai.",
                "suggested_rate": official_igst,
                "diff_rate": diff
            }

        return {
            "is_valid": True,
            "hsn": hsn_entry["hsn"],
            "description": hsn_entry.get("description", ""),
            "official_rate": official_igst,
            "billed_rate": billed_rate,
            "error_type": None,
            "message": f"Valid GST Slab ({official_igst}%)"
        }

    def search_hsn_by_keyword(self, keyword: str, limit: int = 5) -> List[Dict[str, Any]]:
        kw = keyword.lower().strip()
        if not kw:
            return []
        matches = []
        for hsn, data in self.hsn_map.items():
            if len(hsn) >= 4 and kw in data.get("description", "").lower():
                matches.append(data)
                if len(matches) >= limit:
                    break
        return matches
