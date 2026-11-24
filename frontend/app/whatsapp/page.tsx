"use client";

import React, { useState } from "react";
import { Smartphone, Receipt, CheckCircle2, Wand2, Bot, ArrowRight } from "lucide-react";
import confetti from "canvas-confetti";

export default function WhatsAppPage() {
  const [billFixed, setBillFixed] = useState(false);

  const handleFix = () => {
    setBillFixed(true);
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
  };

  return (
    <div className="flex-1 max-w-xl w-full mx-auto p-4 sm:p-6 flex flex-col items-center">
      <div className="text-center mb-4">
        <div className="inline-flex items-center gap-1.5 text-xs text-green-400 font-bold bg-green-500/10 border border-green-500/30 px-3 py-1 rounded-full mb-1.5">
          <Smartphone className="w-3.5 h-3.5" />
          WhatsApp Bill Upload Simulator
        </div>
        <h1 className="text-xl font-bold text-white">Upload Bills via WhatsApp</h1>
        <p className="text-xs text-slate-400 mt-1 max-w-md">
          Shopkeepers can send receipt photos directly on WhatsApp and receive instant compliance warnings.
        </p>
      </div>

      <div className="w-full bg-[#111b21] border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[600px]">
        {/* WhatsApp Top Header */}
        <div className="bg-[#202c33] px-4 py-3 flex items-center justify-between text-white border-b border-[#2a3942]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-white shadow">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold flex items-center gap-1.5">
                Kachha2GST Bot
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
              </h4>
              <p className="text-[10px] text-emerald-400">Online • AI Shop Assistant</p>
            </div>
          </div>
          <span className="text-xs text-slate-400">+91 98765 43210</span>
        </div>

        {/* WhatsApp Chat Messages */}
        <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3.5 bg-[#0b141a]">
          {/* User sends image */}
          <div className="flex justify-end">
            <div className="bg-[#005c4b] text-white rounded-2xl rounded-tr-none px-3.5 py-2.5 text-xs max-w-xs shadow">
              <div className="bg-[#025142] p-2.5 rounded-lg mb-1.5 text-slate-200 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-300" />
                <span className="font-mono text-[11px]">sharma_ji_kachha_bill.jpg</span>
              </div>
              <p className="text-[11px]">Bhai ye sariya aur taar ka bill add kardo</p>
              <span className="text-[9px] text-slate-300 float-right mt-1">10:14 AM ✓✓</span>
            </div>
          </div>

          {/* Bot reply */}
          <div className="flex justify-start">
            <div className="bg-[#202c33] text-slate-100 rounded-2xl rounded-tl-none p-3.5 text-xs max-w-sm shadow border border-[#2a3942]">
              <p className="font-bold text-emerald-400 mb-1 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Parchi Scan Ho Gayi!
              </p>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Vendor: <strong>Sharma Ji Loha &amp; Hardware</strong><br />
                • TATA Sariya 12mm: 10 bdl @ ₹600 = ₹6,000<br />
                • Binding Taar: 5 kg @ ₹90 = ₹450
              </p>

              {!billFixed ? (
                <>
                  <div className="mt-2.5 p-2.5 bg-red-950/40 border border-red-500/40 rounded-lg text-red-300 text-[11px]">
                    ⚠️ <strong>At-Risk ITC Alert: ₹578.00</strong><br />
                    Parchi me taar ₹550 likha hai (Math error) aur GST 12% lagaya hai (Official slab 18% hai).
                  </div>

                  <div className="mt-3 flex flex-col gap-1.5">
                    <button
                      onClick={handleFix}
                      className="w-full bg-[#00a884] hover:bg-[#029070] text-slate-950 font-bold text-[11px] py-2 rounded-lg text-center cursor-pointer transition-all shadow"
                    >
                      ⚡ 1-Tap Auto-Fix &amp; File
                    </button>
                    <a
                      href="/assistant"
                      className="w-full bg-[#2a3942] hover:bg-[#32444f] text-slate-200 font-semibold text-[11px] py-1.5 rounded-lg text-center cursor-pointer transition-all block"
                    >
                      💬 Ask CA Assistant
                    </a>
                  </div>
                </>
              ) : (
                <div className="mt-2.5 p-2.5 bg-emerald-950/40 border border-emerald-500/40 rounded-lg text-emerald-300 text-[11px]">
                  ✓ <strong>100% CLEAN!</strong> Math aur 18% slab fix ho gaye. GSTR-2B me file kar diya gaya hai (At-Risk ITC: ₹0).
                </div>
              )}

              <span className="text-[9px] text-slate-400 float-right mt-2">10:14 AM</span>
            </div>
          </div>
        </div>

        {/* WhatsApp Bottom Bar */}
        <div className="bg-[#202c33] p-3 border-t border-[#2a3942] flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            WhatsApp Webhook Simulation Active
          </span>
          <span className="text-[10px] text-slate-500">No App Download Needed</span>
        </div>
      </div>
    </div>
  );
}
