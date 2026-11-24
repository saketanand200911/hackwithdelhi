import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kachha2GST | From Kachha to Pakka. Every Rupee Accounted For.",
  description: "AI reads the Kachha. Python protects the Pakka. Handwritten Receipt-to-Compliance Assistant for Micro-Enterprises",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">
        {children}
      </body>
    </html>
  );
}
