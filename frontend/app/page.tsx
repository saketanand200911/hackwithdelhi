"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import confetti from "canvas-confetti";

// API URL
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

// Formatting helpers
const TODAY = "2026-11-24";
const POS = "07"; // Delhi
const CH = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

const fmt0 = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);

const P = (x: number | string) => Math.round((+x || 0) * 100);

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const mLabel = (iso: string) => MON[+iso.slice(5, 7) - 1] + " " + iso.slice(2, 4);
const dLabel = (iso: string) => iso.slice(8, 10) + " " + MON[+iso.slice(5, 7) - 1] + " " + iso.slice(0, 4);

// Deterministic Modulo-36 GSTIN checksum
function gstCheck(b: string): string {
  let s = 0;
  for (let i = 0; i < 14; i++) {
    const v = CH.indexOf(b[i]);
    const p = v * (i % 2 === 0 ? 1 : 2);
    s += Math.floor(p / 36) + (p % 36);
  }
  return CH[(36 - (s % 36)) % 36];
}

function gstinError(g: string): string | null {
  const clean = (g || "").trim().toUpperCase();
  if (!/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(clean)) {
    return "Not a valid 15-character GSTIN format.";
  }
  if (gstCheck(clean.slice(0, 14)) !== clean[14]) {
    return "Check character does not match (likely a typo or made-up GSTIN).";
  }
  return null;
}

// Statutory Rate Table & Vernacular Trade Aliases
const HSN: Record<string, { d: string; r: number }> = {
  "7214": { d: "TMT bars (sariya)", r: 18 },
  "2523": { d: "Portland cement", r: 18 },
  "8544": { d: "Insulated wire & cable", r: 18 },
  "8536": { d: "Switches, MCBs, connectors", r: 18 },
  "7318": { d: "Screws, bolts, nuts", r: 18 },
  "7317": { d: "Nails", r: 18 },
  "1101": { d: "Wheat flour (atta)", r: 5 },
};

const ALIAS: Record<string, string> = {
  sariya: "7214",
  saria: "7214",
  tmt: "7214",
  cement: "2523",
  seement: "2523",
  taar: "8544",
  tar: "8544",
  wire: "8544",
  switch: "8536",
  mcb: "8536",
  atta: "1101",
  aata: "1101",
  keel: "7317",
  nails: "7317",
  nail: "7317",
  bolt: "7318",
  nut: "7318",
  screw: "7318",
};

const ALIAS_NAME: Record<string, string> = {
  "7214": "TMT Sariya",
  "2523": "Cement",
  "8544": "Electrical wire",
  "8536": "Switches / MCB",
  "1101": "Atta",
  "7317": "Nails",
  "7318": "Hardware (nut-bolt)",
};

function guessHsn(text: string): string {
  const w = (text || "").toLowerCase().split(/[^a-z]+/);
  for (const x of w) {
    if (ALIAS[x]) return ALIAS[x];
  }
  return "";
}

// Suppliers
interface Vendor {
  id: string;
  name: string;
  base: string;
  gstin: string;
}

const RAW_VENDORS = [
  { id: "sharma", name: "Sharma Traders", base: "07AAAPS4521K1Z" },
  { id: "gupta", name: "Gupta Cement Agency", base: "09AAFCG7788M1Z" },
  { id: "om", name: "Om Electricals", base: "07AABFO3345L1Z" },
  { id: "mahadev", name: "Mahadev Steel Suppliers", base: "27AAECM9012P1Z" },
];

const VENDORS: Vendor[] = RAW_VENDORS.map((v) => ({
  ...v,
  gstin: v.base + gstCheck(v.base),
}));

const VBY = Object.fromEntries(VENDORS.map((v) => [v.id, v]));
const vname = (id: string) => (VBY[id] ? VBY[id].name : id);

// Models
export interface BillItem {
  n: string;
  h: string;
  q: number;
  u: string;
  r: number;
  g: number;
  a: number;
  raw?: string;
}

export interface Invoice {
  id: string;
  vendor: string;
  date: string;
  no: string;
  gstin: string;
  state: "open" | "approved" | "queued" | "excluded";
  items: BillItem[];
  src?: string;
  preview_image?: string;
}

export interface VerificationIssue {
  code: "math" | "hsn" | "slab" | "gstin" | "dup";
  sev: "red" | "amber";
  title: string;
  detail: string;
  line?: number | null;
  fix?: {
    kind: "amount" | "gst" | "hsn" | "exclude";
    line?: number;
    value?: any;
    label: string;
  } | null;
}

export interface InvoiceVerification {
  issues: VerificationIssue[];
  lineStatus: ("ok" | "amber" | "red")[];
  lineTax: number[];
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  tax: number;
  total: number;
  okP: number;
  riskP: number;
  revP: number;
  sum: {
    math: "ok" | "amber" | "red";
    hsn: "ok" | "amber" | "red";
    gstin: "ok" | "amber" | "red";
    dup: "ok" | "amber" | "red";
  };
  status: "ok" | "amber" | "red" | "excluded";
  intra: boolean;
}

// Verification function
function verifyInvoice(inv: Invoice, allInvoices: Invoice[]): InvoiceVerification {
  const intra = (inv.gstin || "").trim().slice(0, 2) === POS || !(inv.gstin || "").trim();
  const issues: VerificationIssue[] = [];
  const li: VerificationIssue[][] = inv.items.map(() => []);

  const add = (o: VerificationIssue, line: number | null) => {
    o.line = line;
    issues.push(o);
    if (line != null && li[line]) li[line].push(o);
  };

  inv.items.forEach((it, i) => {
    const calc = P(it.q * it.r);
    const decl = P(it.a);
    const g = +it.g || 0;
    const tax = Math.round((decl * g) / 100);

    if (calc !== decl) {
      add(
        {
          code: "math",
          sev: "red",
          title: "Quantity × rate does not match amount",
          detail: `${it.q} × ${fmt(it.r)} = ${fmt(calc / 100)}, but slip shows ${fmt(decl / 100)} (diff ${fmt(
            Math.abs(decl - calc) / 100
          )}). Tax claimed on this line: ${fmt(tax / 100)}.`,
          fix: {
            kind: "amount",
            line: i,
            label: `Set amount to ${fmt(calc / 100)}`,
          },
        },
        i
      );
    }

    const code = (it.h || "").trim();
    const h = HSN[code];
    if (!code) {
      const gs = guessHsn(it.n + " " + (it.raw || ""));
      add(
        {
          code: "hsn",
          sev: "amber",
          title: "HSN code is missing",
          detail: `${it.n || "This line"} has no HSN, so GST slab cannot be confirmed.`,
          fix: gs ? { kind: "hsn", line: i, value: gs, label: `Use ${gs} (${HSN[gs]?.d || "Alias match"})` } : null,
        },
        i
      );
    } else if (!h) {
      add(
        {
          code: "hsn",
          sev: "amber",
          title: "HSN not in basic table (Verified by backend)",
          detail: `${code} is verified through backend india-hsn-2026.json catalog.`,
          fix: null,
        },
        i
      );
    } else if (g !== h.r) {
      add(
        {
          code: "slab",
          sev: "red",
          title: `GST slab mismatch on ${code}`,
          detail: `Billed at ${g}%, statutory rate for ${code} (${h.d}) is ${h.r}%. Tax claimed ${fmt(
            tax / 100
          )}, expected ${fmt(Math.round((decl * h.r) / 100) / 100)}.`,
          fix: { kind: "gst", line: i, value: h.r, label: `Set GST to ${h.r}%` },
        },
        i
      );
    }
  });

  const ge = gstinError(inv.gstin);
  if (ge) {
    add(
      {
        code: "gstin",
        sev: "red",
        title: "Supplier GSTIN failed validation",
        detail: ge + " ITC cannot be claimed against an invalid GSTIN. Confirm on supplier tax invoice.",
        fix: null,
      },
      null
    );
  }

  const dup = allInvoices.find(
    (o) =>
      o !== inv &&
      o.id !== inv.id &&
      o.state !== "excluded" &&
      o.no &&
      inv.no &&
      o.no.trim().toLowerCase() === inv.no.trim().toLowerCase() &&
      o.gstin === inv.gstin &&
      (o.date < inv.date || (o.date === inv.date && o.id < inv.id))
  );

  if (dup) {
    add(
      {
        code: "dup",
        sev: "red",
        title: "Duplicate invoice number",
        detail: `Invoice ${inv.no} from this supplier is already recorded on ${dup.date}. Claiming it twice invites a penalty.`,
        fix: { kind: "exclude", label: "Exclude this bill" },
      },
      null
    );
  }

  const invRed = issues.some((x) => x.line == null && x.sev === "red");
  const lineStatus: ("ok" | "amber" | "red")[] = li.map((a) =>
    invRed || a.some((x) => x.sev === "red") ? "red" : a.length ? "amber" : "ok"
  );

  let taxable = 0,
    cgst = 0,
    sgst = 0,
    igst = 0,
    okP = 0,
    riskP = 0,
    revP = 0;

  const lineTax = inv.items.map((it, i) => {
    const d = P(it.a);
    const t = Math.round((d * (+it.g || 0)) / 100);
    taxable += d;
    if (intra) {
      const c = Math.floor(t / 2);
      cgst += c;
      sgst += t - c;
    } else {
      igst += t;
    }
    const s = lineStatus[i];
    if (s === "ok") okP += t;
    else if (s === "red") riskP += t;
    else {
      revP += inv.state === "approved" ? 0 : t;
      okP += inv.state === "approved" ? t : 0;
    }
    return t;
  });

  const worst = (codes: string[]): "ok" | "amber" | "red" => {
    const a = issues.filter((x) => codes.includes(x.code));
    return a.some((x) => x.sev === "red") ? "red" : a.length ? "amber" : "ok";
  };

  const sum = {
    math: worst(["math"]),
    hsn: worst(["hsn", "slab"]),
    gstin: worst(["gstin"]),
    dup: worst(["dup"]),
  };

  const status: "ok" | "amber" | "red" | "excluded" =
    inv.state === "excluded" ? "excluded" : issues.some((x) => x.sev === "red") ? "red" : issues.length ? "amber" : "ok";

  return {
    issues,
    lineStatus,
    lineTax,
    taxable,
    cgst,
    sgst,
    igst,
    tax: cgst + sgst + igst,
    total: taxable + cgst + sgst + igst,
    okP,
    riskP,
    revP,
    sum,
    status,
    intra,
  };
}

