import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import MobileNav from "@/components/MobileNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kachha2GST | Handwritten & Paper Receipt-to-Compliance Assistant",
  description: "Deterministic ITC Shield & Hinglish HSN mapping for Micro-Enterprises (MSME Track 4)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-full flex flex-col bg-slate-950 text-slate-100 font-sans pb-16 md:pb-0`}
      >
        <Navbar />
        <div className="flex-1 flex flex-col">{children}</div>
        <MobileNav />
      </body>
    </html>
  );
}
