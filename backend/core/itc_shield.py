"""
Deterministic ITC Mismatch Shield
Zero AI Guesswork - 100% Deterministic Code
Calculates exact At-Risk ITC (₹) and categorizes bills into Two Buckets:
1. Verified / Clean Entries
2. CA Exception Queue
"""

from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, Any, List, Optional
from .math_engine import verify_tax_math, to_decimal
from .gstin_guard import validate_gstin, STATE_CODES
from .hsn_validator import HSNValidator
from .duplicate_guard import DuplicateGuard
from .alias_resolver import AliasResolver

class ITCShield:
    def __init__(self, hsn_validator: HSNValidator, duplicate_guard: DuplicateGuard, alias_resolver: AliasResolver):
        self.hsn_validator = hsn_validator
        self.duplicate_guard = duplicate_guard
        self.alias_resolver = alias_resolver

    def evaluate_bill(
        self,
        bill_data: Dict[str, Any],
        buyer_gstin: Optional[str] = "07AAAAA0000A1Z5", # default Delhi MSME
        is_fix_update: bool = False
    ) -> Dict[str, Any]:
        """
        Takes raw extracted bill data and performs deterministic audit.
        """
        vendor_gstin = bill_data.get("vendor_gstin") or bill_data.get("gstin") or ""
        invoice_no = bill_data.get("invoice_no") or bill_data.get("invoice_number") or ""
        invoice_date = bill_data.get("date") or bill_data.get("invoice_date") or ""
        raw_items = bill_data.get("items") or []

        alerts: List[Dict[str, Any]] = []
        at_risk_itc = Decimal("0.00")
        one_click_fixes: List[Dict[str, Any]] = []

        # 1. GSTIN Format & Checksum Guard
        gstin_res = validate_gstin(vendor_gstin)
        seller_state = gstin_res.get("state_code")
        buyer_state = buyer_gstin[:2] if buyer_gstin and len(buyer_gstin) >= 2 else "07"
        is_interstate = bool(seller_state and buyer_state and seller_state != buyer_state)

        # 2. Duplicate Bill Guard
        dup_res = self.duplicate_guard.check_and_register(vendor_gstin, invoice_no, invoice_date, is_fix_update=is_fix_update)
        if dup_res["is_duplicate"]:
            alerts.append({
                "category": "DUPLICATE_INVOICE",
                "title": "Duplicate Bill Detected",
                "message": dup_res["message"],
                "severity": "CRITICAL"
            })

        # 3. Item-level HSN & Alias Resolution + Slab check
        processed_items = []
        for it in raw_items:
            name = it.get("name") or it.get("item_name") or ""
            billed_hsn = str(it.get("hsn") or "").strip()
            billed_rate = float(to_decimal(it.get("tax_rate", 0)))
            
            # If HSN missing, try resolving from Vernacular / Hinglish Alias
            alias_match = self.alias_resolver.resolve_item(name)
            suggested_hsn = billed_hsn
            suggested_rate = billed_rate

            if not billed_hsn and alias_match:
                suggested_hsn = alias_match["hsn"]
                suggested_rate = float(alias_match["official_rate"])
                one_click_fixes.append({
                    "type": "APPLY_ALIAS_HSN",
                    "item_name": name,
                    "target_hsn": suggested_hsn,
                    "target_rate": suggested_rate,
                    "label": f"'{name}' ko HSN {suggested_hsn} ({suggested_rate}% GST) me map karein",
                    "description": f"Hinglish match: '{name}' -> {alias_match['canonical_name']}"
                })
            elif not billed_hsn:
                # Search keyword in official catalog
                kw_matches = self.hsn_validator.search_hsn_by_keyword(name, limit=1)
                if kw_matches:
                    suggested_hsn = kw_matches[0]["hsn"]
                    suggested_rate = float(kw_matches[0].get("igst", 18))
                    one_click_fixes.append({
                        "type": "APPLY_CATALOG_HSN",
                        "item_name": name,
                        "target_hsn": suggested_hsn,
                        "target_rate": suggested_rate,
                        "label": f"HSN {suggested_hsn} ({suggested_rate}%) lagayein",
                        "description": kw_matches[0].get("description", "")[:60]
                    })

            # Check official slab
            effective_hsn = billed_hsn or suggested_hsn
            slab_res = self.hsn_validator.validate_item_slab(effective_hsn, billed_rate, name)
            
            if not slab_res["is_valid"]:
                if slab_res.get("error_type") == "SLAB_MISMATCH":
                    official_r = slab_res["official_rate"]
                    alerts.append({
                        "category": "TAX_SLAB_MISMATCH",
                        "title": f"Wrong GST Slab: {name}",
                        "message": slab_res["message"],
                        "severity": "HIGH",
                        "item_name": name,
                        "billed_rate": billed_rate,
                        "official_rate": official_r
                    })
                    one_click_fixes.append({
                        "type": "CORRECT_TAX_SLAB",
                        "item_name": name,
                        "target_rate": official_r,
                        "label": f"'{name}' ka tax rate {official_r}% karein (Official)",
                        "description": f"Billed {billed_rate}% ki jagah official slab {official_r}% update hoga."
                    })
                elif slab_res.get("error_type") == "HSN_NOT_FOUND" and not billed_hsn:
                    alerts.append({
                        "category": "MISSING_HSN",
                        "title": f"Missing HSN Code: {name}",
                        "message": f"Parchi me '{name}' ka HSN code missing hai. GST Rule 46 ke tehat HSN zaroori hai.",
                        "severity": "MEDIUM",
                        "item_name": name
                    })

            it_copy = dict(it)
            it_copy["hsn"] = effective_hsn
            it_copy["tax_rate"] = billed_rate
            it_copy["alias_suggested_hsn"] = suggested_hsn if suggested_hsn != billed_hsn else None
            it_copy["alias_suggested_rate"] = suggested_rate if suggested_rate != billed_rate else None
            processed_items.append(it_copy)

        # 4. Deterministic Math Engine
        math_res = verify_tax_math(
            items=processed_items,
            billed_taxable=bill_data.get("taxable_amount"),
            billed_tax=bill_data.get("tax_amount"),
            billed_grand_total=bill_data.get("grand_total") or bill_data.get("total_amount"),
            is_interstate=is_interstate
        )

        for mf in math_res.get("math_flags", []):
            alerts.append({
                "category": mf["type"],
                "title": "Math Error Found",
                "message": mf["message"],
                "severity": mf["severity"],
                "diff": mf.get("diff", 0)
            })
            one_click_fixes.append({
                "type": "FIX_MATH",
                "label": "Auto-Fix Math & Totals",
                "description": f"Calculated totals (₹{math_res['calculated_grand_total']:.2f}) apply karein."
            })

        # 5. AT-RISK ITC DETERMINISTIC CALCULATION
        calculated_total_tax = to_decimal(math_res["calculated_tax"])
        billed_total_tax = to_decimal(bill_data.get("tax_amount") or math_res["calculated_tax"])

        # Case A: GSTIN is invalid, missing or fake -> 100% tax is rejected under GST Section 16(2)
        if not gstin_res["is_valid"]:
            at_risk_itc = max(billed_total_tax, calculated_total_tax)
            alerts.insert(0, {
                "category": "INVALID_GSTIN",
                "title": "Invalid Vendor GSTIN (100% ITC Risk)",
                "message": gstin_res["message"],
                "severity": "CRITICAL"
            })
        # Case B: Duplicate Bill -> 100% tax is duplicate ITC risk
        elif dup_res["is_duplicate"]:
            at_risk_itc = max(billed_total_tax, calculated_total_tax)
        else:
            # Case C: Slab discrepancies or Math Discrepancies
            # Sum up tax risk from mismatched slabs and math errors
            slab_risk = Decimal("0.00")
            for it in math_res["items"]:
                billed_r = to_decimal(it.get("tax_rate", 0))
                # Check if item had slab mismatch
                item_name = it.get("item_name", "")
                hsn = it.get("hsn", "")
                slab_check = self.hsn_validator.validate_item_slab(hsn, float(billed_r), item_name)
                if not slab_check["is_valid"] and slab_check.get("error_type") == "SLAB_MISMATCH":
                    official_r = to_decimal(slab_check["official_rate"])
                    # If overbilled, excess ITC will be reclaimed/penalized; if underbilled, tax demand risk
                    diff_rate = abs(billed_r - official_r)
                    line_amt = to_decimal(it.get("calculated_amount", 0))
                    item_risk = (line_amt * (diff_rate / Decimal("100"))).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
                    slab_risk += item_risk

            # Math discrepancy risk
            math_risk = Decimal("0.00")
            for mf in math_res.get("math_flags", []):
                math_risk += to_decimal(mf.get("diff", 0))

            at_risk_itc = slab_risk + math_risk

        at_risk_float = float(at_risk_itc)
        is_clean = (len(alerts) == 0 and at_risk_float == 0.0)
        bucket = "VERIFIED" if is_clean else "CA_EXCEPTION"

        # Generate Plain-Language Summary
        if is_clean:
            plain_summary = "Sabhi checks pass ho gaye! GSTIN valid hai, line math sahi hai, aur official HSN slabs match kar rahe hain. Ready for GST filing."
        else:
            reasons = [a["title"] for a in alerts[:3]]
            plain_summary = f"At-Risk ITC: ₹{at_risk_float:.2f}. Issues: {', '.join(reasons)}. 1-Tap Fix karein ya CA Exception Queue me review karein."

        return {
            "bucket": bucket,
            "status": "CLEAN" if is_clean else "FLAGGED",
            "at_risk_itc": at_risk_float,
            "vendor_gstin_validation": gstin_res,
            "duplicate_check": dup_res,
            "math_verification": math_res,
            "alerts": alerts,
            "one_click_fixes": one_click_fixes,
            "plain_summary": plain_summary,
            "invoice_metadata": {
                "vendor_name": bill_data.get("vendor_name") or "Local Vendor",
                "vendor_gstin": vendor_gstin,
                "invoice_number": invoice_no,
                "invoice_date": invoice_date,
                "buyer_gstin": buyer_gstin,
                "place_of_supply": STATE_CODES.get(seller_state, "Delhi")
            }
        }