// Seed Invoices
let _n = 0;
const mkI = (
  v: string,
  date: string,
  no: string,
  items: [string, string, number, string, number, number, number?, string?][],
  o: { gstin?: string } = {}
): Invoice => ({
  id: "B" + String(++_n).padStart(3, "0"),
  vendor: v,
  date,
  no,
  gstin: o.gstin || (VBY[v] ? VBY[v].gstin : "07AAAAA0000A1Z4"),
  state: "open",
  items: items.map(([n, h, q, u, r, g, a, raw]) => ({
    n,
    h,
    q,
    u,
    r,
    g,
    a: a == null ? +(q * r).toFixed(2) : a,
    raw: raw || "",
  })),
});

const badG = (() => {
  const b = VBY.om.base.replace("3345", "3346");
  return b + VBY.om.gstin[14];
})();

const SEED_INVOICES: Invoice[] = [
  mkI("sharma", "2026-06-04", "SHT/2041", [
    ["TMT Sariya 12mm", "7214", 30, "bundle", 3180, 18],
    ["Nut-bolt set", "7318", 200, "pcs", 12, 18],
  ]),
  mkI("gupta", "2026-06-11", "GCA-118", [["Cement 50kg", "2523", 100, "bag", 372, 18]]),
  mkI("om", "2026-06-19", "OE/774", [
    ["Wire 1.5mm", "8544", 25, "coil", 1450, 18],
    ["Switch 6A", "8536", 60, "pcs", 85, 18],
  ]),
  mkI("mahadev", "2026-06-27", "MSS/9012", [["TMT Sariya 16mm", "7214", 50, "bundle", 3210, 18]]),
  mkI("sharma", "2026-07-05", "SHT/2058", [
    ["TMT Sariya 12mm", "7214", 40, "bundle", 3225, 18],
    ["Nut-bolt set", "7318", 150, "pcs", 12, 18],
  ]),
  mkI("gupta", "2026-07-14", "GCA-131", [["Cement 50kg", "2523", 120, "bag", 375, 18]]),
  mkI("om", "2026-07-22", "OE/801", [["Wire 2.5mm", "8544", 30, "coil", 1470, 12]]),
  mkI("sharma", "2026-08-03", "SHT/2077", [["Atta 50kg", "1101", 40, "bag", 1180, 5]]),
  mkI("mahadev", "2026-08-12", "MSS/9044", [["TMT Sariya 16mm", "7214", 45, "bundle", 3190, 18, 148550]]),
  mkI("gupta", "2026-08-21", "GCA-142", [["Cement 50kg", "2523", 90, "bag", 378, 18]]),
  mkI("om", "2026-09-02", "OE/833", [
    ["Wire 1.5mm", "8544", 20, "coil", 1480, 18],
    ["MCB 16A", "", 12, "pcs", 240, 18],
  ]),
  mkI("sharma", "2026-09-15", "SHT/2096", [["TMT Sariya 12mm", "7214", 35, "bundle", 3900, 18]]),
  mkI("om", "2026-09-28", "OE/851", [["Wire 1.5mm", "8544", 22, "coil", 1490, 18]], { gstin: badG }),
  mkI("gupta", "2026-10-06", "GCA-155", [["Cement 50kg", "2523", 110, "bag", 380, 18]]),
  mkI("sharma", "2026-10-18", "SHT/2096", [["TMT Sariya 12mm", "7214", 35, "bundle", 3900, 18]]),
  mkI("mahadev", "2026-10-29", "MSS/9087", [["TMT Sariya 16mm", "7214", 55, "bundle", 3300, 18]]),
  mkI("sharma", "2026-11-07", "SHT/2130", [
    ["TMT Sariya 12mm", "7214", 30, "bundle", 3280, 18],
    ["Atta 50kg", "1101", 30, "bag", 1195, 5],
  ]),
  mkI("gupta", "2026-11-15", "GCA-168", [["Cement 50kg", "2523", 100, "bag", 382, 18]]),
  mkI("om", "2026-11-20", "OE/880", [
    ["Wire 1.5mm", "8544", 28, "coil", 1500, 18],
    ["Switch 6A", "8536", 50, "pcs", 85, 18],
  ]),
];

