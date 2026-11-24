"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  FileCheck2,
  FileWarning,
  Sparkles,
  Download,
  Upload,
  RefreshCw,
  Mic,
  CheckCircle2,
  AlertTriangle,
  Wand2,
  Receipt,
  Building2,
  Layers,
  FileSpreadsheet,
  Hash,
  Calculator,
  ScanEye,
  Search,
  ChevronRight,
  TrendingUp,
  BarChart3,
  Bot,
  MessageSquare,
  Smartphone,
  Send,
  HelpCircle,
  Package,
  Users,
  PieChart
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
  extracted_raw?: any;
}

interface BusinessIntelligence {
  summary: {
    total_invoices: number;
    clean_invoices: number;
    flagged_invoices: number;
    total_purchases_spend: number;
    total_gst_paid: number;
    net_eligible_itc: number;
    total_at_risk_itc: number;
  };
  gst_readiness: {
    score: number;
    status: string;
    target_score: number;
    clean_percentage: number;
    advice: string;
  };
  top_suppliers: Array<{
    name: string;
    gstin: string;
    total_spend: number;
    invoice_count: number;
  }>;
  top_purchased_products: Array<{
    name: string;
    total_spend: number;
    total_qty: number;
    count: number;
  }>;
  risk_anomalies: Array<{
    type: string;
    severity: string;
    vendor: string;
    invoice: string;
    risk_amount: number;
    message: string;
  }>;
}

const API_BASE = "http://127.0.0.1:8000";

