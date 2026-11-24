"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Receipt,
  Scan,
  TrendingUp,
  Bot,
  Smartphone,
  FolderCheck,
  Download,
  Sparkles,
  Menu,
  X
} from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { name: "Scanner", href: "/", icon: Scan },
    { name: "Business BI", href: "/dashboard", icon: TrendingUp },
    { name: "Vyaapar CA", href: "/assistant", icon: Bot },
    { name: "WhatsApp Bot", href: "/whatsapp", icon: Smartphone },
    { name: "Records & CA Queue", href: "/records", icon: FolderCheck },
  ];

  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-50 px-4 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="bg-gradient-to-tr from-orange-500 to-amber-400 p-2 rounded-xl text-slate-950 font-black shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black tracking-tight text-white">
                Kachha<span className="text-orange-400">2</span>GST
              </span>
              <span className="text-[10px] bg-orange-500/10 border border-orange-500/30 text-orange-400 px-2 py-0.2 rounded-full font-semibold">
                MSME Assistant
              </span>
            </div>
            <p className="text-[10px] text-slate-400 hidden sm:block">
              Zero AI Calculations • 100% Deterministic Compliance
            </p>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-950/70 border border-slate-800 rounded-xl p-1">
          {navLinks.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-slate-800 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-orange-400" : "text-slate-400"}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right Action Tools */}
        <div className="flex items-center gap-2">
          <a
            href="http://127.0.0.1:8000/api/export-csv"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-all shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </a>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden pt-3 pb-2 border-t border-slate-800 mt-3 flex flex-col gap-1">
          {navLinks.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold ${
                  isActive
                    ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                    : "text-slate-300 hover:bg-slate-800"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.name}</span>
              </Link>
            );
          })}
          <div className="pt-2 border-t border-slate-800 mt-2 flex justify-between">
            <a
              href="http://127.0.0.1:8000/api/export-csv"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full text-center bg-emerald-600 text-white text-xs font-semibold py-2 rounded-lg"
            >
              Download GSTR-2B CSV
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
