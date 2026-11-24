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
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;600;700&family=Noto+Sans+Devanagari:wght@400;500&display=swap"
        />
      </head>
      <body className="min-h-full">
        {children}
      </body>
    </html>
  );
}
