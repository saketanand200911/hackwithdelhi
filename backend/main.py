"""
Kachha2GST Backend API
Deterministic Shield + Local Ollama Extraction
"""

import os
import json
import csv
import io
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from typing import Dict, Any, Optional, List
from pydantic import BaseModel

from core.math_engine import verify_tax_math
from core.gstin_guard import validate_gstin, compute_gstin_checksum
from core.hsn_validator import HSNValidator
from core.alias_resolver import AliasResolver
from core.duplicate_guard import DuplicateGuard
from core.itc_shield import ITCShield
from core.business_intelligence import BusinessIntelligenceEngine
from core.voice_shopkeeper import VoiceShopkeeperAssistant
from core.ai_ca_assistant import AICAAssistant
from ocr_ollama.extractor import OllamaExtractor

app = FastAPI(title="Kachha2GST API", version="1.0.0")

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Core Deterministic Engines
HSN_JSON_PATH = os.path.join(os.path.dirname(__file__), "..", "india-hsn-2026.json")
if not os.path.exists(HSN_JSON_PATH):
    HSN_JSON_PATH = os.path.join(os.path.dirname(__file__), "data", "india-hsn-2026.json")

hsn_validator = HSNValidator(HSN_JSON_PATH)
duplicate_guard = DuplicateGuard()
alias_resolver = AliasResolver()
itc_shield = ITCShield(hsn_validator, duplicate_guard, alias_resolver)
bi_engine = BusinessIntelligenceEngine()
voice_shopkeeper = VoiceShopkeeperAssistant(alias_resolver)
ai_ca_assistant = AICAAssistant()
ollama_extractor = OllamaExtractor(vision_model="moondream", text_model="llama3:latest")

# Session Store for bills (Two Buckets)
verified_bucket: List[Dict[str, Any]] = []
exception_bucket: List[Dict[str, Any]] = []

# Load Pre-computed Sample Bills
SAMPLES_PATH = os.path.join(os.path.dirname(__file__), "data", "sample_bills.json")
SAMPLE_FIXTURES = []
if os.path.exists(SAMPLES_PATH):
    with open(SAMPLES_PATH, "r", encoding="utf-8") as f:
        SAMPLE_FIXTURES = json.load(f)

@app.get("/api/business-intelligence")
def get_business_intelligence():
    """
    Transforms all processed bills into high-value Business Intelligence:
    - Spending Velocity, Top Commodities, Top Vendors
    - Gamified Monthly GST Readiness Score (0-100)
    - Suspicious Invoices & Fraud Risk
    """
    metrics = bi_engine.compute_dashboard_metrics(verified_bucket, exception_bucket)
    return metrics

class VoiceEntryRequest(BaseModel):
    spoken_text: str
    buyer_gstin: Optional[str] = "07AAAAA0000A1Z4"

@app.post("/api/voice-entry")
def voice_entry_transaction(payload: VoiceEntryRequest):
    """
    Conversational Voice Shopkeeper Assistant:
    Turns natural Hindi/Hinglish speech ('Maine Sharma ji se 10 bundle sariya 600 me kharida')
    into a drafted bill and audits it deterministically.
    """
    drafted_bill = voice_shopkeeper.parse_spoken_entry(payload.spoken_text)
    audit_res = itc_shield.evaluate_bill(drafted_bill, payload.buyer_gstin, is_fix_update=True)
    
    response_payload = {
        **audit_res,
        "extracted_raw": drafted_bill,
        "spoken_transcript": payload.spoken_text
    }
    
    if audit_res["bucket"] == "VERIFIED":
        verified_bucket.append(response_payload)
    else:
        exception_bucket.append(response_payload)
        
    return response_payload

class AICARequest(BaseModel):
    query: str
    bill_summary: Optional[str] = None

@app.post("/api/ai-ca/ask")
def ask_ai_ca(payload: AICARequest):
    """
    Vyaapar CA Assistant:
    Answers financial & GST compliance questions in plain, encouraging Hinglish.
    """
    answer = ai_ca_assistant.answer_question(payload.query, payload.bill_summary)
    return answer