export default function Home() {
  const [activeBill, setActiveBill] = useState<BillAuditResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [currentView, setCurrentView] = useState<"audit" | "bi_dashboard" | "ai_ca" | "whatsapp">("audit");
  const [activeTab, setActiveTab] = useState<"audit" | "verified_queue" | "exception_queue">("audit");
  const [verifiedList, setVerifiedList] = useState<BillAuditResult[]>([]);
  const [exceptionList, setExceptionList] = useState<BillAuditResult[]>([]);
  const [biData, setBiData] = useState<BusinessIntelligence | null>(null);
  
  // Voice state
  const [isListening, setIsListening] = useState<boolean>(false);
  const [showVoiceModal, setShowVoiceModal] = useState<boolean>(false);
  const [voiceMode, setVoiceMode] = useState<"fix" | "create_entry">("fix");
  
  // HSN Search
  const [showHsnSearch, setShowHsnSearch] = useState<boolean>(false);
  const [hsnQuery, setHsnQuery] = useState<string>("");
  const [hsnResults, setHsnResults] = useState<any[]>([]);

  // AI CA Chat
  const [chatMessages, setChatMessages] = useState<Array<{ sender: "user" | "ca"; text: string }>>([
    {
      sender: "ca",
      text: "Namaste Sharma Ji! Mai aapka Vyaapar CA Assistant hoon. Aapke khareedari bills me se tax bachaane aur notice se bachne me mai aapki madad karunga. Koi bhi sawal poochiye!"
    }
  ]);
  const [userQuery, setUserQuery] = useState<string>("");
  const [caLoading, setCaLoading] = useState<boolean>(false);

  // Drag and drop
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [isDemoLoaded, setIsDemoLoaded] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadFlagshipDemo();
    fetchBiMetrics();
  }, []);

  const fetchBiMetrics = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/business-intelligence`);
      if (res.ok) {
        const data = await res.json();
        setBiData(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadFlagshipDemo = async () => {
    setLoading(true);
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
        setIsDemoLoaded(true);
        updateBucketsList(data);
        fetchBiMetrics();
      }
    } catch (err) {
      console.error("Error loading demo:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadFileProcess(file);
  };

  const uploadFileProcess = async (file: File) => {
    setLoading(true);
    setIsDemoLoaded(false);
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
        updateBucketsList(data);
        fetchBiMetrics();
      }
    } catch (err) {
      console.error("Error uploading bill:", err);
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

  const updateBucketsList = (bill: BillAuditResult) => {
    const inv = bill.invoice_metadata.invoice_number;
    if (bill.bucket === "VERIFIED") {
      setVerifiedList((prev) => [bill, ...prev.filter((b) => b.invoice_metadata.invoice_number !== inv)]);
      setExceptionList((prev) => prev.filter((b) => b.invoice_metadata.invoice_number !== inv));
    } else {
      setExceptionList((prev) => [bill, ...prev.filter((b) => b.invoice_metadata.invoice_number !== inv)]);
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
        updateBucketsList(mergedBill);
        fetchBiMetrics();

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
      // Voice-to-Billing Assistant
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
          updateBucketsList(data);
          fetchBiMetrics();
          setCurrentView("audit");
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
        updateBucketsList(mergedBill);
        fetchBiMetrics();

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

  const startVoiceInput = (mode: "fix" | "create_entry" = "fix") => {
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

  const handleAskCa = async (customQuery?: string) => {
    const q = customQuery || userQuery;
    if (!q.trim()) return;

    setChatMessages((prev) => [...prev, { sender: "user", text: q }]);
    setUserQuery("");
    setCaLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/ai-ca/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: q,
          bill_summary: activeBill?.plain_summary,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setChatMessages((prev) => [...prev, { sender: "ca", text: data.response }]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCaLoading(false);
    }
  };

  const handleSearchHsn = async (term: string) => {
    setHsnQuery(term);
    if (!term.trim()) {
      setHsnResults([]);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/hsn-search?q=${encodeURIComponent(term)}&limit=8`);
      if (res.ok) {
        const data = await res.json();
        setHsnResults(data.results || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSelectHsn = (hsnItem: any) => {
    if (!activeBill) return;
    executeFix({
      type: "APPLY_CATALOG_HSN",
      target_hsn: hsnItem.hsn,
      target_value: hsnItem.igst,
      label: `Apply HSN ${hsnItem.hsn} (${hsnItem.igst}%)`,
      description: hsnItem.description,
    });
    setShowHsnSearch(false);
  };

  const handleDownloadCsv = () => {
    window.open(`${API_BASE}/api/export-csv`, "_blank");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-orange-500 selection:text-slate-950">
      {/* Top Header */}
      <header className="border-b border-slate-800/90 bg-slate-900/90 backdrop-blur sticky top-0 z-40 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="bg-gradient-to-tr from-orange-500 to-amber-400 p-2.5 rounded-xl shadow-lg shadow-orange-500/25 text-slate-950 font-black flex items-center justify-center">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-1.5">
                Kachha<span className="text-orange-400">2</span>GST
              </h1>
              <span className="text-[11px] bg-orange-500/10 border border-orange-500/30 text-orange-400 px-2.5 py-0.5 rounded-full font-semibold">
                AI Business Assistant for MSMEs
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              Handwritten Paper-to-Compliance &amp; Business Intelligence
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="hidden lg:flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 rounded-xl p-1 shadow-inner">
          <button
            onClick={() => setCurrentView("audit")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              currentView === "audit"
                ? "bg-slate-800 text-white shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-orange-400" />
            Bill Scanner &amp; Shield
          </button>

          <button
            onClick={() => {
              setCurrentView("bi_dashboard");
              fetchBiMetrics();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              currentView === "bi_dashboard"
                ? "bg-slate-800 text-white shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            Business Intelligence
          </button>

          <button
            onClick={() => setCurrentView("ai_ca")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              currentView === "ai_ca"
                ? "bg-slate-800 text-white shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Bot className="w-3.5 h-3.5 text-blue-400" />
            Vyaapar CA (Hindi)
          </button>

          <button
            onClick={() => setCurrentView("whatsapp")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              currentView === "whatsapp"
                ? "bg-slate-800 text-white shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 text-green-400" />
            WhatsApp Bot
          </button>
        </div>

        {/* Right Tools */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => startVoiceInput("create_entry")}
            className="flex items-center gap-1.5 bg-gradient-to-r from-orange-500/20 to-amber-500/20 hover:from-orange-500/30 hover:to-amber-500/30 border border-orange-500/40 text-orange-300 text-xs font-semibold px-3 py-2 rounded-lg transition-all cursor-pointer shadow-sm"
          >
            <Mic className="w-3.5 h-3.5 text-orange-400" />
            Bol Ke Entry Banao
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*,.pdf"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-slate-300" />
            Upload Bill
          </button>

          <button
            onClick={handleDownloadCsv}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-md transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            CSV Export
          </button>
        </div>
      </header>

      {/* SINGLE FLAGSHIP 60-SECOND DEMO HERO BAR */}
      <section className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-b border-slate-800/80 px-6 py-2.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-orange-500/20 border border-orange-500/40 text-orange-400 p-1.5 rounded-lg flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-white">
                Live Flagship Demo: Sharma Ji Loha &amp; Hardware
              </span>
              <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.2 rounded font-semibold">
                Flaws: Wrong Slab (12% vs 18%) &amp; Math Error
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Watch flagged Hinglish slip turn 100% clean &amp; calculate exact At-Risk ITC in 60s
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadFlagshipDemo}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer ${
              isDemoLoaded
                ? "bg-orange-500 text-slate-950 font-extrabold shadow-orange-500/25 ring-2 ring-orange-400"
                : "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Reset Demo Slip</span>
          </button>
        </div>
      </section>

      {/* VIEW 1: BILL SCANNER & AUDIT SHIELD (Default) */}
      {currentView === "audit" && (
        <main className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Original Slip Viewer (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="bg-slate-900 border border-slate-800/90 rounded-2xl p-4 flex flex-col h-full shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-orange-400" />
                  <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                    Original Receipt / Parchi
                  </h2>
                </div>
                <span className="text-[10px] text-slate-400 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded font-mono">
                  {activeBill?.invoice_metadata.invoice_number || "SLIP-001"}
                </span>
              </div>

              {/* Slip Drag & Drop Area */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`flex-1 min-h-[480px] rounded-xl mt-3 p-3 border transition-all flex flex-col items-center justify-center relative overflow-hidden ${
                  dragActive
                    ? "border-orange-500 bg-orange-950/20"
                    : "border-slate-800/80 bg-slate-950/70"
                }`}
              >
                {loading ? (
                  <div className="flex flex-col items-center gap-3 text-slate-400 p-8">
                    <RefreshCw className="w-10 h-10 animate-spin text-orange-400" />
                    <p className="text-xs font-semibold text-white">Running Deterministic Tax Audit...</p>
                    <p className="text-[11px] text-slate-500">Checking 14,416 HSN codes &amp; Modulo-36 checksum</p>
                  </div>
                ) : activeBill?.preview_svg ? (
                  <div
                    className="w-full h-full max-h-[580px] flex items-center justify-center rounded overflow-hidden shadow-inner"
                    dangerouslySetInnerHTML={{ __html: activeBill.preview_svg }}
                  />
                ) : (
                  <div className="text-center p-8 flex flex-col items-center gap-2 text-slate-500">
                    <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 mb-2">
                      <Upload className="w-6 h-6 text-orange-400" />
                    </div>
                    <p className="text-xs font-semibold text-slate-300">Drag &amp; drop any handwritten bill here</p>
                    <p className="text-[11px] text-slate-500">or click &quot;Upload Bill&quot; above</p>
                  </div>
                )}
              </div>

              <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-[11px] text-slate-300 font-medium">Local Vision Engine</span>
                </span>
                <span className="text-[11px] text-slate-500 font-mono">100% Offline Math Guard</span>
              </div>
            </div>
          </div>

          {/* Right Column: Deterministic Audit Shield (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {/* View Switcher Pills */}
            <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl p-1.5">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setActiveTab("audit")}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === "audit"
                      ? "bg-slate-800 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Layers className="w-3.5 h-3.5 text-orange-400" />
                  Active Bill Audit
                </button>

                <button
                  onClick={() => setActiveTab("exception_queue")}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === "exception_queue"
                      ? "bg-slate-800 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <FileWarning className="w-3.5 h-3.5 text-red-400" />
                  CA Exception Queue
                  <span className="bg-red-500/20 text-red-400 text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                    {exceptionList.length}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab("verified_queue")}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === "verified_queue"
                      ? "bg-slate-800 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <FileCheck2 className="w-3.5 h-3.5 text-emerald-400" />
                  Verified / Clean
                  <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                    {verifiedList.length}
                  </span>
                </button>
              </div>

              {/* Voice Fix Trigger */}
              <button
                onClick={() => startVoiceInput("fix")}
                className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-orange-500/40 text-orange-300 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-sm"
              >
                <Mic className="w-3.5 h-3.5 text-orange-400" />
                Voice Fix
              </button>
            </div>

            {/* AT-RISK ITC HERO CARD */}
            {activeBill && activeTab === "audit" && (
              <div className="flex flex-col gap-4">
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
                            {activeBill.bucket === "VERIFIED" ? "100% CLEAN" : "FLAGGED BILL"}
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
                        Ready for CA Filing
                      </div>
                    ) : null}
                  </div>

                  {/* 1-TAP QUICK FIX BUTTONS */}
                  {activeBill.one_click_fixes.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-800/80">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                          <Wand2 className="w-3.5 h-3.5 text-amber-400" />
                          1-Tap Quick Fixes:
                        </span>
                        <span className="text-[10px] text-slate-400">Auto-fix arithmetic &amp; sync schedule</span>
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
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
                      <p className="text-[10px] text-slate-500 mt-0.5">india-hsn-2026.json</p>
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
                        {activeBill.vendor_gstin_validation.is_valid ? "Modulo-36 OK" : "Invalid Checksum"}
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
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                        Line Items &amp; Arithmetic Audit
                      </h3>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Vendor: <strong className="text-white">{activeBill.invoice_metadata.vendor_name}</strong>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-950 text-slate-400 text-[11px] border-b border-slate-800">
                        <tr>
                          <th className="py-2.5 px-4 font-semibold">Item Description</th>
                          <th className="py-2.5 px-3 font-semibold">HSN</th>
                          <th className="py-2.5 px-3 font-semibold text-right">Qty</th>
                          <th className="py-2.5 px-3 font-semibold text-right">Rate (₹)</th>
                          <th className="py-2.5 px-3 font-semibold text-right">Parchi Amt (₹)</th>
                          <th className="py-2.5 px-3 font-semibold text-right">Calc Amt (₹)</th>
                          <th className="py-2.5 px-3 font-semibold text-center">Tax Slab</th>
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
                                  Hinglish Suggestion: HSN {it.alias_suggested_hsn} ({it.alias_suggested_rate}%)
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-3 font-mono text-slate-400">
                              {it.hsn || <span className="text-red-400 font-semibold">Missing</span>}
                            </td>
                            <td className="py-3 px-3 text-right font-mono">{it.qty}</td>
                            <td className="py-3 px-3 text-right font-mono">₹{it.rate.toFixed(2)}</td>
                            <td
                              className={`py-3 px-3 text-right font-mono ${
                                it.has_math_error ? "text-red-400 font-bold" : ""
                              }`}
                            >
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
                      <span>
                        Taxable: <strong className="text-white">₹{activeBill.math_verification.calculated_taxable.toFixed(2)}</strong>
                      </span>
                      <span>
                        Total Tax: <strong className="text-emerald-400">₹{activeBill.math_verification.calculated_tax.toFixed(2)}</strong>
                      </span>
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
            )}

            {/* CA Exception Queue Tab */}
            {activeTab === "exception_queue" && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <FileWarning className="w-4 h-4 text-red-400" />
                    CA Exception Queue ({exceptionList.length} Flagged Bills)
                  </h3>
                </div>

                {exceptionList.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 text-xs">
                    <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-500" />
                    All bills are clean! Zero pending exceptions.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {exceptionList.map((item, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          setActiveBill(item);
                          setActiveTab("audit");
                        }}
                        className="bg-slate-950 border border-red-500/30 hover:border-red-500/60 rounded-xl p-3.5 flex items-center justify-between cursor-pointer transition-all"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-xs">
                              {item.invoice_metadata.vendor_name}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              Inv #{item.invoice_metadata.invoice_number}
                            </span>
                          </div>
                          <p className="text-xs text-red-400 mt-1">{item.plain_summary}</p>
                        </div>

                        <div className="text-right">
                          <span className="text-sm font-bold text-red-400 font-mono">
                            ₹{item.at_risk_itc.toFixed(2)}
                          </span>
                          <div className="text-[10px] text-slate-500">At-Risk ITC</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Verified Tab */}
            {activeTab === "verified_queue" && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <FileCheck2 className="w-4 h-4 text-emerald-400" />
                    Verified / Clean Entries ({verifiedList.length} Ready for Filing)
                  </h3>
                  <button
                    onClick={handleDownloadCsv}
                    className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download CSV
                  </button>
                </div>

                {verifiedList.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 text-xs">
                    No verified bills yet. Process a clean bill or apply 1-Tap Fixes.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {verifiedList.map((item, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          setActiveBill(item);
                          setActiveTab("audit");
                        }}
                        className="bg-slate-950 border border-emerald-500/30 hover:border-emerald-500/60 rounded-xl p-3.5 flex items-center justify-between cursor-pointer transition-all"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-xs">
                              {item.invoice_metadata.vendor_name}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              Inv #{item.invoice_metadata.invoice_number}
                            </span>
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.2 rounded font-semibold">
                              PASSED
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 mt-1">
                            Total: ₹{item.math_verification.calculated_grand_total.toFixed(2)} | Zero ITC Risk
                          </p>
                        </div>

                        <div className="text-right">
                          <span className="text-sm font-bold text-emerald-400 font-mono">
                            ₹{item.math_verification.calculated_tax.toFixed(2)}
                          </span>
                          <div className="text-[10px] text-slate-500">100% Eligible ITC</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      )}

      {/* VIEW 2: BUSINESS HEALTH & INTELLIGENCE DASHBOARD (Paper to BI) */}
      {currentView === "bi_dashboard" && biData && (
        <main className="flex-1 max-w-7xl w-full mx-auto p-6 flex flex-col gap-6">
          {/* Top Score Banner */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-850 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="relative w-24 h-24 rounded-full bg-slate-950 border-4 border-emerald-500 flex flex-col items-center justify-center shadow-lg shadow-emerald-500/20">
                <span className="text-3xl font-black text-white font-mono">{biData.gst_readiness.score}</span>
                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">/ 100</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-white">Monthly GST Readiness Score</h2>
                  <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-bold">
                    {biData.gst_readiness.status}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1 max-w-lg leading-relaxed">
                  {biData.gst_readiness.advice}
                </p>
                <div className="mt-2 text-xs text-slate-400 flex items-center gap-4">
                  <span>Clean Bills: <strong className="text-emerald-400">{biData.summary.clean_invoices}</strong></span>
                  <span>Pending Review: <strong className="text-red-400">{biData.summary.flagged_invoices}</strong></span>
                  <span>Compliance Rate: <strong className="text-white">{biData.gst_readiness.clean_percentage}%</strong></span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={handleDownloadCsv}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Download GSTR-2B Ready Report
              </button>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4.5 shadow-lg">
              <span className="text-xs text-slate-400 font-semibold">Total Purchases Spend (₹)</span>
              <div className="text-2xl font-black text-white mt-1 font-mono">
                ₹{biData.summary.total_purchases_spend.toFixed(2)}
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Across all uploaded parchi slips</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4.5 shadow-lg">
              <span className="text-xs text-slate-400 font-semibold">Total GST Paid (₹)</span>
              <div className="text-2xl font-black text-blue-400 mt-1 font-mono">
                ₹{biData.summary.total_gst_paid.toFixed(2)}
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Paid on procurement</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4.5 shadow-lg">
              <span className="text-xs text-slate-400 font-semibold">Net Eligible ITC (₹)</span>
              <div className="text-2xl font-black text-emerald-400 mt-1 font-mono">
                ₹{biData.summary.net_eligible_itc.toFixed(2)}
              </div>
              <p className="text-[10px] text-slate-500 mt-1">100% Verified &amp; claimable credit</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4.5 shadow-lg">
              <span className="text-xs text-slate-400 font-semibold">At-Risk ITC Shielded (₹)</span>
              <div className="text-2xl font-black text-red-400 mt-1 font-mono">
                ₹{biData.summary.total_at_risk_itc.toFixed(2)}
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Tax penalties prevented</p>
            </div>
          </div>

          {/* Top Products & Suppliers Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Commodities */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-orange-400" />
                  <h3 className="text-sm font-bold text-white">Top Purchased Commodities</h3>
                </div>
                <span className="text-xs text-slate-400">By Spending Volume</span>
              </div>

              <div className="mt-4 flex flex-col gap-3">
                {biData.top_purchased_products.length > 0 ? (
                  biData.top_purchased_products.map((p, idx) => (
                    <div key={idx} className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-white">{p.name}</span>
                        <div className="text-[11px] text-slate-400">Total Qty: {p.total_qty} units ({p.count} bills)</div>
                      </div>
                      <span className="text-sm font-black text-orange-400 font-mono">
                        ₹{p.total_spend.toFixed(2)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 py-6 text-center">Process bills to view commodity insights.</p>
                )}
              </div>
            </div>

            {/* Top Suppliers */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-400" />
                  <h3 className="text-sm font-bold text-white">Top Suppliers &amp; Vendors</h3>
                </div>
                <span className="text-xs text-slate-400">By Total Procurement</span>
              </div>

              <div className="mt-4 flex flex-col gap-3">
                {biData.top_suppliers.length > 0 ? (
                  biData.top_suppliers.map((v, idx) => (
                    <div key={idx} className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-white">{v.name}</span>
                        <div className="text-[11px] text-slate-400 font-mono">GSTIN: {v.gstin} ({v.invoice_count} bills)</div>
                      </div>
                      <span className="text-sm font-black text-emerald-400 font-mono">
                        ₹{v.total_spend.toFixed(2)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 py-6 text-center">Process bills to view vendor insights.</p>
                )}
              </div>
            </div>
          </div>

          {/* Suspicious Patterns & Risk Detector */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Smart Fraud &amp; Suspicious Pattern Detector</h3>
              </div>
              <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-semibold">
                Risk Guardian
              </span>
            </div>

            <div className="mt-3 flex flex-col gap-2">
              {biData.risk_anomalies.length > 0 ? (
                biData.risk_anomalies.map((risk, idx) => (
                  <div key={idx} className="bg-slate-950 border border-amber-500/30 rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-amber-400">{risk.type}</span>
                      <p className="text-xs text-slate-300 mt-0.5">{risk.message}</p>
                    </div>
                    <span className="text-xs text-red-400 font-mono font-bold">
                      Risk: ₹{risk.risk_amount.toFixed(2)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-xs text-emerald-400 flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  No suspicious vendor spikes or fraudulent duplicate invoices detected.
                </div>
              )}
            </div>
          </div>
        </main>
      )}

      {/* VIEW 3: VYAAPAR CA ASSISTANT (Hindi Financial Guide) */}
      {currentView === "ai_ca" && (
        <main className="flex-1 max-w-4xl w-full mx-auto p-6 flex flex-col gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex-1 flex flex-col min-h-[550px]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Vyaapar CA (AI Assistant)</h3>
                  <p className="text-[11px] text-slate-400">Poochiye koi bhi GST ya bill se juda sawal Hindi/Hinglish me</p>
                </div>
              </div>
              <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded">
                Always Online
              </span>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-3">
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-lg rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                      msg.sender === "user"
                        ? "bg-orange-500 text-slate-950 font-medium"
                        : "bg-slate-950 border border-slate-800 text-slate-200"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {caLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-950 border border-slate-800 text-slate-400 text-xs px-4 py-2.5 rounded-2xl flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" />
                    Vyaapar CA hisaab dekh rahe hain...
                  </div>
                </div>
              )}
            </div>

            {/* Quick Prompts */}
            <div className="pt-3 border-t border-slate-800/80 flex flex-wrap gap-2 mb-3">
              <button
                onClick={() => handleAskCa("Ye active bill kyu flag hua hai?")}
                className="text-[11px] bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                ❓ Ye bill kyu flag hua?
              </button>
              <button
                onClick={() => handleAskCa("ITC kya hota hai aur kab reject hota hai?")}
                className="text-[11px] bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                ❓ ITC kya hota hai?
              </button>
              <button
                onClick={() => handleAskCa("HSN code galat hone se kya nuksan hai?")}
                className="text-[11px] bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                ❓ HSN code galat hone se nuksan?
              </button>
            </div>

            {/* Input Box */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAskCa()}
                placeholder="Aapna sawal likhiye (e.g. ITC reject hone par kya karein?)..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={() => handleAskCa()}
                className="bg-blue-600 hover:bg-blue-500 text-white p-2.5 rounded-xl transition-all cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </main>
      )}

      {/* VIEW 4: WHATSAPP BILLING BOT SIMULATOR */}
      {currentView === "whatsapp" && (
        <main className="flex-1 max-w-xl w-full mx-auto p-6 flex flex-col items-center">
          <div className="w-full bg-[#111b21] border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[640px]">
            {/* WhatsApp Header */}
            <div className="bg-[#202c33] px-4 py-3 flex items-center justify-between text-white border-b border-[#2a3942]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-white shadow">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold flex items-center gap-1.5">
                    Kachha2GST Assistant
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
                  </h4>
                  <p className="text-[10px] text-emerald-400">Online • AI Shopkeeper Bot</p>
                </div>
              </div>
              <span className="text-xs text-slate-400">+91 98765 43210</span>
            </div>

            {/* WhatsApp Chat Body */}
            <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3.5 bg-[#0b141a]">
              {/* Shopkeeper message */}
              <div className="flex justify-end">
                <div className="bg-[#005c4b] text-white rounded-2xl rounded-tr-none px-3.5 py-2.5 text-xs max-w-xs shadow">
                  <div className="bg-[#025142] p-2 rounded-lg mb-1.5 text-slate-200 flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-emerald-300" />
                    <span>sharma_hardware_kachha.jpg</span>
                  </div>
                  <p className="text-[11px]">Bhai ye parchi add kardo hisaab me</p>
                  <span className="text-[9px] text-slate-300 float-right mt-1">10:14 AM ✓✓</span>
                </div>
              </div>

              {/* Bot Response */}
              <div className="flex justify-start">
                <div className="bg-[#202c33] text-slate-100 rounded-2xl rounded-tl-none p-3 text-xs max-w-sm shadow border border-[#2a3942]">
                  <p className="font-bold text-emerald-400 mb-1">✓ Parchi Scan Ho Gayi!</p>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Vendor: <strong>Sharma Ji Loha &amp; Hardware</strong><br />
                    • TATA Sariya 12mm: 10 bdl @ ₹600 = ₹6,000<br />
                    • Binding Taar: 5 kg @ ₹90 = ₹450
                  </p>

                  <div className="mt-2.5 p-2 bg-red-950/40 border border-red-500/40 rounded-lg text-red-300 text-[11px]">
                    ⚠️ <strong>At-Risk ITC Alert: ₹578.00</strong><br />
                    Parchi me taar ₹550 likha hai (Math error) aur GST 12% lagaya hai jabki official slab 18% hai.
                  </div>

                  {/* WhatsApp Interactive Buttons */}
                  <div className="mt-3 flex flex-col gap-1.5">
                    <button
                      onClick={() => {
                        executeFix({
                          type: "FIX_MATH",
                          label: "Auto-Fix",
                          description: "Applied"
                        });
                        setCurrentView("audit");
                      }}
                      className="w-full bg-[#00a884] hover:bg-[#029070] text-slate-950 font-bold text-[11px] py-2 rounded-lg text-center cursor-pointer transition-all shadow"
                    >
                      ⚡ 1-Tap Auto-Fix &amp; File
                    </button>
                    <button
                      onClick={() => setCurrentView("ai_ca")}
                      className="w-full bg-[#2a3942] hover:bg-[#32444f] text-slate-200 font-semibold text-[11px] py-1.5 rounded-lg text-center cursor-pointer transition-all"
                    >
                      💬 Ask CA Assistant
                    </button>
                  </div>
                  <span className="text-[9px] text-slate-400 float-right mt-1.5">10:14 AM</span>
                </div>
              </div>
            </div>

            {/* Bottom Bar */}
            <div className="bg-[#202c33] p-3 border-t border-[#2a3942] flex items-center gap-2 text-xs text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              WhatsApp Webhook Simulation Active
            </div>
          </div>
        </main>
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
                    Microphone allow karein ya in sample Hinglish spoken entries pe click karein:
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

                  <button
                    onClick={() => handleVoiceCommand("Sariya ka tax 18 percent kardo official slab")}
                    className="text-left text-xs bg-slate-950 hover:bg-slate-800 border border-slate-800 p-2.5 rounded-lg text-slate-200 transition-colors cursor-pointer"
                  >
                    🗣️ &quot;Sariya ka tax 18 percent kardo&quot; (Fix command)
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

      {/* HSN Live Search Modal */}
      {showHsnSearch && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Search className="w-4 h-4 text-amber-400" />
                Live HSN Directory Search (14,416 Codes)
              </div>
              <button
                onClick={() => setShowHsnSearch(false)}
                className="text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="my-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="text"
                  value={hsnQuery}
                  onChange={(e) => handleSearchHsn(e.target.value)}
                  placeholder="Search item (e.g. sariya, cement, atta, wire, paint, oil)..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  autoFocus
                />
              </div>

              <div className="mt-3 max-h-64 overflow-y-auto divide-y divide-slate-800/60">
                {hsnResults.length > 0 ? (
                  hsnResults.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleSelectHsn(item)}
                      className="py-2.5 px-3 hover:bg-slate-800/60 rounded-lg cursor-pointer flex items-center justify-between transition-colors"
                    >
                      <div className="max-w-md">
                        <span className="text-xs font-bold text-amber-400 font-mono">
                          HSN {item.hsn}
                        </span>
                        <p className="text-[11px] text-slate-300 truncate">{item.description}</p>
                      </div>
                      <span className="text-xs bg-slate-800 border border-slate-700 text-emerald-400 px-2 py-0.5 rounded font-mono">
                        {item.igst}% GST
                      </span>
                    </div>
                  ))
                ) : hsnQuery.trim() ? (
                  <p className="text-xs text-slate-500 text-center py-6">No matching HSN found.</p>
                ) : (
                  <p className="text-xs text-slate-500 text-center py-6">
                    Type a trade word to search official schedule.
                  </p>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowHsnSearch(false)}
                className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg font-medium cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-3.5 px-6 text-center text-xs text-slate-500 flex flex-wrap items-center justify-between gap-4">
        <span>Kachha2GST • Intelligent Business Assistant for Small Shop Owners (MSME Track 4)</span>
        <span className="text-slate-400">Paper to Business Intelligence • Pure Deterministic Arithmetic</span>
      </footer>
    </div>
  );
}
