"use client";

import React, { useState, useEffect } from "react";
import {
  FileCheck2,
  FileWarning,
  Download,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  FolderCheck,
  Search
} from "lucide-react";

interface BucketData {
  verified_count: number;
  exception_count: number;
  verified: any[];
  exceptions: any[];
}

const API_BASE = "http://127.0.0.1:8000";

export default function RecordsPage() {
  const [activeTab, setActiveTab] = useState<"verified" | "exceptions">("verified");
  const [data, setData] = useState<BucketData>({
    verified_count: 0,
    exception_count: 0,
    verified: [],
    exceptions: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBuckets();
  }, []);

  const fetchBuckets = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/buckets`);
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

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-6">
      {/* Title Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FolderCheck className="w-5 h-5 text-orange-400" />
            <h1 className="text-xl sm:text-2xl font-black text-white">Records &amp; CA Exception Queue</h1>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Two-bucket compliance storage for verified bills and flagged exception queues
          </p>
        </div>

        <button
          onClick={handleDownloadCsv}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-md transition-all cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download GSTR-2B CSV</span>
        </button>
      </div>

      {/* Bucket Tab Switcher */}
      <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl p-1.5 w-fit">
        <button
          onClick={() => setActiveTab("verified")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "verified"
              ? "bg-slate-800 text-white shadow-sm"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <FileCheck2 className="w-4 h-4 text-emerald-400" />
          <span>Verified / Clean Entries</span>
          <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-2 py-0.2 rounded-full font-mono">
            {data.verified_count}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("exceptions")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "exceptions"
              ? "bg-slate-800 text-white shadow-sm"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <FileWarning className="w-4 h-4 text-red-400" />
          <span>CA Exception Queue</span>
          <span className="bg-red-500/20 text-red-400 text-[10px] px-2 py-0.2 rounded-full font-mono">
            {data.exception_count}
          </span>
        </button>
      </div>

      {/* Content */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin text-orange-400" />
            <p className="text-xs mt-3">Loading Records...</p>
          </div>
        ) : activeTab === "verified" ? (
          <div>
            <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between text-xs">
              <span className="font-bold text-white uppercase tracking-wider">
                Clean Bills Ready for Filing ({data.verified_count})
              </span>
              <span className="text-slate-400">Section 16(2) GST Eligible</span>
            </div>

            {data.verified.length === 0 ? (
              <div className="text-center py-16 text-xs text-slate-500">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-slate-600" />
                <p>No verified bills yet. Scan a bill on the Scanner page to add it.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 text-[11px] border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Vendor</th>
                      <th className="py-3 px-3 font-semibold">Invoice #</th>
                      <th className="py-3 px-3 font-semibold">Date</th>
                      <th className="py-3 px-3 font-semibold text-right">Taxable (₹)</th>
                      <th className="py-3 px-3 font-semibold text-right">GST (₹)</th>
                      <th className="py-3 px-3 font-semibold text-right">Grand Total (₹)</th>
                      <th className="py-3 px-4 font-semibold text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-200">
                    {data.verified.map((b, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-bold text-white">
                          {b.invoice_metadata?.vendor_name || "Vendor"}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-400">
                          {b.invoice_metadata?.invoice_number}
                        </td>
                        <td className="py-3 px-3 text-slate-400">
                          {b.invoice_metadata?.invoice_date}
                        </td>
                        <td className="py-3 px-3 text-right font-mono">
                          ₹{b.math_verification?.calculated_taxable?.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-emerald-400 font-semibold">
                          ₹{b.math_verification?.calculated_tax?.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-white">
                          ₹{b.math_verification?.calculated_grand_total?.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded text-[10px] font-bold">
                            100% ELIGIBLE
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between text-xs">
              <span className="font-bold text-white uppercase tracking-wider text-red-400">
                Flagged Exceptions ({data.exception_count})
              </span>
              <span className="text-slate-400">Requires 1-Tap Correction</span>
            </div>

            {data.exceptions.length === 0 ? (
              <div className="text-center py-16 text-xs text-slate-500">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-500" />
                <p>Zero pending exceptions! All recorded bills are verified.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/60">
                {data.exceptions.map((b, idx) => (
                  <div key={idx} className="p-4 flex flex-wrap items-center justify-between gap-4 hover:bg-slate-800/30">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-xs">
                          {b.invoice_metadata?.vendor_name}
                        </span>
                        <span className="text-slate-400 font-mono text-[11px]">
                          #{b.invoice_metadata?.invoice_number}
                        </span>
                      </div>
                      <p className="text-xs text-red-400 mt-1">{b.plain_summary}</p>
                    </div>

                    <div className="text-right">
                      <span className="text-sm font-bold text-red-400 font-mono">
                        ₹{b.at_risk_itc?.toFixed(2)} At-Risk
                      </span>
                      <a
                        href="/"
                        className="block text-xs text-orange-400 hover:text-orange-300 font-semibold mt-1"
                      >
                        Open in Scanner to Fix →
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