@app.get("/api/whatsapp-simulator")
def get_whatsapp_simulator():
    """
    Provides mock conversation flow for the WhatsApp Bill Upload simulation.
    """
    return {
        "bot_name": "Kachha2GST Assistant (WhatsApp Verified)",
        "sample_phone": "+91 98765 43210",
        "steps": [
            {
                "sender": "shopkeeper",
                "message": "📷 [Sent handwritten slip photo: Sharma Ji Loha & Hardware]",
                "time": "10:14 AM"
            },
            {
                "sender": "bot",
                "message": "Namaste Sharma Ji! Parchi mil gayi hai. Extract kiya:\n• TATA Sariya 12mm: 10 bdl @ ₹600 = ₹6,000 (HSN 7214)\n• Binding Taar: 5 kg @ ₹90 = ₹450\n\n⚠️ **ALERT**: Parchi me taar ₹550 likha hai aur GST 12% lagaya hai (Official 18% hai). At-Risk ITC: ₹578.00.",
                "time": "10:14 AM"
            },
            {
                "sender": "bot",
                "interactive_actions": ["1-Tap Auto Fix & File", "Ask CA Question", "Keep as Exception"],
                "time": "10:14 AM"
            }
        ]
    }

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "hsn_count": len(hsn_validator.hsn_map),
        "vision_model": "moondream (Local Ollama)",
        "llm_model": "llama3:latest (Local Ollama)",
        "deterministic_engine": "Active (Zero AI Calculations)"
    }

@app.get("/api/samples")
def get_samples():
    # Return single flagship 60-second interactive demo
    flagship = [s for s in SAMPLE_FIXTURES if s["id"] == "sample-1-hardware-flawed"]
    return flagship if flagship else SAMPLE_FIXTURES[:1]

@app.get("/api/hsn-search")
def search_hsn(q: str = "", limit: int = 10):
    """Live search across 14,416 official GST HSN codes from india-hsn-2026.json"""
    matches = hsn_validator.search_hsn_by_keyword(q, limit=limit)
    return {"query": q, "count": len(matches), "results": matches}

class EvaluationRequest(BaseModel):
    bill_data: Dict[str, Any]
    buyer_gstin: Optional[str] = "07AAAAA0000A1Z4"

@app.post("/api/evaluate")
def evaluate_bill_data(payload: EvaluationRequest):
    result = itc_shield.evaluate_bill(payload.bill_data, payload.buyer_gstin)
    return result

@app.post("/api/extract-and-verify")
async def extract_and_verify(
    file: Optional[UploadFile] = File(None),
    sample_id: Optional[str] = Form(None),
    buyer_gstin: Optional[str] = Form("07AAAAA0000A1Z4")
):
    bill_data = None
    preview_svg = None

    if sample_id:
        sample = next((s for s in SAMPLE_FIXTURES if s["id"] == sample_id), None)
        if sample:
            bill_data = sample["bill_data"]
            preview_svg = sample.get("svg_text")
        else:
            raise HTTPException(status_code=404, detail="Sample ID not found")
    elif file:
        content = await file.read()
        bill_data = ollama_extractor.extract_from_image(content)
    else:
        raise HTTPException(status_code=400, detail="Either file or sample_id required")

    # Run Deterministic ITC Shield
    audit_result = itc_shield.evaluate_bill(bill_data, buyer_gstin, is_fix_update=bool(sample_id))
    
    response_payload = {
        **audit_result,
        "extracted_raw": bill_data,
        "preview_svg": preview_svg
    }

    # Store in session buckets
    if audit_result["bucket"] == "VERIFIED":
        verified_bucket.append(response_payload)
    else:
        exception_bucket.append(response_payload)

    return response_payload

class FixActionRequest(BaseModel):
    bill_data: Dict[str, Any]
    fix_type: str
    item_name: Optional[str] = None
    target_value: Optional[Any] = None
    target_hsn: Optional[str] = None
    buyer_gstin: Optional[str] = "07AAAAA0000A1Z4"

@app.post("/api/apply-fix")
def apply_fix_action(payload: FixActionRequest):
    """
    Executes a 1-Tap Fix on the bill and re-runs deterministic validation.
    """
    bill = dict(payload.bill_data)
    items = [dict(it) for it in bill.get("items", [])]

    if payload.fix_type == "APPLY_ALIAS_HSN" or payload.fix_type == "APPLY_CATALOG_HSN":
        for it in items:
            name = it.get("name") or it.get("item_name") or ""
            if name == payload.item_name or not payload.item_name:
                if payload.target_hsn:
                    it["hsn"] = payload.target_hsn
                if payload.target_value is not None:
                    it["tax_rate"] = float(payload.target_value)

    elif payload.fix_type == "CORRECT_TAX_SLAB":
        for it in items:
            name = it.get("name") or it.get("item_name") or ""
            if name == payload.item_name or not payload.item_name:
                it["tax_rate"] = float(payload.target_value)

    elif payload.fix_type == "FIX_MATH":
        # Recalculate line amounts exactly: qty * rate
        for it in items:
            q = float(it.get("qty", 1))
            r = float(it.get("rate", 0))
            it["amount"] = round(q * r, 2)
        # Clear billed overrides so engine re-derives pure math totals
        bill["taxable_amount"] = None
        bill["tax_amount"] = None
        bill["grand_total"] = None

    elif payload.fix_type == "CORRECT_GSTIN":
        # Compute valid checksum if first 14 chars valid
        raw = str(payload.target_value or bill.get("vendor_gstin") or "").strip().upper()
        if len(raw) >= 14:
            valid_char = compute_gstin_checksum(raw[:14])
            bill["vendor_gstin"] = raw[:14] + valid_char

    bill["items"] = items
    # Re-evaluate with is_fix_update=True
    updated_result = itc_shield.evaluate_bill(bill, payload.buyer_gstin, is_fix_update=True)
    return {
        **updated_result,
        "updated_bill_data": bill
    }

