import { useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import {
  Card, CardContent, CardHeader, CardTitle, CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  Sparkles, ArrowRight, Zap, Loader2, RefreshCw, AlertCircle,
  DollarSign, TrendingDown, Hash, Percent, ChevronDown, ChevronRight, Tag,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Difficulty = "Easy" | "Medium" | "Hard";
type Status     = "New" | "Recommended" | "Action Required";
type TabKey     = "strategy" | "deduction";
type TaxType    = "Federal" | "State";

type Strategy = {
  title: string; description: string; savings: number;
  difficulty: Difficulty; status: Status; action_steps?: string[];
};

type Transaction = {
  id: number; title: string; amount: number; type: string;
  date_time: string; description: string; deductible: boolean;
};

type DeductionGroup = {
  label: string; totalAmount: number; count: number;
  txs: Transaction[]; color: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(v: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
}

function startOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}

function statusColor(s: Status) {
  if (s === "Recommended")    return "text-primary border-primary/30 bg-primary/10";
  if (s === "Action Required") return "text-destructive border-destructive/30 bg-destructive/10";
  return "text-emerald-500 border-emerald-500/30 bg-emerald-500/10";
}

const PIE_COLORS = [
  "#F5A623", "#4ECDC4", "#A78BFA", "#F87171", "#34D399",
  "#60A5FA", "#FB923C", "#E879F9", "#94A3B8", "#FBBF24",
];

function groupDeductions(txs: Transaction[]): DeductionGroup[] {
  const map = new Map<string, { txs: Transaction[]; total: number }>();
  for (const t of txs) {
    const key = t.description?.trim() || t.type?.trim() || "Other";
    if (!map.has(key)) map.set(key, { txs: [], total: 0 });
    const g = map.get(key)!;
    g.txs.push(t);
    g.total += Math.abs(t.amount);
  }
  return Array.from(map.entries())
    .sort((a, b) => b[1].total - a[1].total)
    .map(([label, data], i) => ({
      label, totalAmount: data.total, count: data.txs.length,
      txs: data.txs, color: PIE_COLORS[i % PIE_COLORS.length],
    }));
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AiStrategy() {
  const { profile } = useAuth();
  const { toast }   = useToast();
  const numericId   = profile?.numericId ?? null;

  // ── Tabs ─────────────────────────────────────────────────────────────────
  const [tab, setTab] = useState<TabKey>("strategy");

  // ── AI Strategy state ────────────────────────────────────────────────────
  const [strategies, setStrategies]       = useState<Strategy[]>([]);
  const [generating, setGenerating]       = useState(false);
  const [hasGenerated, setHasGenerated]   = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);

  // ── AI Deduction state ───────────────────────────────────────────────────
  const curYear = new Date().getFullYear();
  const [dedStart, setDedStart]           = useState(`${curYear}-01-01`);
  const [dedEnd, setDedEnd]               = useState(`${curYear}-12-31`);
  const [taxType, setTaxType]             = useState<TaxType>("Federal");
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  // ── Org lookup ────────────────────────────────────────────────────────────
  const { data: orgId } = useQuery<number | null>({
    queryKey: ["user_org_strat", numericId],
    enabled:  numericId !== null,
    staleTime: 5 * 60 * 1000,
    queryFn:  async () => {
      const { data } = await supabase.from("organizations").select("id")
        .eq("owner_id", numericId!).limit(1).maybeSingle();
      return (data as { id: number } | null)?.id ?? null;
    },
  });

  // ── Transactions for AI Strategy (month + all-time) ───────────────────────
  const { data: monthTxs = [] } = useQuery<Transaction[]>({
    queryKey: ["tx_month_strat", orgId],
    enabled:  orgId !== null,
    queryFn:  async () => {
      const { data } = await supabase.from("transactions")
        .select("id,title,amount,type,date_time,description,deductible")
        .eq("org_id", orgId!).gte("date_time", startOfMonth())
        .order("date_time", { ascending: false });
      return data ?? [];
    },
  });

  const { data: allTxs = [] } = useQuery<Transaction[]>({
    queryKey: ["tx_all_strat", orgId],
    enabled:  orgId !== null,
    staleTime: 2 * 60 * 1000,
    queryFn:  async () => {
      const { data } = await supabase.from("transactions")
        .select("id,title,amount,type,date_time,description,deductible")
        .eq("org_id", orgId!).order("date_time", { ascending: false }).limit(50);
      return data ?? [];
    },
  });

  // ── Deduction period transactions ─────────────────────────────────────────
  const { data: dedTxs = [], isLoading: dedLoading } = useQuery<Transaction[]>({
    queryKey: ["tx_deductions", orgId, dedStart, dedEnd],
    enabled:  orgId !== null && tab === "deduction",
    staleTime: 60_000,
    queryFn:  async () => {
      const { data } = await supabase.from("transactions")
        .select("id,title,amount,type,date_time,description,deductible")
        .eq("org_id", orgId!)
        .gte("date_time", `${dedStart}T00:00:00`)
        .lte("date_time", `${dedEnd}T23:59:59`)
        .order("date_time", { ascending: false });
      return data ?? [];
    },
  });

  // ── Derived deduction metrics ─────────────────────────────────────────────
  const allExpenses        = useMemo(() => dedTxs.filter(t => t.amount < 0), [dedTxs]);
  const deductibleTxs      = useMemo(() => allExpenses.filter(t => t.deductible), [allExpenses]);
  const totalExpenseAmt    = useMemo(() => allExpenses.reduce((s, t) => s + Math.abs(t.amount), 0), [allExpenses]);
  const totalDeductibleAmt = useMemo(() => deductibleTxs.reduce((s, t) => s + Math.abs(t.amount), 0), [deductibleTxs]);
  const deductionRate      = totalExpenseAmt > 0 ? (totalDeductibleAmt / totalExpenseAmt) * 100 : 0;
  const groups             = useMemo(() => groupDeductions(deductibleTxs), [deductibleTxs]);

  // ── AI Strategy derived ────────────────────────────────────────────────────
  const income         = monthTxs.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const expenses       = Math.abs(monthTxs.filter(t => t.amount < 0).reduce((s, t) => s + t.amount, 0));
  const netProfit      = income - expenses;
  const totalSavings   = strategies.reduce((s, st) => s + (st.savings ?? 0), 0);

  // ── Generate AI strategies ─────────────────────────────────────────────────
  const generate = useCallback(async () => {
    setGenerating(true);
    try {
      const txLines = allTxs.slice(0, 40)
        .map(t => `${t.date_time.split("T")[0]}: ${t.title} ${t.amount >= 0 ? "+" : ""}$${Math.abs(t.amount).toFixed(2)}`)
        .join("\n");

      const prompt = `You are an expert US tax strategist for freelancers and small businesses. Analyze the following financial data and generate personalized, actionable tax-saving strategies.

FINANCIAL SUMMARY:
- Monthly income: $${income.toFixed(2)}
- Monthly expenses: $${expenses.toFixed(2)}
- Net profit (month): $${netProfit.toFixed(2)}
- Annualized income (estimate): $${(income * 12).toFixed(2)}
- Total transactions analyzed: ${allTxs.length}

RECENT TRANSACTIONS (last 40):
${txLines || "(No transaction data available yet — provide general freelancer/SMB strategies)"}

INSTRUCTIONS:
Generate 5 specific US tax-saving strategies tailored to this business profile. Consider deductions, entity structure, retirement accounts, QBI, self-employment tax, home office, vehicle, health insurance, etc. based on the income level and transaction patterns.

Respond ONLY with valid JSON in exactly this format — no markdown, no explanation:
{
  "strategies": [
    {
      "title": "Strategy Name",
      "savings": 2500,
      "description": "Detailed explanation referencing their specific data. 2-3 sentences.",
      "difficulty": "Easy",
      "status": "Recommended",
      "action_steps": ["Step 1", "Step 2", "Step 3"]
    }
  ]
}

Rules:
- difficulty must be exactly "Easy", "Medium", or "Hard"
- status must be exactly "Recommended", "Action Required", or "New"
- savings is an integer (USD, no symbols)
- Include exactly 5 strategies`;

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const res = await fetch("/api/openai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ model: "openai/gpt-4o-mini", messages: [{ role: "user", content: prompt }] }),
      });

      if (!res.ok) throw new Error(`Request failed: ${res.status} ${res.statusText}`);
      const aiData = await res.json() as { choices?: { message?: { content?: string } }[] };
      const content = aiData.choices?.[0]?.message?.content ?? "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Could not parse AI response — unexpected format");
      const parsed = JSON.parse(jsonMatch[0]) as { strategies: Strategy[] };
      if (!Array.isArray(parsed.strategies) || parsed.strategies.length === 0) throw new Error("AI returned no strategies");
      setStrategies(parsed.strategies);
      setHasGenerated(true);
      toast({ title: "Strategies updated!", description: `${parsed.strategies.length} personalized strategies generated.` });
    } catch (err) {
      toast({ title: "Failed to generate strategies", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  }, [allTxs, monthTxs, income, expenses, netProfit, toast]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* ── Tab bar ── */}
      <div className="border-b border-border/40">
        <div className="flex gap-0">
          {([["strategy", "AI Strategy"], ["deduction", "AI Deduction"]] as [TabKey, string][]).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
                tab === key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════ AI STRATEGY TAB ══════════════ */}
      {tab === "strategy" && (
        <>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                AI Tax Strategies <Sparkles className="h-6 w-6 text-primary" />
              </h1>
              <p className="text-muted-foreground">Personalized tax-saving opportunities based on your data.</p>
            </div>
            <Button variant="outline" className="gap-2" onClick={generate} disabled={generating}>
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : hasGenerated ? <RefreshCw className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
              {generating ? "Analyzing…" : hasGenerated ? "Recalculate" : "Recalculate Now"}
            </Button>
          </div>

          {hasGenerated && totalSavings > 0 && (
            <div className="rounded-xl border border-primary/20 bg-gradient-to-r from-primary/10 to-emerald-500/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Total savings potential identified</p>
                <p className="text-3xl font-bold text-emerald-400">{fmt(totalSavings)}</p>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Sparkles className="h-3.5 w-3.5 text-primary" /> {strategies.length} strategies</span>
                <span>·</span>
                <span>Based on {allTxs.length} transactions</span>
              </div>
            </div>
          )}

          {!hasGenerated && !generating && (
            <div className="rounded-xl border border-dashed border-border/50 bg-secondary/10 p-12 flex flex-col items-center text-center gap-4">
              <div className="rounded-full bg-primary/10 p-4"><Sparkles className="h-8 w-8 text-primary" /></div>
              <div>
                <p className="text-lg font-semibold">No strategies generated yet</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                  Click <strong>Recalculate Now</strong> to analyze your transactions and get personalized US tax-saving strategies.
                </p>
              </div>
              <Button onClick={generate} className="gap-2"><Zap className="h-4 w-4" /> Generate My Strategies</Button>
            </div>
          )}

          {generating && (
            <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-12 flex flex-col items-center text-center gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <div>
                <p className="text-lg font-semibold">Analyzing your finances…</p>
                <p className="text-sm text-muted-foreground mt-1">AI is reviewing {allTxs.length} transaction{allTxs.length !== 1 ? "s" : ""} to find your best tax opportunities.</p>
              </div>
            </div>
          )}

          {hasGenerated && !generating && strategies.length > 0 && (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {strategies.map((strategy, i) => (
                <Card key={i} className="border-primary/20 bg-gradient-to-b from-card to-primary/5 flex flex-col">
                  <CardHeader>
                    <div className="flex justify-between items-start mb-2">
                      <Badge variant="outline" className={statusColor(strategy.status)}>{strategy.status}</Badge>
                      <Badge variant="secondary">{strategy.difficulty}</Badge>
                    </div>
                    <CardTitle className="text-xl">{strategy.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <p className="text-sm text-muted-foreground mb-4">{strategy.description}</p>
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Estimated Savings</span>
                      <div className="text-2xl font-bold text-primary">{fmt(strategy.savings)}</div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button className="w-full gap-2" onClick={() => setSelectedStrategy(strategy)}>
                      Apply Strategy <ArrowRight className="h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* ══════════════ AI DEDUCTION TAB ══════════════ */}
      {tab === "deduction" && (
        <>
          {/* Header + filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">AI Deductions</h1>
              <p className="text-muted-foreground">Review AI-identified deductions and their impact on your taxes.</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Date range */}
              <div className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-card px-3 py-2 text-sm">
                <span className="text-muted-foreground">📅</span>
                <input type="date" value={dedStart} onChange={e => setDedStart(e.target.value)}
                  className="bg-transparent text-sm focus:outline-none w-[120px]" />
                <span className="text-muted-foreground">–</span>
                <input type="date" value={dedEnd} onChange={e => setDedEnd(e.target.value)}
                  className="bg-transparent text-sm focus:outline-none w-[120px]" />
              </div>
              {/* Tax type */}
              <select value={taxType} onChange={e => setTaxType(e.target.value as TaxType)}
                className="rounded-lg border border-border/60 bg-card px-3 py-2 text-sm focus:outline-none">
                <option value="Federal">Federal</option>
                <option value="State">State</option>
              </select>
            </div>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Total Amount", value: fmt(totalExpenseAmt), sub: "100% of transactions", Icon: DollarSign, color: "text-primary" },
              { label: "Total Deductions", value: fmt(totalDeductibleAmt), sub: `${deductionRate.toFixed(0)}% of total amount`, Icon: TrendingDown, color: "text-emerald-400" },
              { label: "Total Transactions", value: dedTxs.length.toString(), sub: "Across all categories", Icon: Hash, color: "text-blue-400" },
              { label: "Deduction Rate", value: `${deductionRate.toFixed(1)}%`, sub: "Average deduction rate", Icon: Percent, color: "text-purple-400" },
            ].map(({ label, value, sub, Icon, color }) => (
              <Card key={label} className="border-border/40 bg-card/60">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center`}>
                      <Icon className={`h-4.5 w-4.5 ${color}`} />
                    </div>
                    <span className="text-xs text-muted-foreground font-medium">{label}</span>
                  </div>
                  <p className="text-2xl font-bold">{value}</p>
                  <p className={`text-xs mt-1 ${color}`}>{sub}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {dedLoading ? (
            <div className="flex items-center justify-center py-20 gap-3">
              <Loader2 className="h-6 w-6 text-primary animate-spin" />
              <span className="text-muted-foreground">Loading deductions…</span>
            </div>
          ) : (
            <div className="grid lg:grid-cols-2 gap-6">
              {/* ── Pie chart ── */}
              <Card className="border-border/40">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Tag className="h-4 w-4 text-primary" /> Deductions by Category
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {groups.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 gap-3 text-center">
                      <TrendingDown className="h-10 w-10 text-muted-foreground/30" />
                      <p className="text-sm text-muted-foreground">No deductible transactions in this period.</p>
                    </div>
                  ) : (
                    <>
                      <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                          <Pie data={groups} dataKey="totalAmount" nameKey="label"
                            cx="50%" cy="50%" outerRadius={90} innerRadius={52}
                            paddingAngle={2}>
                            {groups.map((g) => (
                              <Cell key={g.label} fill={g.color} opacity={0.9} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value: number) => [fmt(value), "Amount"]}
                            contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      {/* Custom legend */}
                      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2 justify-center">
                        {groups.map(g => (
                          <div key={g.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ background: g.color }} />
                            <span className="max-w-[120px] truncate">{g.label}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* ── Deductions Breakdown ── */}
              <Card className="border-border/40">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Deductions Breakdown</CardTitle>
                  <p className="text-xs text-muted-foreground">Click on a category to view matching transactions</p>
                </CardHeader>
                <CardContent className="p-0">
                  {groups.length === 0 ? (
                    <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                      No transactions available
                    </div>
                  ) : (
                    <div className="divide-y divide-border/30 max-h-[300px] overflow-y-auto">
                      {groups.map(group => {
                        const isOpen = expandedGroup === group.label;
                        return (
                          <div key={group.label}>
                            {/* Group header */}
                            <button
                              onClick={() => setExpandedGroup(isOpen ? null : group.label)}
                              className="w-full flex items-center gap-3 px-5 py-3 hover:bg-accent/30 transition-colors text-left">
                              <span className="h-3 w-3 rounded-full flex-shrink-0" style={{ background: group.color }} />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{group.label}</p>
                                <p className="text-xs text-muted-foreground">{group.count} transaction{group.count !== 1 ? "s" : ""}</p>
                              </div>
                              <span className="text-sm font-semibold text-primary mr-1">{fmt(group.totalAmount)}</span>
                              {isOpen
                                ? <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                : <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                            </button>
                            {/* Expanded transactions */}
                            {isOpen && (
                              <div className="bg-background/40 px-5 py-2 space-y-2 border-t border-border/20">
                                {group.txs.map(t => (
                                  <div key={t.id} className="flex items-center justify-between text-xs py-1.5">
                                    <div className="min-w-0">
                                      <p className="font-medium truncate">{t.title}</p>
                                      <p className="text-muted-foreground">{new Date(t.date_time).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                                    </div>
                                    <span className="text-emerald-400 font-semibold ml-4 flex-shrink-0">
                                      {fmt(Math.abs(t.amount))}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}

      {/* ── Apply Strategy dialog ── */}
      <Dialog open={!!selectedStrategy} onOpenChange={open => !open && setSelectedStrategy(null)}>
        {selectedStrategy && (
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className={statusColor(selectedStrategy.status)}>{selectedStrategy.status}</Badge>
                <Badge variant="secondary">{selectedStrategy.difficulty}</Badge>
              </div>
              <DialogTitle className="text-xl">{selectedStrategy.title}</DialogTitle>
              <DialogDescription>{selectedStrategy.description}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="rounded-lg bg-primary/10 border border-primary/20 px-4 py-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Estimated Annual Savings</p>
                <p className="text-3xl font-bold text-primary">{fmt(selectedStrategy.savings)}</p>
              </div>
              {selectedStrategy.action_steps && selectedStrategy.action_steps.length > 0 && (
                <div>
                  <p className="text-sm font-semibold mb-2">Action Steps</p>
                  <ol className="space-y-2">
                    {selectedStrategy.action_steps.map((step, i) => (
                      <li key={i} className="flex gap-3 text-sm text-muted-foreground">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-bold mt-0.5">{i + 1}</span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
              <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
                <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">These are AI-generated suggestions. Consult a licensed CPA before implementing any tax strategy.</p>
              </div>
              <Button className="w-full gap-2" onClick={() => setSelectedStrategy(null)}>
                Got it — I'll discuss with my CPA <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
