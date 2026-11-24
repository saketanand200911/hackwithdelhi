"use client";

import React, { useState, useRef } from "react";
import {
  Camera,
  Upload,
  Sparkles,
  Receipt,
  Scan,
  RefreshCw,
  Mic,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Wand2,
  Calculator,
  Layers,
  Building2,
  Hash,
  FileSpreadsheet,
  ArrowLeft,
  X
} from "lucide-react";
import confetti from "canvas-confetti";

interface LineItem {
  item_name: string;
  hsn: string;
  qty: number;
  rate: number;
  billed_amount: number;
  calculated_amount: number;
  tax_rate: number;
  has_math_error: boolean;
  math_discrepancy: number;
  suggested_amount: number;
  alias_suggested_hsn?: string;
  alias_suggested_rate?: number;
}

interface AlertItem {
  category: string;
  title: string;
  message: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  item_name?: string;
  diff?: number;
}

interface OneClickFix {
  type: string;
  item_name?: string;
  target_value?: any;
  target_hsn?: string;
  label: string;
  description: string;
}

interface BillAuditResult {
  bucket: "VERIFIED" | "CA_EXCEPTION";
  status: "CLEAN" | "FLAGGED";
  at_risk_itc: number;
  plain_summary: string;
  alerts: AlertItem[];
  one_click_fixes: OneClickFix[];
  math_verification: {
    items: LineItem[];
    calculated_taxable: number;
    calculated_tax: number;
    calculated_grand_total: number;
    billed_taxable: number;
    billed_tax: number;
    billed_grand_total: number;
    tax_breakdown: {
      cgst: number;
      sgst: number;
      igst: number;
      is_interstate: boolean;
    };
    is_math_valid: boolean;
  };
  vendor_gstin_validation: {
    is_valid: boolean;
    gstin: string;
    state_name?: string;
    message: string;
    expected_checksum?: string;
  };
  duplicate_check: {
    is_duplicate: boolean;
    message: string;
  };
  invoice_metadata: {
    vendor_name: string;
    vendor_gstin: string;
    invoice_number: string;
    invoice_date: string;
    buyer_gstin: string;
    place_of_supply: string;
  };
  preview_svg?: string;
  preview_image?: string;
  extracted_raw?: any;
}

const API_BASE = "http://127.0.0.1:8000";

