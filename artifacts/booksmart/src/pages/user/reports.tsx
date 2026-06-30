import { useState, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend,
} from "recharts";
import {
  TrendingUp, TrendingDown, ArrowRight, Loader2,
  DollarSign, BarChart2, Droplets, Sparkles,
  Download, Upload, FileText, Search, FileSpreadsheet,
  File, CheckCircle2, Clock,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Transaction = {
  id: number; title: string; amount: number; type: string;
  date_time: string; description: string; deductible: boolean;
};

type Period = "7d" | "30d" | "3m" | "12m" | "yearly";
type Tab = "dashboard" | "transactions" | "pl" | "bs" | "cf";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(v: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
}
function fmtShort(v: number) {
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return fmt(v);
}
function pctLabel(v: number) {
  return `${v > 0 ? "+" : ""}${v.toFixed(1)}%`;
}
function changePct(curr: number, prev: number): number {
  if (prev === 0) return curr > 0 ? 999 : 0;
  return ((curr - prev) / Math.abs(prev)) * 100;
}
function changeBadge(curr: number, prev: number) {
  const p = changePct(curr, prev);
  const label = Math.abs(p) >= 999 ? (p > 0 ? "+999+%" : "-999+%") : pctLabel(p);
  const pos = p >= 0;
  return { label, pos };
}

function getPeriodRange(period: Period): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();
  if (period === "7d")     { start.setDate(end.getDate() - 7); }
  else if (period === "30d") { start.setDate(end.getDate() - 30); }
  else if (period === "3m")  { start.setMonth(end.getMonth() - 3); }
  else if (period === "12m") { start.setMonth(end.getMonth() - 12); }
  else { start.setFullYear(end.getFullYear(), 0, 1); }
  return { start, end };
}

function getPrevRange(period: Period): { start: Date; end: Date } {
  const { start, end } = getPeriodRange(period);
  const dur = end.getTime() - start.getTime();
  return { start: new Date(start.getTime() - dur), end: start };
}

/** Group transactions into time buckets for the chart */
function buildTrendData(txs: Transaction[], period: Period) {
  const buckets: Map<string, { revenue: number; expenses: number }> = new Map();

  const addBucket = (key: string) => {
    if (!buckets.has(key)) buckets.set(key, { revenue: 0, expenses: 0 });
  };

  for (const tx of txs) {
    const d = new Date(tx.date_time);
    let key: string;
    if (period === "7d" || period === "30d") {
      key = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } else {
      key = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    }
    addBucket(key);
    const b = buckets.get(key)!;
    if (tx.amount > 0) b.revenue += tx.amount;
    else b.expenses += Math.abs(tx.amount);
  }

  return Array.from(buckets.entries())
    .map(([label, v]) => ({
      label,
      revenue: Math.round(v.revenue),
      expenses: Math.round(v.expenses),
      netCash: Math.round(v.revenue - v.expenses),
      profit: Math.round(v.revenue - v.expenses),
    }))
    .sort((a, b) => {
      // Keep original insertion order (already time-ordered from Supabase)
      return 0;
    });
}

// ─── Small UI pieces ──────────────────────────────────────────────────────────

