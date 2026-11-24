"""
Deterministic Duplicate Bill Guard
Tracks (vendor_gstin, invoice_number) to prevent double ITC claiming.
"""

from typing import Dict, Any, Tuple, Optional

class DuplicateGuard:
    def __init__(self):
        # Key: (clean_gstin, clean_invoice_no) -> metadata
        self.seen_bills: Dict[Tuple[str, str], Dict[str, Any]] = {}

    def check_and_register(
        self,
        gstin: str,
        invoice_number: str,
        date: str = "",
        is_fix_update: bool = False
    ) -> Dict[str, Any]:
        clean_gstin = (gstin or "UNREGISTERED").strip().upper()
        clean_inv = (invoice_number or "").strip().upper()

        if not clean_inv:
            return {
                "is_duplicate": False,
                "message": "Invoice number nahi mila (Kachha slip without inv #)"
            }

        key = (clean_gstin, clean_inv)
        if key in self.seen_bills:
            if is_fix_update:
                return {
                    "is_duplicate": False,
                    "message": "Bill updated in session (Valid)"
                }
            prev = self.seen_bills[key]
            return {
                "is_duplicate": True,
                "prev_date": prev.get("date"),
                "message": f"Duplicate Bill Alert: Invoice #{clean_inv} pehle hi process ho chuka hai (Date: {prev.get('date', 'Unknown')}). Double ITC claim penalty lag sakti hai!"
            }

        # Register it
        self.seen_bills[key] = {
            "gstin": clean_gstin,
            "invoice_number": clean_inv,
            "date": date
        }
        return {
            "is_duplicate": False,
            "message": "Bill is unique (No duplicate detected)"
        }

    def clear(self):
        self.seen_bills.clear()
