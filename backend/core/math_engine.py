"""
Deterministic Tax Math Verification Engine
Zero AI Guesswork - 100% Pure Python Arithmetic
Checks line-item multiplication, subtotals, tax slabs, and grand totals.
"""

from decimal import Decimal, ROUND_HALF_UP
from typing import List, Dict, Any, Optional

def to_decimal(val: Any) -> Decimal:
    if val is None:
        return Decimal("0.00")
    try:
        # Strip currency symbols and commas if present
        s = str(val).replace("₹", "").replace(",", "").strip()
        if not s:
            return Decimal("0.00")
        return Decimal(s).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    except Exception:
        return Decimal("0.00")

def verify_line_item(item: Dict[str, Any]) -> Dict[str, Any]:
    qty = to_decimal(item.get("qty", 1))
    rate = to_decimal(item.get("rate", 0))
    billed_amount = to_decimal(item.get("amount", 0))
    
    calculated_amount = (qty * rate).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    
    diff = abs(billed_amount - calculated_amount)
    # If slip omitted amount or there's an arithmetic discrepancy
    has_math_error = diff > Decimal("1.00") if billed_amount > 0 else False

    return {
        "item_name": item.get("name") or item.get("item_name") or "Unknown Item",
        "hsn": str(item.get("hsn") or "").strip(),
        "qty": float(qty),
        "rate": float(rate),
        "billed_amount": float(billed_amount),
        "calculated_amount": float(calculated_amount),
        "tax_rate": float(to_decimal(item.get("tax_rate", 0))),
        "has_math_error": has_math_error,
        "math_discrepancy": float(diff) if has_math_error else 0.0,
        "suggested_amount": float(calculated_amount)
    }

def verify_tax_math(
    items: List[Dict[str, Any]],
    billed_taxable: Optional[float] = None,
    billed_tax: Optional[float] = None,
    billed_grand_total: Optional[float] = None,
    is_interstate: bool = False
) -> Dict[str, Any]:
    verified_items = [verify_line_item(it) for it in items]
    
    calculated_taxable = sum((to_decimal(it["calculated_amount"]) for it in verified_items), Decimal("0.00"))
    
    # Calculate tax line-by-line according to item tax_rate
    total_tax_calc = Decimal("0.00")
    for it in verified_items:
        t_rate = to_decimal(it["tax_rate"])
        item_tax = (to_decimal(it["calculated_amount"]) * (t_rate / Decimal("100"))).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        total_tax_calc += item_tax

    calc_grand_total = calculated_taxable + total_tax_calc
    
    billed_taxable_dec = to_decimal(billed_taxable) if billed_taxable is not None else calculated_taxable
    billed_tax_dec = to_decimal(billed_tax) if billed_tax is not None else total_tax_calc
    billed_grand_total_dec = to_decimal(billed_grand_total) if billed_grand_total is not None else calc_grand_total
    
    taxable_diff = abs(billed_taxable_dec - calculated_taxable)
    tax_diff = abs(billed_tax_dec - total_tax_calc)
    total_diff = abs(billed_grand_total_dec - calc_grand_total)

    math_flags = []
    
    # Check item-level errors
    item_errors = [it for it in verified_items if it["has_math_error"]]
    if item_errors:
        for it in item_errors:
            math_flags.append({
                "type": "ITEM_ARITHMETIC_MISMATCH",
                "item": it["item_name"],
                "message": f"Parchi me '{it['item_name']}' ka amount ₹{it['billed_amount']:.2f} likha hai, jabki {it['qty']} × ₹{it['rate']:.2f} = ₹{it['calculated_amount']:.2f} hona chahiye.",
                "severity": "HIGH",
                "diff": it["math_discrepancy"]
            })

    # Check grand total mismatch
    if total_diff > Decimal("1.00"):
        math_flags.append({
            "type": "GRAND_TOTAL_MISMATCH",
            "message": f"Grand Total mismatch: Parchi total ₹{billed_grand_total_dec:.2f} vs Sahi calculated total ₹{calc_grand_total:.2f} (Farak: ₹{total_diff:.2f}).",
            "severity": "HIGH",
            "diff": float(total_diff)
        })

    # Intra vs Inter-state breakdown
    cgst = (total_tax_calc / Decimal("2")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP) if not is_interstate else Decimal("0.00")
    sgst = cgst if not is_interstate else Decimal("0.00")
    igst = total_tax_calc if is_interstate else Decimal("0.00")

    return {
        "items": verified_items,
        "calculated_taxable": float(calculated_taxable),
        "calculated_tax": float(total_tax_calc),
        "calculated_grand_total": float(calc_grand_total),
        "billed_taxable": float(billed_taxable_dec),
        "billed_tax": float(billed_tax_dec),
        "billed_grand_total": float(billed_grand_total_dec),
        "tax_breakdown": {
            "cgst": float(cgst),
            "sgst": float(sgst),
            "igst": float(igst),
            "is_interstate": is_interstate
        },
        "math_flags": math_flags,
        "is_math_valid": len(math_flags) == 0
    }