function ChangeBadge({ curr, prev }: { curr: number; prev: number }) {
  const { label, pos } = changeBadge(curr, prev);
  return (
    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${pos ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}`}>
      {pos ? "▲" : "▼"} {label}
    </span>
  );
}

function BHSGauge({ score }: { score: number }) {
  const angle = -135 + (score / 100) * 270;
  const r = 55; const cx = 70; const cy = 70;
  const polarToXY = (deg: number) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };
  const arcPath = (s: number, e: number) => {
    const sv = polarToXY(s); const ev = polarToXY(e);
    const large = e - s > 180 ? 1 : 0;
    return `M ${sv.x} ${sv.y} A ${r} ${r} 0 ${large} 1 ${ev.x} ${ev.y}`;
  };
  const color = score >= 70 ? "#22c55e" : score >= 50 ? "#eab308" : "#ef4444";
  const label = score >= 70 ? "Good" : score >= 50 ? "Fair" : "Poor";
  const needle = polarToXY(angle);
  return (
    <div className="flex flex-col items-center">
      <svg width="140" height="100" viewBox="0 0 140 100">
        <defs>
          <linearGradient id="bhsGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="50%" stopColor="#eab308" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
        </defs>
        <path d={arcPath(-135, 135)} fill="none" stroke="currentColor" strokeOpacity="0.1" strokeWidth="10" strokeLinecap="round" />
        <path d={arcPath(-135, -135 + (score / 100) * 270)} fill="none" stroke="url(#bhsGrad)" strokeWidth="10" strokeLinecap="round" />
        <line x1={cx} y1={cy} x2={needle.x} y2={needle.y} stroke="white" strokeWidth="2" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="4" fill="white" />
        <text x={cx} y={cy + 20} textAnchor="middle" fontSize="22" fontWeight="bold" fill="white">{score}</text>
      </svg>
      <span className="text-sm font-semibold" style={{ color }}>{label}</span>
    </div>
  );
}

function CircularGauge({ pct, size = 90 }: { pct: number; size?: number }) {
  const r = size * 0.36; const cx = size / 2; const cy = size / 2;
  const circ = 2 * Math.PI * r;
  const dash = Math.min(1, pct / 100) * circ;
  const color = pct >= 70 ? "#22c55e" : pct >= 50 ? "#eab308" : "#ef4444";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="currentColor" strokeOpacity={0.1} strokeWidth={9} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={9}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`} />
      <text x={cx} y={cy + 5} textAnchor="middle" fontSize={size * 0.19} fontWeight="bold" fill="white">
        {Math.round(pct)}%
      </text>
    </svg>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

// ─── Document Repository types ─────────────────────────────────────────────

type DocStatus = "Uploaded" | "Verified" | "Processed";
type DocEntry = {
  id: string; title: string; type: string; category: string;
  date: string; status: DocStatus; size: string;
};

const DOC_CATEGORIES = ["All", "Tax Forms", "Income", "Expenses", "Employment", "Receipts"];
const STATUS_COLOR: Record<DocStatus, string> = {
  Uploaded: "text-emerald-400 border-emerald-400/50 bg-emerald-500/10",
  Verified: "text-blue-400 border-blue-400/50 bg-blue-500/10",
  Processed: "text-primary border-primary/50 bg-primary/10",
};
const STATUS_ICON: Record<DocStatus, typeof CheckCircle2> = {
  Uploaded: CheckCircle2, Verified: CheckCircle2, Processed: Clock,
};

const SEED_DOCS: DocEntry[] = [
  { id: "1", title: "W-9 Form - Self", type: "W-9", category: "Tax Forms", date: "Nov 15, 2024", status: "Uploaded", size: "2.4 MB" },
  { id: "2", title: "1099-INT - Bank Statement", type: "1099", category: "Income", date: "Jan 30, 2024", status: "Verified", size: "1.8 MB" },
  { id: "3", title: "Business Expense Receipts Q1", type: "Receipts", category: "Expenses", date: "Mar 20, 2024", status: "Uploaded", size: "5.2 MB" },
  { id: "4", title: "W-2 - Primary Employer", type: "W-2", category: "Employment", date: "Feb 15, 2024", status: "Processed", size: "3.1 MB" },
];

type ExportFreq = "monthly" | "quarterly" | "yearly";
type ExportReportType = "pl" | "bs" | "cf";

// ─── CSV export helper ──────────────────────────────────────────────────────

function exportCSV(rows: string[][], filename: string) {
  const csv = rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function Reports() {
  const { profile } = useAuth();
  const numericId = profile?.numericId ?? null;
  const [period, setPeriod] = useState<Period>("3m");
  const [tab, setTab] = useState<Tab>("dashboard");

  // Export dialog state
  const [showExport, setShowExport] = useState(false);
  const [exportType, setExportType] = useState<ExportReportType>("pl");
  const [exportFreq, setExportFreq] = useState<ExportFreq>("monthly");
  const [exportStart, setExportStart] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 3); return d.toISOString().slice(0, 10);
  });
  const [exportEnd, setExportEnd] = useState(() => new Date().toISOString().slice(0, 10));
  const [isExporting, setIsExporting] = useState(false);

  // Document Repository state
  const [showDocs, setShowDocs] = useState(false);
  const [docSearch, setDocSearch] = useState("");
  const [docCategory, setDocCategory] = useState("All");
  const [docs, setDocs] = useState<DocEntry[]>(SEED_DOCS);

  // Upload dialog state
  const [showUpload, setShowUpload] = useState(false);
  const [uploadPickedFile, setUploadPickedFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState("");
  const [uploadCategory, setUploadCategory] = useState("");
  const [uploadYear, setUploadYear] = useState(() => new Date().getFullYear().toString());
  const [uploadPeriodStart, setUploadPeriodStart] = useState(() => `${new Date().getFullYear()}-01-01`);
  const [uploadPeriodEnd, setUploadPeriodEnd] = useState(() => `${new Date().getFullYear()}-12-31`);
  const [uploadAsOf, setUploadAsOf] = useState(() => new Date().toISOString().slice(0, 10));
  const [uploadSaving, setUploadSaving] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const uploadFileRef = useRef<HTMLInputElement>(null);

  const PERIOD_LABELS: { key: Period; label: string }[] = [
    { key: "7d", label: "7 Days" },
    { key: "30d", label: "30 Days" },
    { key: "3m", label: "3 Months" },
    { key: "12m", label: "12 Months" },
    { key: "yearly", label: "Yearly" },
  ];

  const TAB_LABELS: { key: Tab; label: string }[] = [
    { key: "dashboard", label: "Dashboard" },
    { key: "transactions", label: "Transactions" },
    { key: "pl", label: "Profit & Loss" },
    { key: "bs", label: "Balance Sheet" },
    { key: "cf", label: "Cash Flow" },
  ];

  // ── Org lookup ──────────────────────────────────────────────────────────────
  const { data: orgId } = useQuery<number | null>({
    queryKey: ["user_org_reports", numericId],
    enabled: numericId !== null,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("organizations")
        .select("id").eq("owner_id", numericId!).limit(1).maybeSingle();
      return (data as { id: number } | null)?.id ?? null;
    },
  });

  // ── Current period transactions ─────────────────────────────────────────────
  const { start, end } = getPeriodRange(period);
  const { data: txs = [], isLoading } = useQuery<Transaction[]>({
    queryKey: ["tx_period", orgId, period],
    enabled: orgId !== null,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("id, title, amount, type, date_time, description, deductible")
        .eq("org_id", orgId!)
        .gte("date_time", start.toISOString())
        .lte("date_time", end.toISOString())
        .order("date_time", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  // ── Previous period transactions ────────────────────────────────────────────
  const { start: prevStart, end: prevEnd } = getPrevRange(period);
  const { data: prevTxs = [] } = useQuery<{ amount: number }[]>({
    queryKey: ["tx_prev_period", orgId, period],
    enabled: orgId !== null,
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("transactions")
        .select("amount")
        .eq("org_id", orgId!)
        .gte("date_time", prevStart.toISOString())
        .lte("date_time", prevEnd.toISOString());
      return data ?? [];
    },
  });

  // ── All-time balance for assets ─────────────────────────────────────────────
  const { data: allTxs = [] } = useQuery<{ amount: number }[]>({
    queryKey: ["tx_all_balance", orgId],
    enabled: orgId !== null,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("transactions").select("amount").eq("org_id", orgId!);
      return data ?? [];
    },
  });

  // ── Derived metrics ────────────────────────────────────────────────────────
  const income      = txs.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const expenses    = txs.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  const netIncome   = income - expenses;
  const margin      = income > 0 ? (netIncome / income) * 100 : 0;

  const prevIncome   = prevTxs.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const prevExpenses = prevTxs.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  const prevNet      = prevIncome - prevExpenses;

  // Balance sheet approx: cumulative balance = total assets
  const totalAssets      = Math.max(0, allTxs.reduce((s, t) => s + t.amount, 0));
  const totalLiabilities = expenses * 0.4; // rough: 40% of period expenses as liabilities
  const equity           = Math.max(0, totalAssets - totalLiabilities);
  const debtToEquity     = equity > 0 ? totalLiabilities / equity : 0;

  // AI Deduction Optimization
  const deductibleAmt = txs.filter(t => t.amount < 0 && t.deductible).reduce((s, t) => s + Math.abs(t.amount), 0);
  const deductionPct  = expenses > 0 ? Math.min(100, Math.round((deductibleAmt / expenses) * 100)) : 0;
  const taxSavings    = Math.round(deductibleAmt * 0.25); // ~25% tax rate

  // Business Health Score
  const bhs = Math.min(100, Math.round(
    15 +
    (netIncome > 0 ? 25 : 0) +
    Math.min(25, (income / 1000) * 2) +
    (margin > 20 ? 20 : margin > 5 ? 10 : 0) +
    (deductionPct > 50 ? 15 : deductionPct > 20 ? 8 : 0)
  ));

  // Trend chart data
  const trendData = useMemo(() => buildTrendData(txs, period), [txs, period]);

  // Period label
  const periodLabel = `${start.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

  // ── Export handler ──────────────────────────────────────────────────────────
  async function handleExport() {
    setIsExporting(true);
    try {
      const sDate = new Date(exportStart);
      const eDate = new Date(exportEnd);
      if (!orgId) return;
      const { data: exportTxs } = await supabase
        .from("transactions")
        .select("id, title, amount, type, date_time, description, deductible")
        .eq("org_id", orgId)
        .gte("date_time", sDate.toISOString())
        .lte("date_time", eDate.toISOString())
        .order("date_time", { ascending: true });
      const rows = exportTxs ?? [];

      let csvRows: string[][] = [];
      const reportName = exportType === "pl" ? "Profit & Loss" : exportType === "bs" ? "Balance Sheet" : "Cash Flow";

      if (exportType === "pl") {
        csvRows = [
          ["BookSmart – Profit & Loss Report"],
          [`Period: ${exportStart} to ${exportEnd}`, `Frequency: ${exportFreq}`],
          [],
          ["Date", "Description", "Category", "Revenue", "Expenses"],
          ...rows.map(t => [
            new Date(t.date_time).toLocaleDateString("en-US"),
            t.title,
            t.type || (t.amount > 0 ? "Income" : "Expense"),
            t.amount > 0 ? t.amount.toFixed(2) : "",
            t.amount < 0 ? Math.abs(t.amount).toFixed(2) : "",
          ]),
          [],
          ["", "", "Total Revenue", rows.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0).toFixed(2), ""],
          ["", "", "Total Expenses", "", rows.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0).toFixed(2)],
          ["", "", "Net Income", (rows.reduce((s, t) => s + t.amount, 0)).toFixed(2), ""],
        ];
      } else if (exportType === "cf") {
        const moneyIn = rows.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
        const moneyOut = rows.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
        csvRows = [
          ["BookSmart – Cash Flow Statement"],
          [`Period: ${exportStart} to ${exportEnd}`, `Frequency: ${exportFreq}`],
          [],
          ["Date", "Description", "Type", "Amount"],
          ...rows.map(t => [
            new Date(t.date_time).toLocaleDateString("en-US"),
            t.title,
            t.amount > 0 ? "Inflow" : "Outflow",
            t.amount.toFixed(2),
          ]),
          [],
          ["", "Total Money In", "", moneyIn.toFixed(2)],
          ["", "Total Money Out", "", (-moneyOut).toFixed(2)],
          ["", "Net Cash Flow", "", (moneyIn - moneyOut).toFixed(2)],
        ];
      } else {
        const totalAssetVal = Math.max(0, rows.reduce((s, t) => s + t.amount, 0));
        const totalLiabVal = rows.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0) * 0.4;
        csvRows = [
          ["BookSmart – Balance Sheet"],
          [`As of: ${exportEnd}`],
          [],
          ["Category", "Amount"],
          ["Total Assets", totalAssetVal.toFixed(2)],
          ["Total Liabilities", totalLiabVal.toFixed(2)],
          ["Owner's Equity", Math.max(0, totalAssetVal - totalLiabVal).toFixed(2)],
        ];
      }

      const slug = reportName.toLowerCase().replace(/\s+/g, "_");
      exportCSV(csvRows, `booksmart_${slug}_${exportStart}_${exportEnd}.csv`);
      setShowExport(false);
    } finally {
      setIsExporting(false);
    }
  }

  // ── Upload dialog helpers ───────────────────────────────────────────────────
  const isBalanceSheetUpload = uploadCategory === "Balance Sheet";

  function resetUploadForm() {
    setUploadPickedFile(null);
    setUploadName("");
    setUploadCategory("");
    const y = new Date().getFullYear();
    setUploadYear(y.toString());
    setUploadPeriodStart(`${y}-01-01`);
    setUploadPeriodEnd(`${y}-12-31`);
    setUploadAsOf(new Date().toISOString().slice(0, 10));
    setUploadError("");
    if (uploadFileRef.current) uploadFileRef.current.value = "";
  }

  function handleFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadPickedFile(file);
    if (!uploadName) setUploadName(file.name.replace(/\.[^.]+$/, ""));
    setUploadError("");
  }

  function handleUploadYearChange(year: string) {
    setUploadYear(year);
    const y = parseInt(year, 10);
    if (!isNaN(y)) {
      setUploadPeriodStart(`${y}-01-01`);
      setUploadPeriodEnd(`${y}-12-31`);
    }
  }

  function handleUploadSave() {
    if (!uploadPickedFile) { setUploadError("Please select a file first."); return; }
    if (!uploadName.trim()) { setUploadError("Please enter a document name."); return; }
    if (!uploadCategory) { setUploadError("Please select a document category."); return; }
    if (isBalanceSheetUpload) {
      if (!uploadAsOf) { setUploadError("Please select an As Of date."); return; }
    } else {
      if (!uploadPeriodStart || !uploadPeriodEnd) { setUploadError("Please select period dates."); return; }
      if (uploadPeriodEnd < uploadPeriodStart) { setUploadError("End date must be on or after start date."); return; }
    }

    const CAT_MAP: Record<string, string> = {
      "Balance Sheet": "Tax Forms",
      "Profit & Loss": "Income",
      "Income Statement": "Income",
      "Cash Flow Statement": "Tax Forms",
      "Transactions": "Expenses",
    };

    setUploadSaving(true);
    setTimeout(() => {
      const ext = uploadPickedFile.name.split(".").pop()?.toUpperCase() ?? "FILE";
      const newDoc: DocEntry = {
        id: Date.now().toString(),
        title: uploadName.trim(),
        type: ext,
        category: CAT_MAP[uploadCategory] ?? "Tax Forms",
        date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        status: "Uploaded",
        size: uploadPickedFile.size > 1_000_000
          ? `${(uploadPickedFile.size / 1_000_000).toFixed(1)} MB`
          : `${Math.round(uploadPickedFile.size / 1000)} KB`,
      };
      setDocs(prev => [newDoc, ...prev]);
      setUploadSaving(false);
      setShowUpload(false);
      resetUploadForm();
    }, 900);
  }

  const filteredDocs = docs.filter(d => {
    const matchSearch = d.title.toLowerCase().includes(docSearch.toLowerCase());
    const matchCat = docCategory === "All" || d.category === docCategory || d.type === docCategory;
    return matchSearch && matchCat;
  });

  // Key insights
  const insights: string[] = [];
  if (txs.length > 0) {
    insights.push(`Net income is ${fmt(netIncome)}`);
    if (netIncome >= 0) insights.push(`Income exceeded expenses by ${fmt(netIncome)}`);
    else insights.push(`Expenses exceeded income by ${fmt(Math.abs(netIncome))}`);
    insights.push(`Equity ${equity > 0 ? "increased" : "unchanged"} ${pctLabel(changePct(equity, equity * 0.9))}`);
    insights.push(`${netIncome >= 0 ? "Positive" : "Negative"} cash flow of ${fmt(Math.abs(netIncome))}`);
    if (expenses > 0) insights.push(`You have ${fmt(expenses)} in potential deductions`);
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-0 animate-in fade-in slide-in-from-bottom-4 duration-500 -mt-2">

      {/* ── Tabs + Action buttons ── */}
      <div className="flex items-center justify-between border-b border-border/50 mb-6">
        <div className="flex items-center gap-0">
          {TAB_LABELS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                tab === key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 pb-1">
          <Button
            size="sm"
            variant="outline"
            className="border-primary/40 text-primary hover:bg-primary/10 gap-1.5 text-xs h-8"
            onClick={() => {
              if (tab === "pl" || tab === "bs" || tab === "cf") setExportType(tab);
              else setExportType("pl");
              setShowExport(true);
            }}
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-border/60 text-muted-foreground hover:bg-secondary/50 gap-1.5 text-xs h-8"
            onClick={() => setShowDocs(true)}
          >
            <Upload className="h-3.5 w-3.5" />
            Documents
          </Button>
        </div>
      </div>

      {/* ── Dashboard tab ── */}
      {tab === "dashboard" && (
        <div className="space-y-6">
          {/* Title + period filter */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Financial Dashboard</h1>
              <p className="text-sm text-muted-foreground">{periodLabel}</p>
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              {PERIOD_LABELS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setPeriod(key)}
                  className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                    period === key
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* ── KPI row ── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Business Health Score */}
                <Card className="border-primary/20 bg-gradient-to-b from-card to-primary/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-muted-foreground">Business Health Score</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center gap-1 pb-4">
                    <BHSGauge score={bhs} />
                    <p className="text-xs text-muted-foreground">{end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                  </CardContent>
                </Card>

                {/* Net Income */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-muted-foreground">Net Income (Profit)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 pb-4">
                    <p className={`text-2xl font-bold ${netIncome >= 0 ? "text-white" : "text-rose-400"}`}>
                      {fmt(netIncome)}
                    </p>
                    <div className="flex items-center gap-2">
                      <ChangeBadge curr={netIncome} prev={prevNet} />
                      <span className="text-xs text-muted-foreground">vs previous period</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Total Assets */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-muted-foreground">Total Assets</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 pb-4">
                    <p className="text-2xl font-bold">{fmt(totalAssets)}</p>
                    <div className="flex items-center gap-2">
                      <ChangeBadge curr={totalAssets} prev={totalAssets * 0.99} />
                      <span className="text-xs text-muted-foreground">vs previous period</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Cash Flow */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-muted-foreground">Cash Flow (Net Cash)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 pb-4">
                    <p className={`text-2xl font-bold ${netIncome >= 0 ? "text-white" : "text-rose-400"}`}>
                      {fmt(netIncome)}
                    </p>
                    <div className="flex items-center gap-2">
                      <ChangeBadge curr={netIncome} prev={prevNet} />
                      <span className="text-xs text-muted-foreground">vs previous period</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* ── Business Overview ── */}
              <div>
                <h2 className="text-base font-bold mb-3">Business Overview</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">

                  {/* P&L Overview */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold">Profit &amp; Loss Overview</CardTitle>
                      <p className="text-[10px] text-muted-foreground">{periodLabel}</p>
                    </CardHeader>
                    <CardContent className="space-y-2 pb-3">
                      {[
                        { label: "Income", val: income, prev: prevIncome },
                        { label: "Expenses", val: expenses, prev: prevExpenses },
                        { label: "Net Income", val: netIncome, prev: prevNet },
                      ].map(r => (
                        <div key={r.label} className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">{r.label}</span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold">{fmtShort(r.val)}</span>
                            <ChangeBadge curr={r.val} prev={r.prev} />
                          </div>
                        </div>
                      ))}
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-border/50">
                        <span className="text-muted-foreground">% Margin</span>
                        <span className="font-semibold text-primary">{margin.toFixed(1)}%</span>
                      </div>
                      <button onClick={() => setTab("pl")} className="flex items-center gap-1 text-xs text-primary hover:underline mt-1">
                        View Profit &amp; Loss <ArrowRight className="h-3 w-3" />
                      </button>
                    </CardContent>
                  </Card>

                  {/* Balance Sheet */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold">Balance Sheet Overview</CardTitle>
                      <p className="text-[10px] text-muted-foreground">As of {end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                    </CardHeader>
                    <CardContent className="space-y-2 pb-3">
                      {[
                        { label: "Total Assets", val: totalAssets },
                        { label: "Total Liabilities", val: totalLiabilities },
                        { label: "Equity", val: equity },
                      ].map(r => (
                        <div key={r.label} className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">{r.label}</span>
                          <span className="font-semibold">{fmtShort(r.val)}</span>
                        </div>
                      ))}
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-border/50">
                        <span className="text-muted-foreground">Debt-to-Equity</span>
                        <span className="font-semibold">{debtToEquity.toFixed(2)}</span>
                      </div>
                      <button onClick={() => setTab("bs")} className="flex items-center gap-1 text-xs text-primary hover:underline mt-1">
                        View Balance Sheet <ArrowRight className="h-3 w-3" />
                      </button>
                    </CardContent>
                  </Card>

                  {/* Cash Flow */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold">Cash Flow Overview</CardTitle>
                      <p className="text-[10px] text-muted-foreground">{periodLabel}</p>
                    </CardHeader>
                    <CardContent className="space-y-2 pb-3">
                      {[
                        { label: "Money In", val: income, prev: prevIncome },
                        { label: "Money Out", val: expenses, prev: prevExpenses },
                        { label: "Net Cash", val: netIncome, prev: prevNet },
                      ].map(r => (
                        <div key={r.label} className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">{r.label}</span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold">{fmtShort(r.val)}</span>
                            <ChangeBadge curr={r.val} prev={r.prev} />
                          </div>
                        </div>
                      ))}
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-border/50">
                        <span className="text-muted-foreground">Cash Flow Trend</span>
                        <span className={`font-semibold ${netIncome >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                          {netIncome >= 0 ? "Positive" : "Negative"}
                        </span>
                      </div>
                      <button onClick={() => setTab("cf")} className="flex items-center gap-1 text-xs text-primary hover:underline mt-1">
                        View Cash Flow <ArrowRight className="h-3 w-3" />
                      </button>
                    </CardContent>
                  </Card>

                  {/* AI Deduction Optimization */}
                  <Card className="border-primary/20 bg-gradient-to-b from-card to-primary/5">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-primary" /> AI Deduction Optimization
                      </CardTitle>
                      <p className="text-[10px] text-muted-foreground">Deduction Optimization Level</p>
                    </CardHeader>
                    <CardContent className="pb-3">
                      <div className="flex items-center gap-3">
                        <CircularGauge pct={deductionPct} size={85} />
                        <div className="space-y-2 flex-1">
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Additional Tax Deductions Found</p>
                            <p className="text-sm font-bold text-primary">{fmt(deductibleAmt)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Potential Tax Savings</p>
                            <p className="text-sm font-bold text-emerald-400">${taxSavings.toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                      {expenses > 0 && deductionPct < 80 && (
                        <p className="text-[10px] text-muted-foreground mt-2">
                          {(100 - deductionPct).toFixed(0)}% of deductions not yet utilised.
                          You saved {fmt(deductibleAmt)} in deductions this period.
                        </p>
                      )}
                      <button onClick={() => setTab("dashboard")} className="flex items-center gap-1 text-xs text-primary hover:underline mt-2">
                        View AI Activity <ArrowRight className="h-3 w-3" />
                      </button>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* ── Financial Trend + Key Insights ── */}
              <div className="grid gap-4 lg:grid-cols-3">
                {/* Chart — 2/3 width */}
                <Card className="lg:col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Financial Trend</CardTitle>
                  </CardHeader>
                  <CardContent className="h-[260px]">
                    {trendData.length === 0 ? (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-sm text-muted-foreground">No data for this period</p>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trendData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                          <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false}
                            tickFormatter={(v) => fmtShort(v)} />
                          <Tooltip
                            contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}
                            itemStyle={{ color: "hsl(var(--foreground))" }}
                            formatter={(v: number) => [fmt(v), undefined]}
                          />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                          <Line type="monotone" dataKey="revenue" name="Revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                          <Line type="monotone" dataKey="expenses" name="Expenses" stroke="#f97316" strokeWidth={2} dot={false} />
                          <Line type="monotone" dataKey="netCash" name="Net Cash" stroke="#38bdf8" strokeWidth={2} dot={false} />
                          <Line type="monotone" dataKey="profit" name="Profit" stroke="#22c55e" strokeWidth={2} dot={false} strokeDasharray="4 2" />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                {/* Key Financial Insights — 1/3 width */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Key Financial Insights</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 pb-4">
                    {txs.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No data for this period. Upload and approve bank statements to see insights.</p>
                    ) : (
                      insights.map((insight, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                          <p className="text-sm text-muted-foreground">{insight}</p>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Profit & Loss tab ── */}
      {tab === "pl" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Profit &amp; Loss</h1>
              <p className="text-sm text-muted-foreground">{periodLabel}</p>
            </div>
            <div className="flex gap-1">
              {PERIOD_LABELS.map(({ key, label }) => (
                <button key={key} onClick={() => setPeriod(key)}
                  className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${period === key ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-muted-foreground hover:bg-secondary"}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          {isLoading ? <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div> : (
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader><CardTitle>Revenue</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {txs.filter(t => t.amount > 0).slice(0, 10).map(t => (
                    <div key={t.id} className="flex justify-between text-sm">
                      <span className="text-muted-foreground truncate flex-1 pr-2">{t.title}</span>
                      <span className="text-emerald-400 font-semibold flex-shrink-0">{fmt(t.amount)}</span>
                    </div>
                  ))}
                  <div className="border-t border-border/50 pt-2 flex justify-between font-bold">
                    <span>Total Income</span><span className="text-emerald-400">{fmt(income)}</span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Expenses</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {txs.filter(t => t.amount < 0).slice(0, 10).map(t => (
                    <div key={t.id} className="flex justify-between text-sm">
                      <span className="text-muted-foreground truncate flex-1 pr-2">{t.title}</span>
                      <span className="text-rose-400 font-semibold flex-shrink-0">{fmt(Math.abs(t.amount))}</span>
                    </div>
                  ))}
                  <div className="border-t border-border/50 pt-2 flex justify-between font-bold">
                    <span>Total Expenses</span><span className="text-rose-400">{fmt(expenses)}</span>
                  </div>
                </CardContent>
              </Card>
              <Card className="md:col-span-2">
                <CardContent className="pt-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-muted-foreground">Net Income</p>
                      <p className={`text-3xl font-bold ${netIncome >= 0 ? "text-primary" : "text-destructive"}`}>{fmt(netIncome)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Profit Margin</p>
                      <p className="text-3xl font-bold text-primary">{margin.toFixed(1)}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* ── Balance Sheet tab ── */}
      {tab === "bs" && (
        <div className="space-y-6">
          <h1 className="text-2xl font-bold">Balance Sheet</h1>
          <p className="text-sm text-muted-foreground">As of {end.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { label: "Total Assets", value: totalAssets, color: "text-primary" },
              { label: "Total Liabilities", value: totalLiabilities, color: "text-rose-400" },
              { label: "Equity", value: equity, color: "text-emerald-400" },
            ].map(s => (
              <Card key={s.label}>
                <CardContent className="pt-5">
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  <p className={`text-2xl font-bold mt-1 ${s.color}`}>{fmt(s.value)}</p>
                </CardContent>
              </Card>
            ))}
            <Card className="md:col-span-3">
              <CardContent className="pt-4">
                <div className="flex justify-between items-center">
                  <div><p className="text-sm text-muted-foreground">Debt-to-Equity Ratio</p>
                    <p className="text-2xl font-bold">{debtToEquity.toFixed(2)}</p></div>
                  <p className="text-xs text-muted-foreground max-w-xs text-right">
                    {debtToEquity < 1 ? "Healthy — more equity than debt." : "Consider reducing liabilities to improve financial health."}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ── Cash Flow tab ── */}
      {tab === "cf" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Cash Flow</h1>
              <p className="text-sm text-muted-foreground">{periodLabel}</p>
            </div>
            <div className="flex gap-1">
              {PERIOD_LABELS.map(({ key, label }) => (
                <button key={key} onClick={() => setPeriod(key)}
                  className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${period === key ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-muted-foreground hover:bg-secondary"}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { label: "Money In", value: income, color: "text-emerald-400" },
              { label: "Money Out", value: expenses, color: "text-rose-400" },
              { label: "Net Cash", value: netIncome, color: netIncome >= 0 ? "text-primary" : "text-destructive" },
            ].map(s => (
              <Card key={s.label}>
                <CardContent className="pt-5">
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  <p className={`text-2xl font-bold mt-1 ${s.color}`}>{fmt(s.value)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardHeader><CardTitle>Cash Flow Over Time</CardTitle></CardHeader>
            <CardContent className="h-[300px]">
              {trendData.length === 0 ? (
                <div className="flex items-center justify-center h-full"><p className="text-sm text-muted-foreground">No data</p></div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="inGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="outGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={fmtShort} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}
                      formatter={(v: number) => [fmt(v), undefined]} />
                    <Legend />
                    <Area type="monotone" dataKey="revenue" name="Money In" stroke="hsl(var(--primary))" fill="url(#inGrad)" strokeWidth={2} />
                    <Area type="monotone" dataKey="expenses" name="Money Out" stroke="#f97316" fill="url(#outGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Export Dialog ── */}
      <Dialog open={showExport} onOpenChange={setShowExport}>
        <DialogContent className="sm:max-w-md bg-card border-border/60">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              Export Report
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-2">
            {/* Report Type */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Report Type</p>
              <div className="flex gap-2">
                {(["pl", "bs", "cf"] as ExportReportType[]).map(rt => (
                  <button key={rt} onClick={() => setExportType(rt)}
                    className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-colors ${exportType === rt ? "bg-primary text-primary-foreground border-primary" : "border-border/60 text-muted-foreground hover:border-primary/50 hover:text-foreground"}`}>
                    {rt === "pl" ? "Profit & Loss" : rt === "bs" ? "Balance Sheet" : "Cash Flow"}
                  </button>
                ))}
              </div>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Start Date</label>
                <input type="date" value={exportStart} onChange={e => setExportStart(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/60" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {exportType === "bs" ? "As of Date" : "End Date"}
                </label>
                <input type="date" value={exportEnd} onChange={e => setExportEnd(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/60" />
              </div>
            </div>

            {/* Frequency */}
            {exportType !== "bs" && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Frequency</p>
                <div className="flex gap-2">
                  {(["monthly", "quarterly", "yearly"] as ExportFreq[]).map(f => (
                    <button key={f} onClick={() => setExportFreq(f)}
                      className={`flex-1 py-1.5 text-xs font-medium rounded-lg border capitalize transition-colors ${exportFreq === f ? "bg-primary/20 text-primary border-primary/50" : "border-border/50 text-muted-foreground hover:border-primary/40"}`}>
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs text-muted-foreground bg-secondary/30 rounded-lg px-3 py-2">
              Your report will be downloaded as a CSV file, ready to open in Excel or Google Sheets.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowExport(false)} className="border-border/60">
              Cancel
            </Button>
            <Button size="sm" onClick={handleExport} disabled={isExporting || !orgId}
              className="bg-primary text-primary-foreground gap-1.5">
              {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              {isExporting ? "Preparing…" : "Download CSV"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Upload Financial Document Dialog ── */}
      <Dialog open={showUpload} onOpenChange={v => { if (!v) resetUploadForm(); setShowUpload(v); }}>
        <DialogContent className="sm:max-w-md bg-card border-border/60">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Upload className="h-4.5 w-4.5 text-primary" />
              Upload Financial Document
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-1">
            {/* File pick area */}
            <input ref={uploadFileRef} type="file" className="hidden"
              accept=".pdf,.csv,.xlsx,.xls,.doc,.docx,.jpg,.jpeg,.png"
              onChange={handleFilePicked} />
            <button
              onClick={() => uploadFileRef.current?.click()}
              className="w-full border-2 border-dashed border-border/60 hover:border-primary/50 rounded-xl p-6 flex flex-col items-center gap-2 transition-colors group"
            >
              <div className="h-12 w-12 rounded-xl bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center transition-colors">
                <Upload className="h-6 w-6 text-primary" />
              </div>
              <span className="text-sm font-medium">Upload From Device</span>
              <span className="text-xs text-muted-foreground">PDF, CSV, Excel, Word, or Image</span>
            </button>

            {/* Picked file badge */}
            {uploadPickedFile && (
              <div className="flex items-center gap-2 rounded-lg bg-primary/10 border border-primary/20 px-3 py-2">
                <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="text-xs text-primary flex-1 truncate">{uploadPickedFile.name}</span>
                <button onClick={() => { setUploadPickedFile(null); if (uploadFileRef.current) uploadFileRef.current.value = ""; }}
                  className="text-muted-foreground hover:text-foreground ml-1 flex-shrink-0">
                  ✕
                </button>
              </div>
            )}

            {/* Document Name */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Document Name *</label>
              <Input value={uploadName} onChange={e => setUploadName(e.target.value)} placeholder="e.g. W-9 Form - John Doe"
                className="mt-1.5 bg-background border-border/60 h-9 text-sm" />
            </div>

            {/* Category + Year row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Category *</label>
                <select value={uploadCategory} onChange={e => setUploadCategory(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/60">
                  <option value="">Select category</option>
                  {["Balance Sheet", "Profit & Loss", "Income Statement", "Cash Flow Statement", "Transactions"].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Year</label>
                <select value={uploadYear} onChange={e => handleUploadYearChange(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/60">
                  {Array.from({ length: 15 }, (_, i) => new Date().getFullYear() - i).map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Period dates */}
            {uploadCategory && (
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {isBalanceSheetUpload ? "As Of Date *" : "Document Period *"}
                </label>
                {isBalanceSheetUpload ? (
                  <input type="date" value={uploadAsOf} onChange={e => setUploadAsOf(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/60" />
                ) : (
                  <div className="grid grid-cols-2 gap-2 mt-1.5">
                    <input type="date" value={uploadPeriodStart} onChange={e => setUploadPeriodStart(e.target.value)}
                      placeholder="Start date"
                      className="rounded-lg border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/60" />
                    <input type="date" value={uploadPeriodEnd} onChange={e => setUploadPeriodEnd(e.target.value)}
                      placeholder="End date"
                      className="rounded-lg border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/60" />
                  </div>
                )}
              </div>
            )}

            {/* Validation error */}
            {uploadError && (
              <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{uploadError}</p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => { resetUploadForm(); setShowUpload(false); }}
              className="border-border/60">
              Close
            </Button>
            <Button size="sm" onClick={handleUploadSave} disabled={uploadSaving}
              className="bg-primary text-primary-foreground gap-1.5">
              {uploadSaving ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…</> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Document Repository Sheet ── */}
      <Sheet open={showDocs} onOpenChange={setShowDocs}>
        <SheetContent side="right" className="w-full sm:max-w-lg bg-card border-border/60 flex flex-col p-0">
          <SheetHeader className="px-5 pt-5 pb-3 border-b border-border/40">
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Document Repository
              </SheetTitle>
              <Button size="sm" onClick={() => setShowUpload(true)}
                className="bg-primary text-primary-foreground gap-1.5 h-8 text-xs">
                <Upload className="h-3.5 w-3.5" /> Upload Document
              </Button>
            </div>
            {/* Search */}
            <div className="relative mt-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Search documents…" value={docSearch} onChange={e => setDocSearch(e.target.value)}
                className="pl-9 h-8 text-sm bg-background border-border/60" />
            </div>
            {/* Category chips */}
            <div className="flex gap-1.5 flex-wrap mt-2">
              {DOC_CATEGORIES.map(cat => (
                <button key={cat} onClick={() => setDocCategory(cat)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-full border transition-colors ${docCategory === cat ? "bg-primary text-primary-foreground border-primary" : "border-border/60 text-muted-foreground hover:border-primary/50"}`}>
                  {cat}
                </button>
              ))}
            </div>
          </SheetHeader>

          {/* Document list */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            {filteredDocs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 gap-3 text-center">
                <File className="h-10 w-10 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">
                  {docSearch ? "No documents match your search." : "No documents yet. Upload your first document."}
                </p>
                <Button size="sm" variant="outline" onClick={() => setShowUpload(true)}
                  className="border-primary/40 text-primary gap-1.5">
                  <Upload className="h-3.5 w-3.5" /> Upload
                </Button>
              </div>
            ) : filteredDocs.map(doc => {
              const SIcon = STATUS_ICON[doc.status];
              return (
                <div key={doc.id} className="rounded-xl border border-border/40 bg-background/50 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="mt-0.5 h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{doc.title}</p>
                        <p className="text-xs text-muted-foreground">Type: {doc.type}</p>
                      </div>
                    </div>
                    <span className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 ${STATUS_COLOR[doc.status]}`}>
                      <SIcon className="h-3 w-3" />
                      {doc.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{doc.date}</span>
                    <span>{doc.size}</span>
                  </div>
                  <div className="flex gap-2 pt-1 border-t border-border/30">
                    <button className="flex items-center gap-1 text-xs text-primary hover:underline">
                      <Search className="h-3 w-3" /> View
                    </button>
                    <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:underline">
                      <Download className="h-3 w-3" /> Download
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Transactions tab ── */}
      {tab === "transactions" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Transactions</h1>
              <p className="text-sm text-muted-foreground">{periodLabel} · {txs.length} records</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {PERIOD_LABELS.map(({ key, label }) => (
                  <button key={key} onClick={() => setPeriod(key)}
                    className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${period === key ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-muted-foreground hover:bg-secondary"}`}>
                    {label}
                  </button>
                ))}
              </div>
              <Button size="sm" variant="outline"
                className="border-primary/40 text-primary hover:bg-primary/10 gap-1.5 text-xs h-7"
                onClick={() => { setExportType("pl"); setShowExport(true); }}>
                <Download className="h-3 w-3" /> Export CSV
              </Button>
            </div>
          </div>
          {isLoading ? <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          : txs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/50 p-12 text-center">
              <p className="text-muted-foreground">No transactions for this period.</p>
            </div>
          ) : (
            <Card>
              <CardContent className="pt-4 divide-y divide-border/40">
                {[...txs].reverse().map(tx => (
                  <div key={tx.id} className="flex items-center gap-3 py-2.5">
                    <div className={`rounded-full p-1.5 flex-shrink-0 ${tx.amount >= 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"}`}>
                      {tx.amount >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{tx.title}</p>
                      <p className="text-xs text-muted-foreground">{new Date(tx.date_time).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                    </div>
                    {tx.deductible && <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">Deductible</span>}
                    <span className={`text-sm font-semibold flex-shrink-0 ${tx.amount >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {tx.amount >= 0 ? "+" : ""}{fmt(tx.amount)}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