export default function ScannerPage() {
  const [activeBill, setActiveBill] = useState<BillAuditResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [showVoiceModal, setShowVoiceModal] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [voiceMode, setVoiceMode] = useState<"fix" | "create_entry">("create_entry");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Load Demo Bill (explicitly triggered by user)
  const handleLoadDemo = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const formData = new FormData();
      formData.append("sample_id", "sample-1-hardware-flawed");
      const res = await fetch(`${API_BASE}/api/extract-and-verify`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data: BillAuditResult = await res.json();
        setActiveBill(data);
      } else {
        setErrorMessage("Demo load error: " + (await res.text()));
      }
    } catch (e: any) {
      console.error(e);
      setErrorMessage("Network error connecting to backend: " + (e?.message || ""));
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (e.target) e.target.value = "";
    uploadFileProcess(file);
  };

  const uploadFileProcess = async (file: File) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API_BASE}/api/extract-and-verify`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data: BillAuditResult = await res.json();
        setActiveBill(data);
      } else {
        const errText = await res.text();
        console.error("Upload failed:", errText);
        setErrorMessage("Parcha read karne me samasya aayi. Kripya saaf photo upload karein ya demo bill check karein.");
      }
    } catch (e: any) {
      console.error(e);
      setErrorMessage("Backend server se connect nahi ho paya: " + (e?.message || ""));
    } finally {
      setLoading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadFileProcess(e.dataTransfer.files[0]);
    }
  };

  const executeFix = async (fix: OneClickFix) => {
    if (!activeBill) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/apply-fix`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bill_data: activeBill.extracted_raw || activeBill.invoice_metadata,
          fix_type: fix.type,
          item_name: fix.item_name,
          target_value: fix.target_value,
          target_hsn: fix.target_hsn,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        const mergedBill: BillAuditResult = {
          ...activeBill,
          ...updated,
          extracted_raw: updated.updated_bill_data,
        };
        setActiveBill(mergedBill);

        if (mergedBill.bucket === "VERIFIED") {
          confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceCommand = async (command: string) => {
    if (voiceMode === "create_entry") {
      setLoading(true);
      setShowVoiceModal(false);
      try {
        const res = await fetch(`${API_BASE}/api/voice-entry`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ spoken_text: command }),
        });
        if (res.ok) {
          const data: BillAuditResult = await res.json();
          setActiveBill(data);
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!activeBill) return;
    setLoading(true);
    setShowVoiceModal(false);
    try {
      const res = await fetch(`${API_BASE}/api/voice-fix`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bill_data: activeBill.extracted_raw || activeBill.invoice_metadata,
          voice_transcript: command,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        const mergedBill: BillAuditResult = {
          ...activeBill,
          ...updated,
          extracted_raw: updated.updated_bill_data,
        };
        setActiveBill(mergedBill);
        if (mergedBill.bucket === "VERIFIED") {
          confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const startVoiceInput = (mode: "fix" | "create_entry") => {
    setVoiceMode(mode);
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setShowVoiceModal(true);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "hi-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setShowVoiceModal(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setIsListening(false);
      handleVoiceCommand(transcript);
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-6">
      {/* Hidden file inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/*,.pdf"
        className="hidden"
      />
      <input
        type="file"
        ref={cameraInputRef}
        onChange={handleFileUpload}
        accept="image/*"
        capture="environment"
        className="hidden"
      />

      {/* STATE 1: UNCLUTTERED SCANNER SCREEN (Shown when no bill is being audited) */}
      {!activeBill && (
        <div className="flex-1 flex flex-col items-center justify-center py-6 sm:py-12">
          <div className="max-w-2xl w-full flex flex-col items-center text-center gap-6">
            {/* Header Badge */}
            <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/30 text-orange-400 px-3.5 py-1 rounded-full text-xs font-bold">
              <Scan className="w-3.5 h-3.5" />
              Receipt Scanner &amp; Mismatch Shield
            </div>

            {/* Title */}
            <div>
              <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                Snap, Upload or Speak Any Bill
              </h2>
              <p className="text-sm sm:text-base text-slate-400 mt-2 max-w-lg mx-auto">
                Handwritten Hindi &amp; Hinglish kachha slips turn into GST-compliant records with zero math errors.
              </p>
            </div>

            {/* Error Notice */}
            {errorMessage && (
              <div className="w-full p-4 bg-red-950/40 border border-red-500/40 rounded-2xl text-red-300 text-xs sm:text-sm flex items-center justify-between gap-3 shadow-lg animate-in fade-in">
                <span>{errorMessage}</span>
                <button
                  onClick={() => setErrorMessage(null)}
                  className="px-2 py-1 bg-red-900/50 hover:bg-red-800 rounded-lg text-white font-bold text-xs"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Big Interactive Scanner Drop Zone */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`w-full rounded-3xl p-8 sm:p-12 border-2 border-dashed transition-all flex flex-col items-center justify-center gap-6 shadow-2xl relative ${
                dragActive
                  ? "border-orange-500 bg-orange-950/20 scale-[1.01]"
                  : "border-slate-800 bg-slate-900/70 hover:border-slate-700"
              }`}
            >
              {loading ? (
                <div className="flex flex-col items-center gap-3 py-8">
                  <RefreshCw className="w-12 h-12 text-orange-400 animate-spin" />
                  <p className="text-sm font-bold text-white">Auditing Receipt Arithmetic...</p>
                  <p className="text-xs text-slate-400">Verifying 14,416 HSN codes &amp; Modulo-36 GSTIN</p>
                </div>
              ) : (
                <>
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-orange-500/20 to-amber-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400 shadow-inner">
                    <Scan className="w-10 h-10" />
                  </div>

                  <div className="flex flex-col gap-1">
                    <p className="text-base font-bold text-white">Drag &amp; drop handwritten parchi or photo</p>
                    <p className="text-xs text-slate-400">Supports JPG, PNG, WEBP, or scanned PDF</p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center justify-center gap-3 w-full max-w-md">
                    <button
                      onClick={() => cameraInputRef.current?.click()}
                      className="flex-1 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold text-xs py-3.5 px-4 rounded-xl shadow-lg shadow-orange-500/25 transition-all cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      Take Photo / Camera
                    </button>

                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-white font-semibold text-xs py-3.5 px-4 rounded-xl transition-all cursor-pointer"
                    >
                      <Upload className="w-4 h-4 text-slate-300" />
                      Browse Files
                    </button>
                  </div>

                  {/* Voice Billing Option */}
                  <div className="pt-4 border-t border-slate-800/80 w-full flex items-center justify-center">
                    <button
                      onClick={() => startVoiceInput("create_entry")}
                      className="flex items-center gap-2 text-xs font-semibold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-4 py-2 rounded-xl transition-all cursor-pointer"
                    >
                      <Mic className="w-4 h-4 text-amber-400" />
                      <span>Bol Ke Entry Banao (Voice Billing in Hindi)</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* SEPARATE DEMO BUTTON (Clean & distinct option) */}
            <div className="flex flex-col sm:flex-row items-center gap-3 bg-slate-900 border border-slate-800 rounded-2xl p-4 w-full justify-between">
              <div className="flex items-center gap-3 text-left">
                <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Need a live sample to test?</h4>
                  <p className="text-[11px] text-slate-400">Test the 60s demo on Sharma Ji Hardware slip with intentional errors.</p>
                </div>
              </div>

              <button
                onClick={handleLoadDemo}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-750 border border-orange-500/40 text-orange-300 text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer shadow-sm shrink-0"
              >
                <span>⚡ Load 60s Demo Bill</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STATE 2: ACTIVE BILL AUDITED SCREEN */}
      {activeBill && (
        <div className="flex flex-col gap-6">
          {/* Top Bar with 'Scan Another Bill' */}
          <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl px-4 py-3">
            <button
              onClick={() => setActiveBill(null)}
              className="flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>← Scan Another Bill / Nayi Parchi</span>
            </button>

            <div className="flex items-center gap-3 text-xs">
              <span className="text-slate-400">Vendor: <strong className="text-white">{activeBill.invoice_metadata.vendor_name}</strong></span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-400">Inv: <strong className="text-slate-200 font-mono">{activeBill.invoice_metadata.invoice_number}</strong></span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Original Bill Preview (5 cols) */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col h-full shadow-xl">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-orange-400" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      Original Receipt / Parchi
                    </h3>
                  </div>
                  <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                    {activeBill.invoice_metadata.place_of_supply}
                  </span>
                </div>

                {/* Preview Window */}
                <div className="flex-1 min-h-[460px] bg-slate-950/70 border border-slate-800/80 rounded-xl mt-3 p-2 flex items-center justify-center overflow-hidden">
                  {activeBill.preview_svg ? (
                    <div
                      className="w-full h-full max-h-[560px] flex items-center justify-center rounded overflow-hidden"
                      dangerouslySetInnerHTML={{ __html: activeBill.preview_svg }}
                    />
                  ) : activeBill.preview_image ? (
                    <div className="w-full h-full max-h-[560px] flex items-center justify-center rounded overflow-hidden p-2">
                      <img
                        src={activeBill.preview_image}
                        alt="Uploaded Slip"
                        className="max-h-[540px] max-w-full object-contain rounded-lg shadow-md"
                      />
                    </div>
                  ) : (
                    <div className="text-center p-8 text-slate-500 text-xs">
                      <Receipt className="w-12 h-12 mx-auto mb-2 text-slate-700" />
                      <p>Uploaded physical slip preview.</p>
                    </div>
                  )}
                </div>

                <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Transcribed with Local Vision
                  </span>
                  <span className="font-mono text-[11px]">100% Deterministic Math</span>
                </div>
              </div>
            </div>

            {/* Right: Deterministic Audit Shield (7 cols) */}
            <div className="lg:col-span-7 flex flex-col gap-4">
              {/* AT-RISK ITC HERO CARD */}
              <div
                className={`rounded-2xl p-5 border transition-all shadow-xl ${
                  activeBill.bucket === "VERIFIED"
                    ? "bg-emerald-950/25 border-emerald-500/40"
                    : "bg-red-950/25 border-red-500/40"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`p-3 rounded-xl shadow-inner ${
                        activeBill.bucket === "VERIFIED"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {activeBill.bucket === "VERIFIED" ? (
                        <ShieldCheck className="w-7 h-7" />
                      ) : (
                        <ShieldAlert className="w-7 h-7 animate-pulse" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {activeBill.bucket === "VERIFIED"
                            ? "DETERMINISTIC SHIELD: PASSED"
                            : "DETERMINISTIC SHIELD: TRIGGERED"}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                            activeBill.bucket === "VERIFIED"
                              ? "bg-emerald-500 text-slate-950"
                              : "bg-red-500 text-white"
                          }`}
                        >
                          {activeBill.bucket === "VERIFIED" ? "100% CLEAN BILL" : "FLAGGED BILL"}
                        </span>
                      </div>

                      <div className="mt-1 flex items-baseline gap-2">
                        <span className="text-3xl font-black text-white tracking-tight">
                          At-Risk ITC: ₹{activeBill.at_risk_itc.toFixed(2)}
                        </span>
                        {activeBill.at_risk_itc > 0 && (
                          <span className="text-xs text-red-400 font-semibold">
                            (Tax credit in danger of rejection)
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
                        {activeBill.plain_summary}
                      </p>
                    </div>
                  </div>

                  {activeBill.bucket === "VERIFIED" ? (
                    <div className="shrink-0 flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-lg font-semibold">
                      <CheckCircle2 className="w-4 h-4" />
                      Ready for Filing
                    </div>
                  ) : null}
                </div>

                {/* 1-TAP QUICK FIXES */}
                {activeBill.one_click_fixes.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-800/80">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Wand2 className="w-3.5 h-3.5 text-amber-400" />
                        1-Tap Quick Fixes:
                      </span>
                      <button
                        onClick={() => startVoiceInput("fix")}
                        className="text-[11px] text-orange-400 hover:text-orange-300 flex items-center gap-1 cursor-pointer"
                      >
                        <Mic className="w-3 h-3" />
                        <span>Voice Fix Available</span>
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {activeBill.one_click_fixes.map((fix, idx) => (
                        <button
                          key={idx}
                          onClick={() => executeFix(fix)}
                          className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-500/40 text-amber-200 text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm transition-all cursor-pointer"
                        >
                          <Sparkles className="w-3 h-3 text-amber-400" />
                          <span>{fix.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 4 DETERMINISTIC GUARDS TILES */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-400">01. Tax Math</span>
                    <Calculator
                      className={`w-4 h-4 ${
                        activeBill.math_verification.is_math_valid ? "text-emerald-400" : "text-red-400"
                      }`}
                    />
                  </div>
                  <div className="mt-2">
                    <span
                      className={`text-xs font-bold ${
                        activeBill.math_verification.is_math_valid ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {activeBill.math_verification.is_math_valid ? "Pass (Exact)" : "Mismatch"}
                    </span>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Net: ₹{activeBill.math_verification.calculated_grand_total.toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-400">02. HSN Slabs</span>
                    <Layers
                      className={`w-4 h-4 ${
                        activeBill.alerts.some((a) => a.category.includes("SLAB"))
                          ? "text-red-400"
                          : "text-emerald-400"
                      }`}
                    />
                  </div>
                  <div className="mt-2">
                    <span
                      className={`text-xs font-bold ${
                        activeBill.alerts.some((a) => a.category.includes("SLAB"))
                          ? "text-red-400"
                          : "text-emerald-400"
                      }`}
                    >
                      {activeBill.alerts.some((a) => a.category.includes("SLAB"))
                        ? "Wrong Slab"
                        : "Verified"}
                    </span>
                    <p className="text-[10px] text-slate-500 mt-0.5">14,416 Codes</p>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-400">03. GSTIN Guard</span>
                    <Building2
                      className={`w-4 h-4 ${
                        activeBill.vendor_gstin_validation.is_valid ? "text-emerald-400" : "text-red-400"
                      }`}
                    />
                  </div>
                  <div className="mt-2">
                    <span
                      className={`text-xs font-bold ${
                        activeBill.vendor_gstin_validation.is_valid ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {activeBill.vendor_gstin_validation.is_valid ? "Modulo-36 OK" : "Invalid"}
                    </span>
                    <p className="text-[10px] text-slate-500 mt-0.5 truncate font-mono">
                      {activeBill.vendor_gstin_validation.gstin}
                    </p>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-400">04. Duplicate</span>
                    <Hash
                      className={`w-4 h-4 ${
                        activeBill.duplicate_check.is_duplicate ? "text-red-400" : "text-emerald-400"
                      }`}
                    />
                  </div>
                  <div className="mt-2">
                    <span
                      className={`text-xs font-bold ${
                        activeBill.duplicate_check.is_duplicate ? "text-red-400" : "text-emerald-400"
                      }`}
                    >
                      {activeBill.duplicate_check.is_duplicate ? "Duplicate" : "Unique Bill"}
                    </span>
                    <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                      {activeBill.invoice_metadata.invoice_number}
                    </p>
                  </div>
                </div>
              </div>

              {/* LINE ITEMS TABLE */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
                <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      Audited Items &amp; Math
                    </h4>
                  </div>
                  <span className="text-xs text-slate-400">
                    State: <strong className="text-white">{activeBill.invoice_metadata.place_of_supply}</strong>
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-400 text-[11px] border-b border-slate-800">
                      <tr>
                        <th className="py-2.5 px-4 font-semibold">Item</th>
                        <th className="py-2.5 px-3 font-semibold">HSN</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Qty</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Rate (₹)</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Billed (₹)</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Calc (₹)</th>
                        <th className="py-2.5 px-3 font-semibold text-center">GST %</th>
                        <th className="py-2.5 px-4 font-semibold text-center">Audit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-200">
                      {activeBill.math_verification.items.map((it, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/40">
                          <td className="py-3 px-4 font-medium text-white">
                            <div>{it.item_name}</div>
                            {it.alias_suggested_hsn && (
                              <div className="text-[10px] text-amber-400">
                                Suggestion: HSN {it.alias_suggested_hsn} ({it.alias_suggested_rate}%)
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-400">
                            {it.hsn || <span className="text-red-400 font-semibold">Missing</span>}
                          </td>
                          <td className="py-3 px-3 text-right font-mono">{it.qty}</td>
                          <td className="py-3 px-3 text-right font-mono">₹{it.rate.toFixed(2)}</td>
                          <td className={`py-3 px-3 text-right font-mono ${it.has_math_error ? "text-red-400 font-bold" : ""}`}>
                            ₹{it.billed_amount.toFixed(2)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-emerald-400 font-semibold">
                            ₹{it.calculated_amount.toFixed(2)}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="bg-slate-800 border border-slate-700 text-slate-300 px-2 py-0.5 rounded text-[10px] font-mono">
                              {it.tax_rate}%
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {it.has_math_error ? (
                              <span className="inline-flex items-center gap-1 text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded font-semibold">
                                <AlertTriangle className="w-3 h-3" />
                                Diff: ₹{it.math_discrepancy.toFixed(2)}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-semibold">
                                <CheckCircle2 className="w-3 h-3" />
                                Exact
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="bg-slate-950/80 px-4 py-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
                  <div className="flex items-center gap-4 text-slate-400">
                    <span>Taxable: <strong className="text-white">₹{activeBill.math_verification.calculated_taxable.toFixed(2)}</strong></span>
                    <span>Total GST: <strong className="text-emerald-400">₹{activeBill.math_verification.calculated_tax.toFixed(2)}</strong></span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Statutory Net Total:</span>
                    <span className="text-base font-black text-white bg-slate-800 px-3 py-1 rounded-lg border border-slate-700 font-mono">
                      ₹{activeBill.math_verification.calculated_grand_total.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Voice Assistant Modal */}
      {showVoiceModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Mic className="w-4 h-4 text-orange-400" />
                {voiceMode === "create_entry" ? "Voice Billing (Bol Ke Entry Banao)" : "1-Tap Voice Fix"}
              </div>
              <button
                onClick={() => setShowVoiceModal(false)}
                className="text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="my-4">
              {isListening ? (
                <div className="flex flex-col items-center justify-center py-6 gap-3 text-center">
                  <div className="w-16 h-16 rounded-full bg-orange-500/20 border-2 border-orange-500 flex items-center justify-center animate-ping">
                    <Mic className="w-7 h-7 text-orange-400" />
                  </div>
                  <p className="text-sm font-semibold text-orange-300">Listening in Hindi / Hinglish...</p>
                  <p className="text-xs text-slate-400">Bolie: &quot;Maine Sharma ji se 10 bundle sariya 600 rupay me kharida&quot;</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-slate-300 mb-2">
                    Microphone allow karein ya sample Hinglish spoken entries pe click karein:
                  </p>

                  <button
                    onClick={() => handleVoiceCommand("Maine Sharma ji se 10 bundle sariya 600 rupay me kharida aur 5 kilo taar 90 rupay me")}
                    className="text-left text-xs bg-slate-950 hover:bg-slate-800 border border-slate-800 p-2.5 rounded-lg text-slate-200 transition-colors cursor-pointer"
                  >
                    🗣️ &quot;Maine Sharma ji se 10 bundle sariya 600 rupay me kharida aur 5 kilo taar 90 rupay me&quot;
                  </button>

                  <button
                    onClick={() => handleVoiceCommand("Gupta store se 5000 ka maal kharida")}
                    className="text-left text-xs bg-slate-950 hover:bg-slate-800 border border-slate-800 p-2.5 rounded-lg text-slate-200 transition-colors cursor-pointer"
                  >
                    🗣️ &quot;Gupta store se 5000 ka maal kharida&quot;
                  </button>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowVoiceModal(false)}
                className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg font-medium cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
