"use client";

import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  Package,
  Users,
  AlertTriangle,
  Download,
  CheckCircle2,
  RefreshCw,
  ArrowUpRight
} from "lucide-react";

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

export default function DashboardPage() {
  const [data, setData] = useState<BusinessIntelligence | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/business-intelligence`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCsv = () => {
    window.open(`${API_BASE}/api/export-csv`, "_blank");
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12">
        <RefreshCw className="w-8 h-8 text-orange-400 animate-spin" />
        <p className="text-xs text-slate-400 mt-3">Computing Business Intelligence &amp; GST Score...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-6">
      {/* Title Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            <h1 className="text-xl sm:text-2xl font-black text-white">Business Health &amp; Intelligence</h1>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time analytics, spending velocity, and gamified GST Readiness Score
          </p>
        </div>

        <button
          onClick={handleDownloadCsv}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-md transition-all cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export GSTR-2B Ready Data</span>
        </button>
      </div>

      {data && (
        <>
          {/* Top Score Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="relative w-24 h-24 rounded-full bg-slate-950 border-4 border-emerald-500 flex flex-col items-center justify-center shadow-lg shadow-emerald-500/20">
                <span className="text-3xl font-black text-white font-mono">{data.gst_readiness.score}</span>
                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">/ 100</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-white">Monthly GST Readiness Score</h2>
                  <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-bold">
                    {data.gst_readiness.status}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1 max-w-lg leading-relaxed">
                  {data.gst_readiness.advice}
                </p>
                <div className="mt-2 text-xs text-slate-400 flex flex-wrap items-center gap-4">
                  <span>Clean Bills: <strong className="text-emerald-400">{data.summary.clean_invoices}</strong></span>
                  <span>Review Needed: <strong className="text-red-400">{data.summary.flagged_invoices}</strong></span>
                  <span>Compliance Rate: <strong className="text-white">{data.gst_readiness.clean_percentage}%</strong></span>
                </div>
              </div>
            </div>
          </div>

          {/* 4 Key Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4.5 shadow-lg">
              <span className="text-xs text-slate-400 font-semibold">Total Purchases Spend (₹)</span>
              <div className="text-2xl font-black text-white mt-1 font-mono">
                ₹{data.summary.total_purchases_spend.toFixed(2)}
              </div>
              <p className="text-[10px] text-slate-500 mt-1">From all recorded parchi slips</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4.5 shadow-lg">
              <span className="text-xs text-slate-400 font-semibold">Total GST Paid (₹)</span>
              <div className="text-2xl font-black text-blue-400 mt-1 font-mono">
                ₹{data.summary.total_gst_paid.toFixed(2)}
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Paid to suppliers</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4.5 shadow-lg">
              <span className="text-xs text-slate-400 font-semibold">Net Eligible ITC (₹)</span>
              <div className="text-2xl font-black text-emerald-400 mt-1 font-mono">
                ₹{data.summary.net_eligible_itc.toFixed(2)}
              </div>
              <p className="text-[10px] text-slate-500 mt-1">100% Verified tax credit</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4.5 shadow-lg">
              <span className="text-xs text-slate-400 font-semibold">At-Risk ITC Shielded (₹)</span>
              <div className="text-2xl font-black text-red-400 mt-1 font-mono">
                ₹{data.summary.total_at_risk_itc.toFixed(2)}
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Penalties prevented</p>
            </div>
          </div>

          {/* Commodities & Suppliers Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Commodities */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-orange-400" />
                  <h3 className="text-sm font-bold text-white">Top Purchased Commodities</h3>
                </div>
                <span className="text-xs text-slate-400">By Value</span>
              </div>

              <div className="mt-4 flex flex-col gap-2.5">
                {data.top_purchased_products.length > 0 ? (
                  data.top_purchased_products.map((p, idx) => (
                    <div key={idx} className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-white">{p.name}</span>
                        <div className="text-[11px] text-slate-400">Qty: {p.total_qty} units ({p.count} bills)</div>
                      </div>
                      <span className="text-sm font-black text-orange-400 font-mono">
                        ₹{p.total_spend.toFixed(2)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 py-8 text-center">Process bills in the Scanner to generate commodity insights.</p>
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
                <span className="text-xs text-slate-400">By Procurement</span>
              </div>

              <div className="mt-4 flex flex-col gap-2.5">
                {data.top_suppliers.length > 0 ? (
                  data.top_suppliers.map((v, idx) => (
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
                  <p className="text-xs text-slate-500 py-8 text-center">Process bills in the Scanner to view supplier breakdown.</p>
                )}
              </div>
            </div>
          </div>

          {/* Risk Guardian */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Smart Fraud &amp; Risk Pattern Detector</h3>
              </div>
              <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-semibold">
                Risk Guardian
              </span>
            </div>

            <div className="mt-3 flex flex-col gap-2">
              {data.risk_anomalies.length > 0 ? (
                data.risk_anomalies.map((risk, idx) => (
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
        </>
      )}
    </div>
  );
}
