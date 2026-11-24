"""
Deterministic Business Health & Intelligence Engine
Transforms messy paper receipts into actionable MSME Insights:
- Spending Velocity & Monthly Trends
- Top Purchased Commodities (Sariya, Cement, Wire, Atta)
- Top Vendors by Volume
- GST Readiness Score (Gamified 0-100)
- Suspicious Bill & Fraud Risk Detection
"""

from typing import List, Dict, Any
from decimal import Decimal, ROUND_HALF_UP

class BusinessIntelligenceEngine:
    def __init__(self):
        pass

    def compute_dashboard_metrics(
        self,
        verified_bills: List[Dict[str, Any]],
        exception_bills: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        all_bills = verified_bills + exception_bills
        total_invoices = len(all_bills)
        
        total_spend = 0.0
        total_tax_paid = 0.0
        eligible_itc = 0.0
        at_risk_itc = 0.0

        vendor_spend: Dict[str, Dict[str, Any]] = {}
        product_spend: Dict[str, Dict[str, Any]] = {}
        risk_anomalies: List[Dict[str, Any]] = []

        for b in all_bills:
            mv = b.get("math_verification", {})
            meta = b.get("invoice_metadata", {})
            v_name = meta.get("vendor_name") or "Local Vendor"
            v_gstin = meta.get("vendor_gstin") or "UNREGISTERED"

            grand = float(mv.get("calculated_grand_total", 0.0))
            tax = float(mv.get("calculated_tax", 0.0))
            risk = float(b.get("at_risk_itc", 0.0))

            total_spend += grand
            total_tax_paid += tax

            if b.get("bucket") == "VERIFIED":
                eligible_itc += tax
            else:
                at_risk_itc += risk

            # Track vendor volume
            if v_name not in vendor_spend:
                vendor_spend[v_name] = {"name": v_name, "gstin": v_gstin, "total_spend": 0.0, "invoice_count": 0}
            vendor_spend[v_name]["total_spend"] += grand
            vendor_spend[v_name]["invoice_count"] += 1

            # Track items
            for it in mv.get("items", []):
                p_name = it.get("item_name", "General Item").strip()
                p_amt = float(it.get("calculated_amount", 0.0))
                p_qty = float(it.get("qty", 1.0))
                
                if p_name not in product_spend:
                    product_spend[p_name] = {"name": p_name, "total_spend": 0.0, "total_qty": 0.0, "count": 0}
                product_spend[p_name]["total_spend"] += p_amt
                product_spend[p_name]["total_qty"] += p_qty
                product_spend[p_name]["count"] += 1

            # Detect suspicious risk patterns
            if risk > 500:
                risk_anomalies.append({
                    "type": "HIGH_VALUE_ITC_RISK",
                    "severity": "HIGH",
                    "vendor": v_name,
                    "invoice": meta.get("invoice_number"),
                    "risk_amount": risk,
                    "message": f"₹{risk:.2f} ITC at risk on invoice #{meta.get('invoice_number')} from {v_name}."
                })

            if not b.get("vendor_gstin_validation", {}).get("is_valid"):
                risk_anomalies.append({
                    "type": "SUSPICIOUS_UNVERIFIED_VENDOR",
                    "severity": "CRITICAL",
                    "vendor": v_name,
                    "invoice": meta.get("invoice_number"),
                    "risk_amount": tax,
                    "message": f"Vendor '{v_name}' has invalid or fake GSTIN. Potential bogus billing risk."
                })

        # Calculate Gamified GST Readiness Score (0-100)
        if total_invoices == 0:
            readiness_score = 100
            score_status = "EXCELLENT"
        else:
            clean_count = len(verified_bills)
            ratio = clean_count / total_invoices
            # Deduct points for high at-risk ITC
            penalty = min(25, int(at_risk_itc / 100))
            readiness_score = max(10, min(100, int(ratio * 90) + (10 if clean_count > 0 else 0) - penalty))
            
            if readiness_score >= 85:
                score_status = "GST READY (EXCELLENT)"
            elif readiness_score >= 60:
                score_status = "NEEDS ATTENTION (MODERATE)"
            else:
                score_status = "CRITICAL AUDIT RISK (POOR)"

        # Sort top vendors and products
        top_vendors = sorted(vendor_spend.values(), key=lambda x: x["total_spend"], reverse=True)[:5]
        top_products = sorted(product_spend.values(), key=lambda x: x["total_spend"], reverse=True)[:5]

        return {
            "summary": {
                "total_invoices": total_invoices,
                "clean_invoices": len(verified_bills),
                "flagged_invoices": len(exception_bills),
                "total_purchases_spend": round(total_spend, 2),
                "total_gst_paid": round(total_tax_paid, 2),
                "net_eligible_itc": round(eligible_itc, 2),
                "total_at_risk_itc": round(at_risk_itc, 2),
            },
            "gst_readiness": {
                "score": readiness_score,
                "status": score_status,
                "target_score": 100,
                "clean_percentage": round((len(verified_bills) / total_invoices * 100), 1) if total_invoices > 0 else 100.0,
                "advice": (
                    "Sabhi clean bills file karne ke liye ready hain!" if readiness_score >= 85
                    else "CA Exception Queue me flagged bills ko 1-Tap fix karein taaki score 90+ ho jaye."
                )
            },
            "top_suppliers": top_vendors,
            "top_purchased_products": top_products,
            "risk_anomalies": risk_anomalies
        }