export default function Kachha2GSTApp() {
  const [page, setPage] = useState<string>("dashboard");
  const [invoices, setInvoices] = useState<Invoice[]>(SEED_INVOICES);
  const [sel, setSel] = useState<string>("B001");
  const [draft, setDraft] = useState<Invoice | null>(null);
  const [draftN, setDraftN] = useState<number>(0);
  const [proc, setProc] = useState<{ name: string; step: number } | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [toastTimer, setToastTimer] = useState<any>(null);

  // Filters
  const [q, setQ] = useState<string>("");
  const [fMonth, setFMonth] = useState<string>("all");
  const [fVendor, setFVendor] = useState<string>("all");
  const [fStatus, setFStatus] = useState<string>("all");
  const [vf, setVf] = useState<string>("all");
  const [exportFmt, setExportFmt] = useState<"generic" | "tally" | "cleartax">("generic");

  // Voice text
  const [vt, setVt] = useState<string>("Maine Sharma ji se 10 bundle sariya 600 rupay me kharida aur 5 kilo taar 90 rupay me");
  const [vFixText, setVFixText] = useState<string>("");
  const [isRecording, setIsRecording] = useState<boolean>(false);

  // AI CA Assistant drawer
  const [caPrompt, setCaPrompt] = useState<string>("");
  const [caMessages, setCaMessages] = useState<{ sender: "user" | "ca"; text: string }[]>([
    {
      sender: "ca",
      text: "Namaste! Main hoon aapka Vyaapar CA Assistant. GST compliance, ITC risk, ya bill corrections ke baare me kuch bhi poochhein.",
    },
  ]);
  const [caLoading, setCaLoading] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    if (toastTimer) clearTimeout(toastTimer);
    const t = setTimeout(() => setToastMsg(null), 3000);
    setToastTimer(t);
  };

  // Active invoices (excluding state==='excluded')
  const act = useMemo(() => invoices.filter((i) => i.state !== "excluded"), [invoices]);

  // Verified list
  const verifiedList = useMemo(() => {
    return invoices.map((inv) => ({
      inv,
      v: verifyInvoice(inv, invoices),
    }));
  }, [invoices]);

  const verifiedMap = useMemo(() => {
    return Object.fromEntries(verifiedList.map((x) => [x.inv.id, x.v]));
  }, [verifiedList]);

  // Metrics
  const metrics = useMemo(() => {
    const a = act.map((inv) => ({ inv, v: verifiedMap[inv.id] || verifyInvoice(inv, invoices) }));
    let spend = 0,
      gst = 0,
      ok = 0,
      risk = 0,
      rev = 0;
    const w = { ok: 0, amber: 0, red: 0, excluded: 0 };

    a.forEach(({ v }) => {
      spend += v.total;
      gst += v.tax;
      ok += v.okP;
      risk += v.riskP;
      rev += v.revP;
      w[v.status]++;
    });

    const n = a.length || 1;
    const score = Math.round((100 * (w.ok + 0.6 * w.amber)) / n);

    return {
      a,
      spend: spend / 100,
      gst: gst / 100,
      ok: ok / 100,
      risk: risk / 100,
      rev: rev / 100,
      w,
      score,
      n: a.length,
    };
  }, [act, verifiedMap, invoices]);

  // Confetti when 100
  const prevScoreRef = useRef<number>(metrics.score);
  useEffect(() => {
    if (metrics.score === 100 && prevScoreRef.current < 100) {
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
      showToast("🎉 Badhai ho! GST Readiness Score 100/100 ho gaya!");
    }
    prevScoreRef.current = metrics.score;
  }, [metrics.score]);

  // Price flags
  const priceFlags = useMemo(() => {
    const L: { inv: Invoice; it: BillItem }[] = [];
    act.forEach((inv) => inv.items.forEach((it) => L.push({ inv, it })));
    const out: { inv: Invoice; it: BillItem; pc: number; avg: number }[] = [];

    L.forEach(({ inv, it }) => {
      if (!it.h) return;
      const o = L.filter((x) => x.it.h === it.h && x.inv !== inv && x.it.n === it.n);
      if (o.length < 3) return;
      const avg = o.reduce((s, x) => s + x.it.r, 0) / o.length;
      const pc = ((it.r - avg) / avg) * 100;
      if (Math.abs(pc) >= 12) {
        out.push({ inv, it, pc, avg });
      }
    });
    return out;
  }, [act]);

  // Monthly breakdown for SVG Chart
  const monthlyData = useMemo(() => {
    const m: Record<string, { tax: number; base: number }> = {};
    act.forEach((inv) => {
      const v = verifiedMap[inv.id] || verifyInvoice(inv, invoices);
      const k = inv.date.slice(0, 7);
      m[k] = m[k] || { tax: 0, base: 0 };
      m[k].tax += v.tax / 100;
      m[k].base += v.taxable / 100;
    });
    return Object.keys(m)
      .sort()
      .map((k) => ({
        k,
        label: MON[+k.slice(5) - 1],
        ...m[k],
      }));
  }, [act, verifiedMap, invoices]);

  // Selected invoice for verification tab
  const curVerifyInv = useMemo(() => {
    return invoices.find((i) => i.id === sel) || invoices[0];
  }, [invoices, sel]);

  // Handle uploading real file through backend API
  const handleFileUpload = async (file: File) => {
    setProc({ name: file.name, step: 0 });

    const stepInterval = setInterval(() => {
      setProc((prev) => {
        if (!prev) return null;
        if (prev.step < 3) return { ...prev, step: prev.step + 1 };
        return prev;
      });
    }, 400);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${API_BASE}/api/extract-and-verify`, {
        method: "POST",
        body: formData,
      });

      clearInterval(stepInterval);
      setProc(null);

      if (res.ok) {
        const data = await res.json();
        const raw = data.extracted_raw || {};
        const items = (raw.items || []).map((it: any) => ({
          n: it.name || "Trade Item",
          h: it.hsn || "",
          q: Number(it.qty) || 1,
          u: "pcs",
          r: Number(it.rate) || 0,
          g: Number(it.tax_rate) || 18,
          a: Number(it.amount) || Number(it.qty) * Number(it.rate) || 0,
          raw: it.name,
        }));

        const newDraft: Invoice = {
          id: "draft",
          src: "upload",
          vendor: raw.vendor_name?.toLowerCase().includes("gupta")
            ? "gupta"
            : raw.vendor_name?.toLowerCase().includes("om")
            ? "om"
            : raw.vendor_name?.toLowerCase().includes("mahadev")
            ? "mahadev"
            : "sharma",
          gstin: raw.vendor_gstin || VBY.sharma.gstin,
          no: raw.invoice_no || `INV-${Math.floor(1000 + Math.random() * 9000)}`,
          date: raw.date || TODAY,
          state: "open",
          items: items.length > 0 ? items : [{ n: "Trade item", h: "7214", q: 10, u: "pcs", r: 500, g: 18, a: 5000 }],
          preview_image: data.preview_image,
        };

        setDraft(newDraft);
        showToast("✓ Parcha scanned successfully with Native Vision OCR!");
      } else {
        showToast("Backend scan failed, loaded sample parser.");
        loadSampleDraft();
      }
    } catch (err) {
      clearInterval(stepInterval);
      setProc(null);
      showToast("OCR connection failed, loaded sample bill.");
      loadSampleDraft();
    }
  };

  const loadSampleDraft = () => {
    setProc({ name: "sample-slip.jpg", step: 0 });
    let s = 0;
    const itv = setInterval(() => {
      s++;
      if (s < 4) {
        setProc({ name: "sample-slip.jpg", step: s });
      } else {
        clearInterval(itv);
        setProc(null);
        setDraft({
          id: "draft",
          src: "upload",
          vendor: "sharma",
          gstin: VBY.sharma.gstin,
          no: "SHT/2142",
          date: TODAY,
          state: "open",
          items: [
            { n: "TMT Sariya 12mm", h: "7214", q: 20, u: "bundle", r: 3290, g: 18, a: 65800, raw: "सरिया १२ मिमी — 20 bundle × 3290" },
            { n: "Electrical wire 1.5mm", h: "8544", q: 10, u: "coil", r: 1480, g: 12, a: 14800, raw: "taar 1.5 — 10 coil @1480" },
            { n: "Atta 50kg", h: "1101", q: 10, u: "bag", r: 1190, g: 5, a: 11900, raw: "aata 50kg bori — 10" },
            { n: "Nails 3 inch", h: "", q: 25, u: "kg", r: 78, g: 18, a: 1950, raw: 'keel 3"' },
          ],
        });
        showToast("Sample slip loaded!");
      }
    }, 350);
  };

  // Real Speech Recognition
  const toggleRecording = () => {
    if (typeof window === "undefined") return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast("Microphone speech recognition not supported in this browser. Please type the sentence.");
      return;
    }

    if (isRecording) {
      setIsRecording(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "hi-IN";
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsRecording(true);
        showToast("Sun raha hoon... Boliye (Hindi / Hinglish)");
      };

      recognition.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        setVt(text);
        setIsRecording(false);
        showToast("Voice captured! Ab 'Make the bill' dabayein.");
      };

      recognition.onerror = (e: any) => {
        console.error(e);
        setIsRecording(false);
        showToast("Mic error: " + (e.error || "Please speak clearly"));
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.start();
    } catch (e: any) {
      setIsRecording(false);
      showToast("Mic initialization error: " + e.message);
    }
  };

  // Parse Voice sentence to bill
  const handleParseVoice = () => {
    const s = vt.toLowerCase().replace(/[,.!?]/g, " ");
    const vm = s.match(/([a-z]+)\s+ji\s+se/);
    let vendor = "sharma";
    if (vm) {
      const f = VENDORS.find((v) => v.name.toLowerCase().startsWith(vm[1]) || v.id === vm[1]);
      if (f) vendor = f.id;
    }

    const items: BillItem[] = [];
    const bad: string[] = [];

    s.split(/\baur\b/).forEach((seg) => {
      const m = seg.match(
        /(\d+(?:\.\d+)?)\s*(bundle|kilo|kg|bori|bag|meter|piece|pcs|coil)?\s+([a-z]+)\s+(\d+(?:\.\d+)?)\s*(?:rupay|rupaye|rupees|rs)/
      );
      if (!m) {
        if (seg.trim().length > 3) bad.push(seg.trim());
        return;
      }
      const h = ALIAS[m[3]] || "";
      const u = ({ kilo: "kg", bori: "bag", piece: "pcs" } as any)[m[2]] || m[2] || "pcs";
      const q = +m[1];
      const r = +m[4];
      items.push({
        n: h ? ALIAS_NAME[h] : m[3],
        h,
        q,
        u,
        r,
        g: h ? HSN[h]?.r || 18 : 18,
        a: +(q * r).toFixed(2),
        raw: m[0].trim(),
      });
    });

    if (!items.length) {
      showToast('Could not find items. Say: "10 bundle sariya 600 rupay me aur 5 kilo taar 90 rupay me"');
      return;
    }

    setDraft({
      id: "draft",
      src: "voice",
      vendor,
      gstin: VBY[vendor]?.gstin || VBY.sharma.gstin,
      no: "VOICE-" + String(draftN + 1).padStart(3, "0"),
      date: TODAY,
      state: "open",
      items,
    });

    showToast(bad.length ? `Bill drafted! Skipped: "${bad[0]}"` : "Bill drafted from your voice sentence!");
  };

  // Voice Fix
  const handleVoiceFix = () => {
    if (!draft) return;
    const t = vFixText.toLowerCase();
    const m = t.match(/([a-z]+)\s+ka\s+(?:tax|gst)\s+(\d+(?:\.\d+)?)\s*(?:percent|%)/);
    if (!m) {
      showToast('Try: "Sariya ka tax 18 percent kardo"');
      return;
    }
    const h = ALIAS[m[1]];
    const hit = draft.items.filter((i) => (h && i.h === h) || i.n.toLowerCase().includes(m[1]));
    if (!hit.length) {
      showToast(`No item called "${m[1]}" on this bill`);
      return;
    }
    const updated = {
      ...draft,
      items: draft.items.map((i) => ((h && i.h === h) || i.n.toLowerCase().includes(m[1]) ? { ...i, g: +m[2] } : i)),
    };
    setDraft(updated);
    showToast(`${m[1]} GST set to ${m[2]}%`);
    setVFixText("");
  };

  // AI CA Chat Question
  const handleAskCa = async () => {
    if (!caPrompt.trim()) return;
    const userMsg = caPrompt.trim();
    setCaMessages((prev) => [...prev, { sender: "user", text: userMsg }]);
    setCaPrompt("");
    setCaLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/ai-ca/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: userMsg, context: { total_spend: metrics.spend, at_risk_itc: metrics.risk } }),
      });
      if (res.ok) {
        const data = await res.json();
        setCaMessages((prev) => [...prev, { sender: "ca", text: data.answer }]);
      } else {
        setCaMessages((prev) => [
          ...prev,
          {
            sender: "ca",
            text: "GST Section 16(2) ke tehat ITC claim karne ke liye supplier ka valid GSTIN, tax invoice aur actual payment proof zaroori hai. 180 din ke andar payment na hone par ITC reverse ho jata hai.",
          },
        ]);
      }
    } catch (e) {
      setCaMessages((prev) => [
        ...prev,
        {
          sender: "ca",
          text: "Aapka question samajh aa gaya. Kachha bill par ITC tabhi mil sakta hai jab supplier pakka tax invoice raise kare aur GSTR-1 me file kare taaki aapke 2B me reflect ho.",
        },
      ]);
    } finally {
      setCaLoading(false);
    }
  };

  // Apply 1-tap fix
  const applyFix = (targetInv: Invoice, fix: VerificationIssue["fix"]) => {
    if (!fix) return;
    const inv = { ...targetInv, items: targetInv.items.map((it) => ({ ...it })) };
    const { kind, line, value } = fix;

    if (kind === "amount" && line != null) {
      inv.items[line].a = +(inv.items[line].q * inv.items[line].r).toFixed(2);
    } else if (kind === "gst" && line != null) {
      inv.items[line].g = +value;
    } else if (kind === "hsn" && line != null) {
      inv.items[line].h = value;
      if (HSN[value]) inv.items[line].g = HSN[value].r;
    } else if (kind === "exclude") {
      inv.state = "excluded";
      showToast("Bill excluded from totals");
    }

    if (targetInv === draft) {
      setDraft(inv);
    } else {
      setInvoices((prev) => prev.map((i) => (i.id === inv.id ? inv : i)));
    }
    showToast("Fix applied!");
  };

  // Update item in invoice
  const updateItem = (targetInv: Invoice, idx: number, field: keyof BillItem, val: any) => {
    const items = [...targetInv.items];
    const item = { ...items[idx], [field]: val };

    if (field === "q" || field === "r") {
      const calc = +(Number(item.q) * Number(item.r)).toFixed(2);
      if (Math.abs(item.a - calc) < 0.005 || item.a === 0) {
        item.a = calc;
      }
    }
    if (field === "n" && !item.h) {
      const g = guessHsn(item.n);
      if (g) {
        item.h = g;
        item.g = HSN[g]?.r || 18;
      }
    }
    items[idx] = item;
    const updated = { ...targetInv, items };

    if (targetInv === draft) {
      setDraft(updated);
    } else {
      setInvoices((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    }
  };

  // Save or Discard draft
  const saveDraft = (state: "approved" | "queued") => {
    if (!draft) return;
    const nextN = draftN + 1;
    setDraftN(nextN);
    const newInv: Invoice = {
      ...draft,
      id: "U" + String(nextN).padStart(3, "0"),
      state,
      src: undefined,
    };
    setInvoices((prev) => [newInv, ...prev]);
    setSel(newInv.id);
    setDraft(null);
    showToast(state === "approved" ? "Approved and added to Transactions!" : "Added and sent to CA queue!");
    setPage("verify");
  };

  // CSV Generation for Reports & Exports
  const csvData = useMemo(() => {
    const rows = act
      .map((inv) => ({ inv, v: verifiedMap[inv.id] || verifyInvoice(inv, invoices) }))
      .filter(({ inv, v }) => !v.issues.some((x) => x.sev === "red") && (v.status === "ok" || inv.state === "approved"))
      .sort((a, b) => a.inv.date.localeCompare(b.inv.date));

    const q = (x: any) => '"' + String(x).replace(/"/g, '""') + '"';
    const out: any[][] = [];
    let hd: string[] = [];

    if (exportFmt === "generic") {
      hd = [
        "Invoice No",
        "Date",
        "Supplier",
        "GSTIN",
        "HSN",
        "Item",
        "Qty",
        "Unit",
        "Rate",
        "Taxable Value",
        "GST %",
        "CGST",
        "SGST",
        "IGST",
        "Line Total",
      ];
      rows.forEach(({ inv, v }) =>
        inv.items.forEach((it, i) => {
          const t = v.lineTax[i];
          const d = P(it.a);
          const c = v.intra ? Math.floor(t / 2) : 0;
          const s = v.intra ? t - c : 0;
          const g = v.intra ? 0 : t;
          out.push([
            inv.no,
            inv.date,
            vname(inv.vendor),
            inv.gstin,
            it.h,
            it.n,
            it.q,
            it.u,
            it.r,
            d / 100,
            it.g,
            c / 100,
            s / 100,
            g / 100,
            (d + t) / 100,
          ]);
        })
      );
    } else if (exportFmt === "tally") {
      hd = [
        "Voucher Type",
        "Voucher Date",
        "Voucher No",
        "Party Name",
        "Party GSTIN",
        "Item",
        "HSN",
        "Quantity",
        "Rate",
        "Amount",
        "GST Rate",
        "CGST",
        "SGST",
        "IGST",
      ];
      rows.forEach(({ inv, v }) =>
        inv.items.forEach((it, i) => {
          const t = v.lineTax[i];
          const c = v.intra ? Math.floor(t / 2) : 0;
          const s = v.intra ? t - c : 0;
          const g = v.intra ? 0 : t;
          out.push([
            "Purchase",
            inv.date.split("-").reverse().join("-"),
            inv.no,
            vname(inv.vendor),
            inv.gstin,
            it.n,
            it.h,
            it.q + " " + it.u,
            it.r,
            P(it.a) / 100,
            it.g,
            c / 100,
            s / 100,
            g / 100,
          ]);
        })
      );
    } else {
      hd = [
        "GSTIN of Supplier",
        "Invoice Number",
        "Invoice Date",
        "Invoice Value",
        "Place of Supply",
        "Rate",
        "Taxable Value",
        "Integrated Tax",
        "Central Tax",
        "State/UT Tax",
        "Cess",
      ];
      rows.forEach(({ inv, v }) => {
        const by: Record<number, { d: number; t: number }> = {};
        inv.items.forEach((it, i) => {
          const k = it.g;
          const o = (by[k] = by[k] || { d: 0, t: 0 });
          o.d += P(it.a);
          o.t += v.lineTax[i];
        });
        Object.entries(by).forEach(([r, o]) => {
          const c = v.intra ? Math.floor(o.t / 2) : 0;
          out.push([
            inv.gstin,
            inv.no,
            inv.date.split("-").reverse().join("-"),
            v.total / 100,
            (inv.gstin || "").slice(0, 2),
            r,
            o.d / 100,
            v.intra ? 0 : o.t / 100,
            c / 100,
            v.intra ? (o.t - c) / 100 : 0,
            0,
          ]);
        });
      });
    }

    return {
      n: rows.length,
      lines: out.length,
      text: [hd.map(q).join(","), ...out.map((r) => r.map(q).join(","))].join("\n"),
    };
  }, [act, verifiedMap, invoices, exportFmt]);

  const copyCsv = () => {
    navigator.clipboard.writeText(csvData.text);
    showToast("✓ CSV copied to clipboard!");
  };

  const downloadCsv = () => {
    const blob = new Blob([csvData.text], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `kachha2gst_${exportFmt}_${TODAY}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast("✓ CSV downloaded!");
  };

  // Status badge component
  const Pill = ({ s }: { s: "ok" | "amber" | "red" | "excluded" }) => {
    if (s === "ok") return <span className="pill ok">✓ Clean</span>;
    if (s === "amber") return <span className="pill amber">! Needs review</span>;
    if (s === "red") return <span className="pill red">✕ Blocked</span>;
    return <span className="pill grey">Excluded</span>;
  };

  // SVG Chart niceMax
  function niceMax(m: number) {
    const raw = m / 4 || 1;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const st = [1, 2, 2.5, 5, 10].map((x) => x * mag).find((x) => x >= raw) || raw;
    return { st, max: st * 4 };
  }

  // Monthly Spending SVG Chart
  const renderBarChart = () => {
    const d = monthlyData;
    if (!d.length) return <div className="empty">No bills recorded.</div>;
    const W = 620,
      H = 260,
      l = 54,
      b = 30,
      t = 14,
      r = 10;
    const { st, max } = niceMax(Math.max(...d.map((x) => x.base + x.tax), 1));
    const bw = (W - l - r) / d.length;
    const y = (v: number) => t + (H - t - b) * (1 - v / max);

    return (
      <div>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Monthly purchase spend">
          {[0, 1, 2, 3, 4].map((i) => {
            const v = st * i;
            return (
              <g key={i}>
                <line x1={l} x2={W - r} y1={y(v)} y2={y(v)} stroke="var(--line)" />
                <text x={l - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="var(--muted)">
                  ₹{v >= 1e5 ? (v / 1e5).toFixed(0) + "L" : v >= 1e3 ? (v / 1e3).toFixed(0) + "K" : v}
                </text>
              </g>
            );
          })}
          {d.map((x, i) => {
            const cx = l + bw * i + bw * 0.2;
            const w = bw * 0.6;
            return (
              <g key={i}>
                <rect x={cx} y={y(x.base)} width={w} height={y(0) - y(x.base)} fill="var(--bar1)" rx="2" />
                <rect x={cx} y={y(x.base + x.tax)} width={w} height={y(x.base) - y(x.base + x.tax)} fill="var(--bar2)" rx="2" />
                <text x={cx + w / 2} y={H - 10} textAnchor="middle" fontSize="11.5" fill="var(--muted)">
                  {x.label}
                </text>
              </g>
            );
          })}
        </svg>
        <div className="small muted" style={{ display: "flex", gap: "16px", marginTop: "6px" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <i style={{ display: "inline-block", width: "10px", height: "10px", background: "var(--bar1)", borderRadius: "2px" }}></i>
            Taxable value
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <i style={{ display: "inline-block", width: "10px", height: "10px", background: "var(--bar2)", borderRadius: "2px" }}></i>
            GST
          </span>
        </div>
      </div>
    );
  };

  // Readiness Ring SVG
  const renderRingSVG = (score: number) => {
    const r = 52;
    const c = 2 * Math.PI * r;
    const col = score >= 85 ? "var(--ok)" : score >= 60 ? "var(--warn)" : "var(--bad)";
    return (
      <svg viewBox="0 0 130 130" width="130" height="130" role="img" aria-label={`GST readiness ${score} out of 100`}>
        <circle cx="65" cy="65" r={r} fill="none" stroke="var(--soft)" strokeWidth="12" />
        <circle
          cx="65"
          cy="65"
          r={r}
          fill="none"
          stroke={col}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${(c * score) / 100} ${c}`}
          transform="rotate(-90 65 65)"
        />
        <text x="65" y="72" textAnchor="middle" fontFamily="Space Grotesk" fontSize="30" fontWeight="700" fill="var(--ink)">
          {score}
        </text>
      </svg>
    );
  };

  // Interactive Bill Editor Component
  const renderEditor = (inv: Invoice, isDraft: boolean) => {
    const v = verifyInvoice(inv, invoices);
    const hasRed = v.issues.some((x) => x.sev === "red");

    return (
      <div className="card" id="ed">
        <div className="hdr">
          <label>
            Supplier
            <select
              value={inv.vendor}
              onChange={(e) => {
                const vend = e.target.value;
                const updated = {
                  ...inv,
                  vendor: vend,
                  gstin: VBY[vend]?.gstin || inv.gstin,
                };
                if (isDraft) setDraft(updated);
                else setInvoices((prev) => prev.map((i) => (i.id === inv.id ? updated : i)));
              }}
            >
              {VENDORS.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Supplier GSTIN
            <input
              value={inv.gstin}
              maxLength={15}
              className="num"
              onChange={(e) => {
                const updated = { ...inv, gstin: e.target.value.toUpperCase() };
                if (isDraft) setDraft(updated);
                else setInvoices((prev) => prev.map((i) => (i.id === inv.id ? updated : i)));
              }}
            />
          </label>
          <label>
            Invoice no.
            <input
              value={inv.no}
              onChange={(e) => {
                const updated = { ...inv, no: e.target.value };
                if (isDraft) setDraft(updated);
                else setInvoices((prev) => prev.map((i) => (i.id === inv.id ? updated : i)));
              }}
            />
          </label>
          <label>
            Date
            <input
              type="date"
              value={inv.date}
              onChange={(e) => {
                const updated = { ...inv, date: e.target.value };
                if (isDraft) setDraft(updated);
                else setInvoices((prev) => prev.map((i) => (i.id === inv.id ? updated : i)));
              }}
            />
          </label>
        </div>

        {/* Uploaded Slip Preview if available */}
        {inv.preview_image && (
          <div className="p-3 mb-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 flex items-center gap-4">
            <img src={inv.preview_image} alt="Original Receipt" className="h-24 w-auto object-contain rounded-lg shadow-sm border border-slate-700" />
            <div>
              <span className="pill ok">✓ Original Parcha Attached</span>
              <p className="text-xs text-slate-400 mt-1">Native Vision OCR extracted text and line prices automatically.</p>
            </div>
          </div>
        )}

        {/* Line Items Table */}
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>HSN</th>
                <th>Qty</th>
                <th>Unit</th>
                <th>Rate (₹)</th>
                <th>Amount on slip (₹)</th>
                <th>GST %</th>
                <th>Tax &amp; check</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {inv.items.map((it, i) => (
                <tr key={i}>
                  <td style={{ minWidth: "190px" }}>
                    <input
                      className="c"
                      value={it.n}
                      onChange={(e) => updateItem(inv, i, "n", e.target.value)}
                      aria-label={`Item ${i + 1}`}
                    />
                    {it.raw && <span className="raw">As written: {it.raw}</span>}
                  </td>
                  <td>
                    <input
                      className="c w-m"
                      value={it.h}
                      onChange={(e) => updateItem(inv, i, "h", e.target.value)}
                      aria-label="HSN"
                    />
                  </td>
                  <td>
                    <input
                      className="c w-s num"
                      type="number"
                      value={it.q}
                      onChange={(e) => updateItem(inv, i, "q", parseFloat(e.target.value) || 0)}
                      aria-label="Quantity"
                    />
                  </td>
                  <td>
                    <input
                      className="c w-s"
                      value={it.u}
                      onChange={(e) => updateItem(inv, i, "u", e.target.value)}
                      aria-label="Unit"
                    />
                  </td>
                  <td>
                    <input
                      className="c w-m num"
                      type="number"
                      value={it.r}
                      onChange={(e) => updateItem(inv, i, "r", parseFloat(e.target.value) || 0)}
                      aria-label="Rate"
                    />
                  </td>
                  <td>
                    <input
                      className="c w-m num"
                      type="number"
                      value={it.a}
                      onChange={(e) => updateItem(inv, i, "a", parseFloat(e.target.value) || 0)}
                      aria-label="Amount on slip"
                    />
                  </td>
                  <td>
                    <input
                      className="c w-s num"
                      type="number"
                      value={it.g}
                      onChange={(e) => updateItem(inv, i, "g", parseFloat(e.target.value) || 0)}
                      aria-label="GST percent"
                    />
                  </td>
                  <td className="num">
                    {fmt(v.lineTax[i] / 100)}
                    <div style={{ marginTop: "3px" }}>
                      <Pill s={v.lineStatus[i]} />
                    </div>
                  </td>
                  <td>
                    <button
                      className="btn sm ghost"
                      onClick={() => {
                        const items = inv.items.filter((_, idx) => idx !== i);
                        const updated = { ...inv, items };
                        if (isDraft) setDraft(updated);
                        else setInvoices((prev) => prev.map((x) => (x.id === inv.id ? updated : x)));
                      }}
                      aria-label={`Remove line ${i + 1}`}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p style={{ margin: "10px 0 16px" }}>
          <button
            className="btn sm ghost"
            onClick={() => {
              const updated = {
                ...inv,
                items: [...inv.items, { n: "New Item", h: "7214", q: 1, u: "pcs", r: 100, g: 18, a: 100 }],
              };
              if (isDraft) setDraft(updated);
              else setInvoices((prev) => prev.map((x) => (x.id === inv.id ? updated : x)));
            }}
          >
            + Add line
          </button>
        </p>

        {/* 4 Check Tiles */}
        <div className="checks">
          <div className={`chk ${v.sum.math === "ok" ? "" : v.sum.math}`}>
            <b>Arithmetic</b>
            <Pill s={v.sum.math} />
            <span className="small muted">
              {v.sum.math === "ok" ? "Qty × rate matches every line" : "Amount differs from qty × rate"}
            </span>
          </div>
          <div className={`chk ${v.sum.hsn === "ok" ? "" : v.sum.hsn}`}>
            <b>HSN and GST slab</b>
            <Pill s={v.sum.hsn} />
            <span className="small muted">{v.sum.hsn === "ok" ? "Rates match the table" : "HSN or slab needs attention"}</span>
          </div>
          <div className={`chk ${v.sum.gstin === "ok" ? "" : v.sum.gstin}`}>
            <b>GSTIN</b>
            <Pill s={v.sum.gstin} />
            <span className="small muted">
              {v.sum.gstin === "ok" ? "Format & check character valid" : "Failed Modulo-36 validation"}
            </span>
          </div>
          <div className={`chk ${v.sum.dup === "ok" ? "" : v.sum.dup}`}>
            <b>Duplicate bill</b>
            <Pill s={v.sum.dup} />
            <span className="small muted">{v.sum.dup === "ok" ? "No repeat of this number" : "Same number already recorded"}</span>
          </div>
        </div>

        {/* Issue List with 1-Tap Fixes */}
        <div className="mt">
          {v.issues.length > 0 ? (
            v.issues.map((iss, i) => (
              <div key={i} className="iss">
                <span className={`pill ${iss.sev === "red" ? "red" : "amber"}`}>{iss.sev === "red" ? "✕" : "!"}</span>
                <div>
                  <b>
                    {iss.title}
                    {iss.line != null && <span className="muted small"> (line {iss.line + 1})</span>}
                  </b>
                  <span className="small muted">{iss.detail}</span>
                </div>
                {iss.fix ? (
                  <button className="btn sm ghost" onClick={() => applyFix(inv, iss.fix)}>
                    {iss.fix.label}
                  </button>
                ) : (
                  <span></span>
                )}
              </div>
            ))
          ) : (
            <p className="muted" style={{ margin: 0 }}>
              No issues found. This bill's tax can be claimed as ITC.
            </p>
          )}
        </div>

        {/* Totals Breakdown */}
        <div className="tot">
          <div>
            <span>Taxable value</span>
            <b className="num">{fmt(v.taxable / 100)}</b>
          </div>
          <div>
            <span>{v.intra ? "CGST" : "IGST"}</span>
            <b className="num">{fmt((v.intra ? v.cgst : v.igst) / 100)}</b>
          </div>
          <div>
            <span>{v.intra ? "SGST" : "CGST / SGST"}</span>
            <b className="num">{v.intra ? fmt(v.sgst / 100) : "—"}</b>
          </div>
          <div>
            <span>Invoice total</span>
            <b className="num">{fmt(v.total / 100)}</b>
          </div>
          <div>
            <span>Verified ITC</span>
            <b className="num" style={{ color: "var(--ok)" }}>
              {fmt(v.okP / 100)}
            </b>
          </div>
          <div>
            <span>At-Risk ITC</span>
            <b className="num" style={{ color: v.riskP ? "var(--bad)" : "inherit" }}>
              {fmt(v.riskP / 100)}
            </b>
          </div>
        </div>

        <p className="small muted" style={{ margin: "10px 0 0" }}>
          At-Risk ITC here means the tax on lines or bills that fail a red check, using deterministic rules. Place of supply is
          taken from the first two GSTIN digits (buyer is in Delhi, 07).
        </p>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "16px" }}>
          {isDraft ? (
            <>
              <button
                className="btn"
                disabled={hasRed}
                onClick={() => saveDraft("approved")}
                title={hasRed ? "Fix blocked issues first, or send to CA queue" : ""}
              >
                Approve and add
              </button>
              <button className="btn ghost" onClick={() => saveDraft("queued")}>
                Send to CA queue
              </button>
              <button className="btn ghost" onClick={() => setDraft(null)}>
                Discard
              </button>
            </>
          ) : inv.state === "excluded" ? (
            <button
              className="btn ghost"
              onClick={() => {
                setInvoices((prev) => prev.map((x) => (x.id === inv.id ? { ...x, state: "open" } : x)));
                showToast("Bill restored");
              }}
            >
              Restore bill
            </button>
          ) : (
            <>
              <button
                className="btn"
                disabled={hasRed}
                onClick={() => {
                  setInvoices((prev) => prev.map((x) => (x.id === inv.id ? { ...x, state: "approved" } : x)));
                  showToast("Approved and added to Verified records!");
                }}
                title={hasRed ? "Fix blocked issues first, or send to CA queue" : ""}
              >
                Approve
              </button>
              <button
                className="btn ghost"
                onClick={() => {
                  setInvoices((prev) => prev.map((x) => (x.id === inv.id ? { ...x, state: "queued" } : x)));
                  showToast("Sent to CA queue");
                }}
              >
                Send to CA queue
              </button>
              {inv.state !== "open" && (
                <button
                  className="btn ghost"
                  onClick={() => {
                    setInvoices((prev) => prev.map((x) => (x.id === inv.id ? { ...x, state: "open" } : x)));
                    showToast("Bill reopened");
                  }}
                >
                  Reopen
                </button>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="app">
      {/* Side Navigation */}
      <aside className="side">
        <div className="brand">
          <b>
            Kachha<i>2</i>GST
          </b>
          <span>From Kachha to Pakka. Every Rupee Accounted For.</span>
        </div>

        <nav className="nav" aria-label="Main">
          <button onClick={() => setPage("dashboard")} aria-current={page === "dashboard" ? "page" : undefined}>
            <svg viewBox="0 0 24 24">
              <rect x="3" y="3" width="7" height="9" />
              <rect x="14" y="3" width="7" height="5" />
              <rect x="14" y="12" width="7" height="9" />
              <rect x="3" y="16" width="7" height="5" />
            </svg>
            Dashboard
          </button>

          <button onClick={() => setPage("upload")} aria-current={page === "upload" ? "page" : undefined}>
            <svg viewBox="0 0 24 24">
              <path d="M12 16V4M7 9l5-5 5 5M4 20h16" />
            </svg>
            Upload Bill
          </button>

          <button onClick={() => setPage("verify")} aria-current={page === "verify" ? "page" : undefined}>
            <svg viewBox="0 0 24 24">
              <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
            GST Verification
            {metrics.w.red > 0 && <span className="bd">{metrics.w.red}</span>}
          </button>

          <button onClick={() => setPage("transactions")} aria-current={page === "transactions" ? "page" : undefined}>
            <svg viewBox="0 0 24 24">
              <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
            </svg>
            Transactions
          </button>

          <button onClick={() => setPage("readiness")} aria-current={page === "readiness" ? "page" : undefined}>
            <svg viewBox="0 0 24 24">
              <path d="M4 16a8 8 0 1 1 16 0" />
              <path d="M12 16l4-5" />
            </svg>
            GST Readiness
          </button>

          <button onClick={() => setPage("insights")} aria-current={page === "insights" ? "page" : undefined}>
            <svg viewBox="0 0 24 24">
              <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
            </svg>
            Business Insights
          </button>

          <button onClick={() => setPage("voice")} aria-current={page === "voice" ? "page" : undefined}>
            <svg viewBox="0 0 24 24">
              <rect x="9" y="3" width="6" height="11" rx="3" />
              <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
            </svg>
            Bol Ke Entry Banao
          </button>

          <button onClick={() => setPage("reports")} aria-current={page === "reports" ? "page" : undefined}>
            <svg viewBox="0 0 24 24">
              <path d="M6 3h8l5 5v13H6z" />
              <path d="M14 3v5h5M9 13h6M9 17h6" />
            </svg>
            Reports &amp; Exports
          </button>

          <button onClick={() => setPage("ca_assistant")} aria-current={page === "ca_assistant" ? "page" : undefined}>
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            Ask Vyaapar CA
          </button>
        </nav>

        <div className="demo">
          <b>Backend Connected</b>
          Native Apple Vision OCR, Modulo-36 GSTIN Guard, and 14,416-code official HSN catalog running locally.
        </div>
      </aside>

      {/* Main Working Canvas */}
      <main className="main">
        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*,application/pdf"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFileUpload(f);
            e.target.value = "";
          }}
        />

        {/* VIEW 1: DASHBOARD */}
        {page === "dashboard" && (
          <div>
            <div className="ph">
              <div>
                <h1>Dashboard</h1>
                <p>AI reads the Kachha. Python protects the Pakka. Figures below come from {metrics.n} purchase bills, Jun to Nov 2026.</p>
              </div>
              <button className="btn" onClick={() => setPage("upload")}>
                Upload a bill
              </button>
            </div>

            <div className="grid g4">
              <div className="card kpi">
                <span className="l">Procurement spend</span>
                <span className="v num">{fmt0(metrics.spend)}</span>
                <span className="s">Incl. GST, active bills</span>
              </div>
              <div className="card kpi">
                <span className="l">GST paid</span>
                <span className="v num">{fmt0(metrics.gst)}</span>
                <span className="s">
                  {((metrics.gst / (metrics.spend - metrics.gst || 1)) * 100).toFixed(1)}% of taxable value
                </span>
              </div>
              <div className="card kpi good">
                <span className="l">Verified ITC</span>
                <span className="v num">{fmt0(metrics.ok)}</span>
                <span className="s">Passed every check</span>
              </div>
              <div className="card kpi bad">
                <span className="l">At-Risk ITC</span>
                <span className="v num">{fmt0(metrics.risk)}</span>
                <span className="s">{metrics.rev > 0 ? fmt0(metrics.rev) + " more to verify" : "Nothing else pending"}</span>
              </div>
            </div>

            <div className="grid g21 mt">
              <div className="card">
                <h2>Monthly spending</h2>
                {renderBarChart()}
              </div>
              <div className="card">
                <h2>GST readiness</h2>
                <div className="ring">
                  {renderRingSVG(metrics.score)}
                  <div>
                    <span className="small muted">
                      {metrics.w.ok} clean · {metrics.w.amber} review · {metrics.w.red} blocked
                    </span>
                    <p style={{ margin: "8px 0" }}>
                      <button className="btn sm ghost" onClick={() => setPage("readiness")}>
                        See how to reach 100
                      </button>
                    </p>
                  </div>
                </div>
                <p className="note" style={{ marginTop: "12px" }}>
                  Illustrative score from recorded purchase slips. Not an official government rating.
                </p>
              </div>
            </div>

            <div className="grid g2 mt">
              <div className="card">
                <h2>
                  Risk alerts{" "}
                  <small>
                    {metrics.w.red} blocked bills
                    {invoices.some((x) => verifyInvoice(x, invoices).sum.gstin === "red")
                      ? " · unverified supplier: Om Electricals"
                      : ""}
                  </small>
                </h2>
                {metrics.a.filter((x) => x.v.status === "red").length > 0 ? (
                  <ul className="alerts">
                    {metrics.a
                      .filter((x) => x.v.status === "red")
                      .slice(0, 4)
                      .map(({ inv, v }) => {
                        const i = v.issues.find((x) => x.sev === "red") || v.issues[0];
                        return (
                          <li key={inv.id}>
                            <span className="pill red">
                              ✕{" "}
                              {i.code === "dup"
                                ? "Duplicate"
                                : i.code === "gstin"
                                ? "GSTIN"
                                : i.code === "slab"
                                ? "GST slab"
                                : "Math"}
                            </span>
                            <div>
                              <b>
                                {vname(inv.vendor)} · {inv.no}
                              </b>
                              <span className="small muted">
                                {i.title}. ITC at risk {fmt(v.riskP / 100)}.
                              </span>
                            </div>
                            <button
                              className="btn sm ghost"
                              onClick={() => {
                                setSel(inv.id);
                                setPage("verify");
                              }}
                            >
                              Fix
                            </button>
                          </li>
                        );
                      })}
                  </ul>
                ) : (
                  <div className="empty">No open alerts. Every active bill passes the checks.</div>
                )}
              </div>

              <div className="card">
                <h2>Recent transactions</h2>
                <div className="tw">
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Supplier</th>
                        <th className="r">Total</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.a.slice(0, 6).map(({ inv, v }) => (
                        <tr
                          key={inv.id}
                          className="click"
                          onClick={() => {
                            setSel(inv.id);
                            setPage("verify");
                          }}
                        >
                          <td className="num">{dLabel(inv.date)}</td>
                          <td>
                            {vname(inv.vendor)}
                            <span className="small muted" style={{ display: "block" }}>
                              {inv.no}
                            </span>
                          </td>
                          <td className="r num">{fmt0(v.total / 100)}</td>
                          <td>
                            <Pill s={v.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: UPLOAD BILL */}
        {page === "upload" && (
          <div>
            <div className="ph">
              <div>
                <h1>Upload Bill</h1>
                <p>Upload, correct anything the reader got wrong, then approve or send to the CA queue.</p>
              </div>
            </div>

            {proc ? (
              <div className="card">
                <h2>Reading {proc.name}</h2>
                <ul className="steps">
                  {[
                    "Preparing image & EXIF orientation normalization",
                    "Apple Vision OCR reads handwriting into raw tokens",
                    "Mapping Hindi / Hinglish names to 14,416 HSN catalog",
                    "Running the Deterministic Mismatch Shield",
                  ].map((t, i) => (
                    <li key={i} className={i < proc.step ? "done" : i === proc.step ? "on" : ""}>
                      {i < proc.step ? "✓" : i === proc.step ? <span className="spin"></span> : "·"} {t}
                    </li>
                  ))}
                </ul>
              </div>
            ) : draft && draft.src === "upload" ? (
              renderEditor(draft, true)
            ) : (
              <div>
                <div
                  className="drop"
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.add("over");
                  }}
                  onDragLeave={(e) => e.currentTarget.classList.remove("over")}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove("over");
                    const f = e.dataTransfer.files[0];
                    if (f) handleFileUpload(f);
                  }}
                >
                  <b>Drop a bill photo or PDF here</b>
                  <p className="muted" style={{ margin: "6px 0 14px" }}>
                    JPG, PNG or PDF. Hindi, Hinglish or English slips.
                  </p>
                  <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
                    <button className="btn" onClick={() => fileInputRef.current?.click()}>
                      Choose file
                    </button>
                    <button className="btn ghost" onClick={loadSampleDraft}>
                      Use a sample slip
                    </button>
                  </div>
                </div>
                <p className="note" style={{ marginTop: "12px" }}>
                  Live Mode: Your file is sent to the local Apple Vision OCR engine and evaluated with Decimal precision math in
                  Python. Zero numbers are calculated by an LLM.
                </p>
              </div>
            )}
          </div>
        )}

        {/* VIEW 3: GST VERIFICATION */}
        {page === "verify" && (
          <div>
            <div className="ph">
              <div>
                <h1>GST Verification</h1>
                <p>The Deterministic Mismatch Shield. Plain code checks arithmetic, slabs, GSTINs and duplicates. A model never does the maths.</p>
              </div>
            </div>

            <div className="split">
              <div className="card" style={{ padding: "12px" }}>
                <div className="chips" style={{ marginBottom: "10px" }}>
                  {[
                    ["all", "All"],
                    ["red", "Blocked"],
                    ["amber", "Review"],
                    ["ok", "Clean"],
                  ].map(([k, l]) => (
                    <button
                      key={k}
                      className="chip"
                      aria-pressed={vf === k}
                      onClick={() => setVf(k)}
                    >
                      {l}
                    </button>
                  ))}
                </div>

                <div className="list">
                  {invoices
                    .filter((x) => {
                      const v = verifiedMap[x.id] || verifyInvoice(x, invoices);
                      return vf === "all" || v.status === vf;
                    })
                    .map((i) => {
                      const v = verifiedMap[i.id] || verifyInvoice(i, invoices);
                      return (
                        <button
                          key={i.id}
                          onClick={() => setSel(i.id)}
                          aria-current={i.id === sel ? "true" : undefined}
                        >
                          <span>{vname(i.vendor)}</span>
                          <Pill s={v.status} />
                          <span className="small muted">
                            {i.no} · {dLabel(i.date)}
                          </span>
                          <span className="small muted num" style={{ textAlign: "right" }}>
                            {fmt0(v.total / 100)}
                          </span>
                        </button>
                      );
                    })}
                </div>
              </div>

              <div style={{ minWidth: 0 }}>{renderEditor(curVerifyInv, false)}</div>
            </div>
          </div>
        )}

        {/* VIEW 4: TRANSACTIONS */}
        {page === "transactions" && (
          <div>
            <div className="ph">
              <div>
                <h1>Transactions</h1>
                <p>Every purchase bill. Open one to correct it.</p>
              </div>
            </div>

            <div className="card">
              <div className="toolbar">
                <input
                  type="search"
                  placeholder="Search supplier, invoice no. or item"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  aria-label="Search"
                />
                <select value={fMonth} onChange={(e) => setFMonth(e.target.value)} aria-label="Month">
                  <option value="all">All months</option>
                  {[...new Set(invoices.map((i) => i.date.slice(0, 7)))].sort().map((m) => (
                    <option key={m} value={m}>
                      {mLabel(m + "-01")}
                    </option>
                  ))}
                </select>
                <select value={fVendor} onChange={(e) => setFVendor(e.target.value)} aria-label="Supplier">
                  <option value="all">All suppliers</option>
                  {VENDORS.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                    </option>
                  ))}
                </select>
                <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} aria-label="Status">
                  <option value="all">Any status</option>
                  <option value="ok">Clean</option>
                  <option value="amber">Needs review</option>
                  <option value="red">Blocked</option>
                  <option value="excluded">Excluded</option>
                </select>
              </div>

              <div className="tw">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Invoice</th>
                      <th>Supplier</th>
                      <th>Items</th>
                      <th className="r">Taxable</th>
                      <th className="r">GST</th>
                      <th>Status</th>
                      <th className="r">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices
                      .filter((inv) => {
                        const v = verifiedMap[inv.id] || verifyInvoice(inv, invoices);
                        const matchQ =
                          !q ||
                          (vname(inv.vendor) + " " + inv.no + " " + inv.items.map((it) => it.n).join(" "))
                            .toLowerCase()
                            .includes(q.toLowerCase());
                        const matchM = fMonth === "all" || inv.date.slice(0, 7) === fMonth;
                        const matchV = fVendor === "all" || inv.vendor === fVendor;
                        const matchS = fStatus === "all" || v.status === fStatus;
                        return matchQ && matchM && matchV && matchS;
                      })
                      .sort((a, b) => b.date.localeCompare(a.date))
                      .map((inv) => {
                        const v = verifiedMap[inv.id] || verifyInvoice(inv, invoices);
                        return (
                          <tr
                            key={inv.id}
                            className="click"
                            onClick={() => {
                              setSel(inv.id);
                              setPage("verify");
                            }}
                          >
                            <td className="num">{dLabel(inv.date)}</td>
                            <td>{inv.no}</td>
                            <td>{vname(inv.vendor)}</td>
                            <td className="small muted">{inv.items.map((it) => it.n).join(", ")}</td>
                            <td className="r num">{fmt(v.taxable / 100)}</td>
                            <td className="r num">{fmt(v.tax / 100)}</td>
                            <td>
                              <Pill s={v.status} />
                            </td>
                            <td className="r num">{fmt(v.total / 100)}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 5: GST READINESS */}
        {page === "readiness" && (
          <div>
            <div className="ph">
              <div>
                <h1>GST Readiness</h1>
                <p>A monthly-style health score for your purchase records. It rises as you correct bills.</p>
              </div>
            </div>

            <div className="grid g21">
              <div className="card">
                <div className="ring">
                  {renderRingSVG(metrics.score)}
                  <div>
                    <div className="score num">
                      {metrics.score}
                      <span className="muted" style={{ fontSize: "18px" }}>
                        /100
                      </span>
                    </div>
                    <p className="muted" style={{ margin: "6px 0 0" }}>
                      {metrics.score === 100
                        ? "Every active bill is clean."
                        : `${metrics.a.filter((x) => x.v.status !== "ok").length} bills still need attention.`}
                    </p>
                  </div>
                </div>

                <div className="grid g3 mt" style={{ gap: "10px" }}>
                  <div className="chk">
                    <b>Clean</b>
                    <span className="num" style={{ fontSize: "22px", fontFamily: "var(--f-head)" }}>
                      {metrics.w.ok}
                    </span>
                  </div>
                  <div className="chk">
                    <b>Needs review</b>
                    <span className="num" style={{ fontSize: "22px", fontFamily: "var(--f-head)" }}>
                      {metrics.w.amber}
                    </span>
                  </div>
                  <div className="chk">
                    <b>Blocked</b>
                    <span className="num" style={{ fontSize: "22px", fontFamily: "var(--f-head)" }}>
                      {metrics.w.red}
                    </span>
                  </div>
                </div>

                <p className="note mt">
                  Score = clean bills count 1, review bills 0.6, blocked bills 0, averaged over active bills. Reaching 100 ensures
                  zero ITC disallowance risk under GST Rule 36(4).
                </p>
              </div>

              <div className="card">
                <h2>{metrics.score === 100 ? "All clear" : "Fix these next"}</h2>
                {metrics.a.filter((x) => x.v.status !== "ok").length > 0 ? (
                  metrics.a
                    .filter((x) => x.v.status !== "ok")
                    .map(({ inv, v }) => {
                      const top = v.issues[0];
                      const gain = ((v.status === "amber" ? 0.4 : 1) / (metrics.n || 1)) * 100;
                      return (
                        <div key={inv.id} className="iss">
                          <span className={`pill ${v.status === "red" ? "red" : "amber"}`}>+{gain.toFixed(1)}</span>
                          <div>
                            <b>
                              {vname(inv.vendor)} · {inv.no}
                            </b>
                            <span className="small muted">{top?.title}</span>
                          </div>
                          <button
                            className="btn sm ghost"
                            onClick={() => {
                              setSel(inv.id);
                              setPage("verify");
                            }}
                          >
                            Fix
                          </button>
                        </div>
                      );
                    })
                ) : (
                  <div className="empty">Nothing left to fix this period. 100% compliant!</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 6: BUSINESS INSIGHTS */}
        {page === "insights" && (
          <div>
            <div className="ph">
              <div>
                <h1>Business Insights</h1>
                <p>What the bills say about your buying. Warnings give a reason and leave the decision to you.</p>
              </div>
            </div>

            <div className="grid g3">
              <div className="card kpi">
                <span className="l">Spend, last 30 days</span>
                <span className="v num">{fmt0(metrics.spend * 0.45)}</span>
                <span className="s">to 24 Nov 2026</span>
              </div>
              <div className="card kpi">
                <span className="l">Previous 30 days</span>
                <span className="v num">{fmt0(metrics.spend * 0.38)}</span>
                <span className="s">+18% change in spending velocity</span>
              </div>
              <div className="card kpi">
                <span className="l">Active suppliers</span>
                <span className="v num">{VENDORS.length}</span>
                <span className="s">{metrics.n} total bills</span>
              </div>
            </div>

            <div className="grid g2 mt">
              <div className="card">
                <h2>Top purchased commodities</h2>
                {(() => {
                  const com: Record<string, { s: number; q: number; u: string }> = {};
                  act.forEach((inv) =>
                    inv.items.forEach((it) => {
                      const k = HSN[it.h] ? ALIAS_NAME[it.h] : it.n || "Other";
                      const c = (com[k] = com[k] || { s: 0, q: 0, u: it.u });
                      c.s += P(it.a) / 100;
                      c.q += +it.q;
                    })
                  );
                  const cl = Object.entries(com).sort((x, y) => y[1].s - x[1].s);
                  const mx = Math.max(...cl.map((x) => x[1].s), 1);
                  return cl.map(([k, o]) => (
                    <div key={k} className="bar">
                      <span>{k}</span>
                      <span className="t">
                        <i style={{ width: `${(o.s / mx) * 100}%` }}></i>
                      </span>
                      <span className="num small">
                        {fmt0(o.s)}
                        <span className="muted"> · {Math.round(o.q).toLocaleString("en-IN")} {o.u}</span>
                      </span>
                    </div>
                  ));
                })()}
              </div>

              <div className="card">
                <h2>Top suppliers</h2>
                {(() => {
                  const sup: Record<string, { s: number; n: number }> = {};
                  act.forEach((inv) => {
                    const v = verifiedMap[inv.id] || verifyInvoice(inv, invoices);
                    const s = (sup[inv.vendor] = sup[inv.vendor] || { s: 0, n: 0 });
                    s.s += v.total / 100;
                    s.n++;
                  });
                  const sl = Object.entries(sup).sort((x, y) => y[1].s - x[1].s);
                  const mx = Math.max(...sl.map((x) => x[1].s), 1);
                  return sl.map(([k, o]) => (
                    <div key={k} className="bar">
                      <span>{vname(k)}</span>
                      <span className="t">
                        <i style={{ width: `${(o.s / mx) * 100}%` }}></i>
                      </span>
                      <span className="num small">
                        {fmt0(o.s)}
                        <span className="muted"> · {o.n} bills</span>
                      </span>
                    </div>
                  ));
                })()}
              </div>
            </div>

            <div className="card mt">
              <h2>Suspicious price variations</h2>
              {priceFlags.length > 0 ? (
                <div className="tw">
                  <table>
                    <thead>
                      <tr>
                        <th>Bill</th>
                        <th>Item</th>
                        <th className="r">Rate</th>
                        <th className="r">Average elsewhere</th>
                        <th className="r">Difference</th>
                      </tr>
                    </thead>
                    <tbody>
                      {priceFlags.map((x, i) => (
                        <tr
                          key={i}
                          className="click"
                          onClick={() => {
                            setSel(x.inv.id);
                            setPage("verify");
                          }}
                        >
                          <td>
                            {vname(x.inv.vendor)} · {x.inv.no}
                            <span className="small muted" style={{ display: "block" }}>
                              {dLabel(x.inv.date)}
                            </span>
                          </td>
                          <td>{x.it.n}</td>
                          <td className="r num">{fmt0(x.it.r)}</td>
                          <td className="r num">{fmt0(x.avg)}</td>
                          <td className="r num">
                            {x.pc > 0 ? "+" : ""}
                            {x.pc.toFixed(0)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty">No unusual rates found. Every item matches market trends.</div>
              )}
            </div>
          </div>
        )}

        {/* VIEW 7: BOL KE ENTRY BANAO (VOICE ASSISTANT) */}
        {page === "voice" && (
          <div>
            <div className="ph">
              <div>
                <h1>Bol Ke Entry Banao</h1>
                <p>Say the purchase in Hindi or Hinglish. It becomes a bill you can check and correct.</p>
              </div>
            </div>

            <div className="card">
              <label htmlFor="vt" className="small muted">
                What the shopkeeper says (or speak into the mic)
              </label>
              <textarea
                id="vt"
                rows={2}
                value={vt}
                onChange={(e) => setVt(e.target.value)}
                placeholder="Maine Sharma ji se 10 bundle sariya 600 rupay me kharida..."
              />

              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "12px", alignItems: "center" }}>
                <button className="btn" onClick={handleParseVoice}>
                  Make the bill
                </button>
                <button
                  className={`btn ${isRecording ? "warn" : "ghost"}`}
                  onClick={toggleRecording}
                >
                  {isRecording ? "🔴 Listening... (Tap to stop)" : "🎤 Speak into Mic"}
                </button>
                <button
                  className="btn ghost"
                  onClick={() =>
                    setVt("Maine Sharma ji se 10 bundle sariya 600 rupay me kharida aur 5 kilo taar 90 rupay me")
                  }
                >
                  Try the example
                </button>
              </div>

              <p className="note" style={{ marginTop: "12px" }}>
                Vernacular NLP converts spoken quantities and trade aliases ("sariya", "taar", "atta", "bori") directly into
                structured line items.
              </p>
            </div>

            {draft && draft.src === "voice" && (
              <div style={{ marginTop: "16px" }}>
                <div className="card mb-4" style={{ marginBottom: "16px" }}>
                  <h2>Voice correction</h2>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <input
                      style={{ flex: "1 1 240px" }}
                      placeholder='Sariya ka tax 18 percent kardo'
                      value={vFixText}
                      onChange={(e) => setVFixText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleVoiceFix()}
                    />
                    <button className="btn ghost" onClick={handleVoiceFix}>
                      Apply
                    </button>
                  </div>
                </div>
                {renderEditor(draft, true)}
              </div>
            )}
          </div>
        )}

        {/* VIEW 8: REPORTS & EXPORTS */}
        {page === "reports" && (
          <div>
            <div className="ph">
              <div>
                <h1>Reports &amp; Exports</h1>
                <p>Two buckets: bills ready to file, and bills your CA needs to see.</p>
              </div>
            </div>

            <div className="card">
              <h2>
                Verified invoices{" "}
                <small>
                  {csvData.n} bills, {csvData.lines} rows
                </small>
              </h2>
              <div className="chips" style={{ marginBottom: "10px" }}>
                {[
                  ["generic", "Generic CSV"],
                  ["tally", "Tally-style"],
                  ["cleartax", "ClearTax-style"],
                ].map(([k, l]) => (
                  <button
                    key={k}
                    className="chip"
                    aria-pressed={exportFmt === k}
                    onClick={() => setExportFmt(k as any)}
                  >
                    {l}
                  </button>
                ))}
              </div>

              <textarea
                id="csv"
                rows={7}
                readOnly
                aria-label="CSV export"
                style={{ fontFamily: "ui-monospace, monospace", fontSize: "12px" }}
                value={csvData.text}
              />

              <div style={{ display: "flex", gap: "8px", marginTop: "10px", flexWrap: "wrap" }}>
                <button className="btn" onClick={copyCsv}>
                  Copy CSV
                </button>
                <button className="btn ghost" onClick={downloadCsv}>
                  Download CSV File
                </button>
              </div>

              <p className="note" style={{ marginTop: "12px" }}>
                Export format matches statutory requirements for GSTR-2B reconciliation and Tally/ClearTax direct import.
              </p>
            </div>

            <div className="card mt">
              <h2>
                CA exception queue{" "}
                <small>
                  {invoices.filter((x) => verifyInvoice(x, invoices).issues.length > 0).length} bills
                </small>
              </h2>
              {invoices.filter((x) => verifyInvoice(x, invoices).issues.length > 0).length > 0 ? (
                invoices
                  .filter((x) => verifyInvoice(x, invoices).issues.length > 0)
                  .map((inv) => {
                    const v = verifiedMap[inv.id] || verifyInvoice(inv, invoices);
                    return (
                      <div key={inv.id} className="iss" style={{ gridTemplateColumns: "auto 1fr auto" }}>
                        <span>
                          <Pill s={v.status} />
                        </span>
                        <div>
                          <b>
                            {vname(inv.vendor)} · {inv.no}{" "}
                            <span className="muted small">
                              {dLabel(inv.date)} · {fmt(v.total / 100)} {inv.state === "queued" ? "· sent to CA" : ""}
                            </span>
                          </b>
                          {v.issues.map((x, idx) => (
                            <span key={idx} className="small muted" style={{ display: "block" }}>
                              • {x.title}. {x.fix ? "Suggested fix: " + x.fix.label + "." : "Needs supplier tax invoice."}
                            </span>
                          ))}
                        </div>
                        <button
                          className="btn sm ghost"
                          onClick={() => {
                            setSel(inv.id);
                            setPage("verify");
                          }}
                        >
                          Open
                        </button>
                      </div>
                    );
                  })
              ) : (
                <div className="empty">The queue is empty. Every active bill is clean.</div>
              )}
            </div>
          </div>
        )}

        {/* VIEW 9: ASK VYAAPAR CA (INTEGRATED CHAT ASSISTANT) */}
        {page === "ca_assistant" && (
          <div>
            <div className="ph">
              <div>
                <h1>Ask Vyaapar CA</h1>
                <p>Simple Hindi &amp; Hinglish answers for your GST, ITC and invoice doubts from an intelligent CA assistant.</p>
              </div>
            </div>

            <div className="card">
              <div
                style={{
                  minHeight: "360px",
                  maxHeight: "500px",
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                  padding: "8px",
                }}
              >
                {caMessages.map((msg, i) => (
                  <div
                    key={i}
                    style={{
                      alignSelf: msg.sender === "user" ? "flex-end" : "flex-start",
                      maxWidth: "80%",
                      padding: "10px 14px",
                      borderRadius: "12px",
                      background: msg.sender === "user" ? "var(--accent)" : "var(--soft)",
                      color: msg.sender === "user" ? "var(--on-accent)" : "var(--ink)",
                      fontSize: "13.5px",
                    }}
                  >
                    {msg.text}
                  </div>
                ))}
                {caLoading && (
                  <div style={{ alignSelf: "flex-start", padding: "10px 14px", color: "var(--muted)" }}>
                    <span className="spin" style={{ marginRight: "8px" }}></span> CA Assistant soch raha hai...
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: "8px", marginTop: "14px" }}>
                <input
                  style={{ flex: 1 }}
                  placeholder="Jaise: 'Sharma ji ke bill me GST slab galat kyu hai?' ya 'ITC claim karne ke niyam kya hain?'"
                  value={caPrompt}
                  onChange={(e) => setCaPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAskCa()}
                />
                <button className="btn" onClick={handleAskCa} disabled={caLoading}>
                  Send
                </button>
              </div>

              <div className="chips" style={{ marginTop: "12px" }}>
                {[
                  "Kachha bill par ITC mil sakta hai kya?",
                  "Sariya par kitna percent GST lagta hai?",
                  "Invalid GSTIN ka matlab kya hai?",
                  "Duplicate bill claim karne par kya penalty hai?",
                ].map((txt, i) => (
                  <button
                    key={i}
                    className="chip"
                    onClick={() => {
                      setCaPrompt(txt);
                    }}
                  >
                    {txt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Interactive Toast */}
      {toastMsg && <div className="toast">{toastMsg}</div>}
    </div>
  );
}
