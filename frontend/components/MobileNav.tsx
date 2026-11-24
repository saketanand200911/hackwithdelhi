"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Scan, TrendingUp, Bot, Smartphone, FolderCheck } from "lucide-react";

export default function MobileNav() {
  const pathname = usePathname();

  const items = [
    { name: "Scan", href: "/", icon: Scan },
    { name: "BI Health", href: "/dashboard", icon: TrendingUp },
    { name: "AI CA", href: "/assistant", icon: Bot },
    { name: "WhatsApp", href: "/whatsapp", icon: Smartphone },
    { name: "Records", href: "/records", icon: FolderCheck },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-3 py-2 flex items-center justify-around shadow-2xl">
      {items.map((it) => {
        const isActive = pathname === it.href;
        const Icon = it.icon;
        return (
          <Link
            key={it.href}
            href={it.href}
            className={`flex flex-col items-center gap-1 transition-all ${
              isActive ? "text-orange-400 font-bold scale-105" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <div className={`p-1.5 rounded-xl ${isActive ? "bg-orange-500/20" : ""}`}>
              <Icon className="w-4 h-4" />
            </div>
            <span className="text-[10px] tracking-tight">{it.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