class VoiceFixRequest(BaseModel):
    bill_data: Dict[str, Any]
    voice_transcript: str
    buyer_gstin: Optional[str] = "07AAAAA0000A1Z4"

@app.post("/api/voice-fix")
def voice_fix(payload: VoiceFixRequest):
    """
    Parses spoken Hinglish commands like:
    - 'Sariya ka tax 18 percent kardo'
    - 'Math calculation sahi karo'
    - 'GSTIN checksum fix karo'
    """
    text = payload.voice_transcript.lower()
    bill = dict(payload.bill_data)
    items = [dict(it) for it in bill.get("items", [])]
    fixed_action = "NONE"

    if "math" in text or "total" in text or "hisaab" in text or "calculation" in text:
        for it in items:
            it["amount"] = round(float(it.get("qty", 1)) * float(it.get("rate", 0)), 2)
        bill["taxable_amount"] = None
        bill["tax_amount"] = None
        bill["grand_total"] = None
        fixed_action = "FIXED_MATH"

    elif "18" in text or "tax" in text or "slab" in text:
        for it in items:
            name = (it.get("name") or "").lower()
            if "sariya" in name or "wire" in name or "taar" in name or "iron" in name:
                it["tax_rate"] = 18.0
                it["hsn"] = "7214"
        fixed_action = "CORRECTED_TAX_SLAB"

    elif "gstin" in text or "pan" in text or "vendor" in text:
        vg = str(bill.get("vendor_gstin", "")).strip().upper()
        if len(vg) >= 14:
            c = compute_gstin_checksum(vg[:14])
            bill["vendor_gstin"] = vg[:14] + c
            fixed_action = "FIXED_GSTIN"

    bill["items"] = items
    updated_result = itc_shield.evaluate_bill(bill, payload.buyer_gstin, is_fix_update=True)
    return {
        **updated_result,
        "voice_action_applied": fixed_action,
        "updated_bill_data": bill
    }

@app.get("/api/buckets")
def get_buckets():
    return {
        "verified_count": len(verified_bucket),
        "exception_count": len(exception_bucket),
        "verified": verified_bucket,
        "exceptions": exception_bucket
    }

@app.post("/api/buckets/move-to-verified")
def move_to_verified(payload: Dict[str, Any]):
    verified_bucket.append(payload)
    return {"status": "moved", "verified_count": len(verified_bucket)}

@app.get("/api/export-csv")
def export_csv():
    """
    Exports clean verified bills into GST-ready CSV format for Tally / GST Portal.
    """
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Headers matching GST GSTR-2B ITC format
    writer.writerow([
        "GSTIN of Supplier", "Supplier Name", "Invoice Number", "Invoice Date", 
        "Invoice Value (₹)", "Place of Supply", "Item Description", "HSN Code", 
        "Taxable Value (₹)", "Integrated Tax (₹)", "Central Tax (₹)", "State/UT Tax (₹)", 
        "ITC Status"
    ])

    for entry in verified_bucket:
        meta = entry.get("invoice_metadata", {})
        math_data = entry.get("math_verification", {})
        tb = math_data.get("tax_breakdown", {})
        
        for it in math_data.get("items", []):
            writer.writerow([
                meta.get("vendor_gstin"),
                meta.get("vendor_name"),
                meta.get("invoice_number"),
                meta.get("invoice_date"),
                math_data.get("calculated_grand_total"),
                meta.get("place_of_supply"),
                it.get("item_name"),
                it.get("hsn"),
                it.get("calculated_amount"),
                tb.get("igst", 0.0),
                tb.get("cgst", 0.0),
                tb.get("sgst", 0.0),
                "ELIGIBLE_100_VERIFIED"
            ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=kachha2gst_clean_entries.csv"}
    )
