import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar,
} from "recharts";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Transaction = {
  id: number;
  title: string;
  amount: number;
  type: string;
  date_time: string;
  description: string;
  deductible: boolean;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2, CURRENT_YEAR - 3]
  .map(String);

function formatMoney(v: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
}

function pct(value: number, total: number) {
  if (total === 0) return 0;
  return Math.min(100, Math.max(0, Math.round((value / total) * 100 * 10) / 10));
}

/** Group expenses by their title (first meaningful token), return top 6 */
function buildCategoryData(txs: Transaction[]) {
  const map = new Map<string, number>();
  for (const tx of txs) {
    if (tx.amount >= 0) continue;
    // Use the type field if it's a real category, otherwise use title (truncated)
    const raw = tx.type && tx.type !== "expense" && tx.type !== "income"
      ? tx.type
      : tx.title;
    const label = raw.length > 18 ? raw.slice(0, 17) + "…" : raw;
    map.set(label, (map.get(label) ?? 0) + Math.abs(tx.amount));
  }
  return Array.from(map.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6)
    .map(([name, amount]) => ({ name, amount: Math.round(amount) }));
}

/** Export transactions as a CSV file download */
function exportCSV(txs: Transaction[], year: string) {
  const header = "Date,Title,Type,Amount,Deductible,Description";
  const rows = txs.map((t) =>
    [
      t.date_time.split("T")[0],
      `"${t.title.replace(/"/g, '""')}"`,
      t.type,
      t.amount.toFixed(2),
      t.deductible ? "Yes" : "No",
      `"${(t.description ?? "").replace(/"/g, '""')}"`,
    ].join(",")
  );
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `booksmart-transactions-${year}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Reports() {
  const { profile } = useAuth();
  const numericId = profile?.numericId ?? null;
  const [year, setYear] = useState(String(CURRENT_YEAR));

  // ── Org lookup ──────────────────────────────────────────────────────────────
  const { data: orgId } = useQuery<number | null>({
    queryKey: ["user_org_reports", numericId],
    enabled: numericId !== null,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("organizations")
        .select("id")
        .eq("owner_id", numericId!)
        .limit(1)
        .maybeSingle();
      return (data as { id: number } | null)?.id ?? null;
    },
  });

  // ── All transactions for selected year ─────────────────────────────────────
  const { data: yearTxs = [], isLoading } = useQuery<Transaction[]>({
    queryKey: ["tx_year", orgId, year],
    enabled: orgId !== null,
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("id, title, amount, type, date_time, description, deductible")
        .eq("org_id", orgId!)
        .gte("date_time", `${year}-01-01T00:00:00`)
        .lte("date_time", `${year}-12-31T23:59:59`)
        .order("date_time", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  // ── Derived data ───────────────────────────────────────────────────────────
  const monthlyData = useMemo(() =>
    MONTHS.map((month, i) => {
      const mTxs = yearTxs.filter((t) => new Date(t.date_time).getMonth() === i);
      const income = mTxs.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
      const expenses = mTxs.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
      return { month, income: Math.round(income), expenses: Math.round(expenses) };
    }),
    [yearTxs]
  );

  const categoryData = useMemo(() => buildCategoryData(yearTxs), [yearTxs]);

  const totalIncome = yearTxs.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const totalExpenses = yearTxs.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  const netProfit = totalIncome - totalExpenses;

  const profitMarginPct   = pct(netProfit, totalIncome);
  const operatingRatioPct = pct(totalExpenses, totalIncome);
  // Self-employment tax estimate: ~25% effective rate on net profit
  const taxLiabilityPct  = pct(netProfit * 0.25, totalIncome);

  const hasData = yearTxs.length > 0;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Financial Reports</h1>
          <p className="text-muted-foreground">Deep dive into your revenue and expenses.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {YEAR_OPTIONS.map((y) => (
                <SelectItem key={y} value={y}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => exportCSV(yearTxs, year)}
            disabled={!hasData}
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* No data state */}
      {!isLoading && !hasData && (
        <div className="rounded-xl border border-dashed border-border/50 bg-secondary/10 p-12 text-center space-y-2">
          <p className="text-lg font-semibold">No transactions for {year}</p>
          <p className="text-sm text-muted-foreground">
            Upload and approve bank statements to see your financial reports.
          </p>
        </div>
      )}

      {/* Summary stat row */}
      {!isLoading && hasData && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Income", value: formatMoney(totalIncome), color: "text-emerald-400" },
            { label: "Total Expenses", value: formatMoney(totalExpenses), color: "text-rose-400" },
            { label: "Net Profit", value: formatMoney(netProfit), color: netProfit >= 0 ? "text-primary" : "text-destructive" },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">{s.label}</p>
                <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground">{year} full year</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && hasData && (
        <div className="grid gap-6 md:grid-cols-2">

          {/* Income Statement Overview — full width */}
          <Card className="col-span-2">
            <CardHeader>
              <CardTitle>Income Statement Overview</CardTitle>
              <CardDescription>Monthly breakdown of income vs expenses for {year}</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v.toLocaleString()}`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}
                    itemStyle={{ color: "hsl(var(--foreground))" }}
                    formatter={(value: number) => [`$${value.toLocaleString()}`, undefined]}
                  />
                  <Area type="monotone" dataKey="income" name="Income" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorIncome)" />
                  <Area type="monotone" dataKey="expenses" name="Expenses" stroke="hsl(var(--destructive))" fillOpacity={1} fill="url(#colorExpense)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Expense Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Expense Breakdown</CardTitle>
              <CardDescription>
                {categoryData.length > 0
                  ? `Top ${categoryData.length} spending categories in ${year}`
                  : `No expense data for ${year}`}
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              {categoryData.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm text-muted-foreground">No expenses recorded</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData} layout="vertical" margin={{ top: 0, right: 16, left: 24, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal vertical={false} stroke="hsl(var(--border))" />
                    <XAxis type="number" hide tickFormatter={(v) => `$${v}`} />
                    <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} width={80} />
                    <Tooltip
                      cursor={{ fill: "transparent" }}
                      contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}
                      formatter={(value: number) => [`$${value.toLocaleString()}`, "Expenses"]}
                    />
                    <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Key Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Key Metrics</CardTitle>
              <CardDescription>Performance indicators for {year}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                {/* Profit Margin */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">Profit Margin</div>
                    <div className={`text-sm font-bold ${profitMarginPct >= 20 ? "text-primary" : profitMarginPct >= 5 ? "text-yellow-500" : "text-destructive"}`}>
                      {profitMarginPct.toFixed(1)}%
                    </div>
                  </div>
                  <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${profitMarginPct >= 20 ? "bg-primary" : profitMarginPct >= 5 ? "bg-yellow-500" : "bg-destructive"}`}
                      style={{ width: `${profitMarginPct}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">{formatMoney(netProfit)} net on {formatMoney(totalIncome)} revenue</p>
                </div>

                {/* Operating Ratio */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">Operating Ratio</div>
                    <div className={`text-sm font-bold ${operatingRatioPct <= 60 ? "text-primary" : operatingRatioPct <= 80 ? "text-yellow-500" : "text-destructive"}`}>
                      {operatingRatioPct.toFixed(1)}%
                    </div>
                  </div>
                  <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${operatingRatioPct <= 60 ? "bg-primary" : operatingRatioPct <= 80 ? "bg-yellow-500" : "bg-destructive"}`}
                      style={{ width: `${operatingRatioPct}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">{formatMoney(totalExpenses)} expenses on {formatMoney(totalIncome)} revenue</p>
                </div>

                {/* Tax Liability Estimate */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">Tax Liability Estimate</div>
                    <div className="text-sm font-bold text-destructive">{taxLiabilityPct.toFixed(1)}%</div>
                  </div>
                  <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-destructive rounded-full transition-all duration-700"
                      style={{ width: `${taxLiabilityPct}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">~25% SE tax rate on {formatMoney(netProfit)} net profit → {formatMoney(netProfit * 0.25)} est.</p>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      )}
    </div>
  );
}
