import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Wallet,
  Flame,
  Star,
  Lock,
  Coins,
  FileText,
  BarChart2,
  MessageSquare,
  Lightbulb,
  Folder,
  CreditCard,
  Upload,
  CheckCircle2,
  Trophy,
  TrendingUp,
  ShieldCheck,
  Loader2,
  Sparkles,
  ArrowRight,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type Transaction = {
  id: number;
  title: string;
  amount: number;
  type: string;
  date_time: string;
  description: string;
  deductible?: boolean;
};

type AiStrategy = {
  title: string;
  savings: number;
  description: string;
  difficulty: "Easy" | "Medium" | "Hard";
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatMoney(v: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(v);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function startOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}

function startOfLastMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() - 1, 1).toISOString();
}

// Business Power Score calculation from real data
function calcBPS({
  txCount,
  docCount,
  hasOrg,
  profileComplete,
  netPositive,
  hasPendingReview,
}: {
  txCount: number;
  docCount: number;
  hasOrg: boolean;
  profileComplete: boolean;
  netPositive: boolean;
  hasPendingReview: boolean;
}) {
  let score = 15;
  score += Math.min(30, txCount * 3);   // up to 30 pts for transactions
  score += Math.min(20, docCount * 5);  // up to 20 pts for documents
  if (hasOrg) score += 10;
  if (profileComplete) score += 10;
  if (netPositive) score += 10;
  if (!hasPendingReview && txCount > 0) score += 5;
  return Math.min(100, Math.round(score));
}

function bpsLevel(score: number) {
  if (score >= 95) return { level: 10, title: "Profit Machine", next: null, xpLabel: "MAX" };
  if (score >= 85) return { level: 9, title: "Cashflow Builder", next: "Profit Machine", xpLabel: "9,000" };
  if (score >= 75) return { level: 8, title: "Entrepreneur", next: "Cashflow Builder", xpLabel: "7,500" };
  if (score >= 65) return { level: 7, title: "Achiever", next: "Entrepreneur", xpLabel: "6,000" };
  if (score >= 55) return { level: 6, title: "Builder+", next: "Achiever", xpLabel: "5,000" };
  if (score >= 45) return { level: 5, title: "Builder", next: "Builder+", xpLabel: "4,000" };
  if (score >= 35) return { level: 4, title: "Explorer+", next: "Builder", xpLabel: "3,000" };
  if (score >= 25) return { level: 3, title: "Explorer", next: "Explorer+", xpLabel: "2,000" };
  if (score >= 15) return { level: 2, title: "Beginner", next: "Explorer", xpLabel: "1,000" };
  return { level: 1, title: "Starter", next: "Beginner", xpLabel: "500" };
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({
  title,
  value,
  sub,
  icon,
  loading,
}: {
  title: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            <p className="text-xs text-muted-foreground">{sub}</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function BPSGauge({ score }: { score: number }) {
  const angle = -120 + (score / 100) * 240;
  const r = 70;
  const cx = 90;
  const cy = 90;

  function polarToXY(deg: number) {
    const rad = ((deg - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  function arcPath(startDeg: number, endDeg: number) {
    const s = polarToXY(startDeg);
    const e = polarToXY(endDeg);
    const large = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
  }

  const label =
    score >= 80 ? "Excellent" : score >= 60 ? "Good" : score >= 40 ? "Fair" : "Poor";

  return (
    <div className="flex flex-col items-center">
      <svg width="180" height="130" viewBox="0 0 180 130">
        <defs>
          <linearGradient id="bpsGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="33%" stopColor="#f97316" />
            <stop offset="66%" stopColor="#eab308" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
        </defs>
        <path
          d={arcPath(-120, 120)}
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.1"
          strokeWidth="12"
          strokeLinecap="round"
        />
        <path
          d={arcPath(-120, -120 + (score / 100) * 240)}
          fill="none"
          stroke="url(#bpsGrad)"
          strokeWidth="12"
          strokeLinecap="round"
        />
        {(() => {
          const p = polarToXY(angle);
          return <circle cx={p.x} cy={p.y} r="5" fill="white" />;
        })()}
        <text
          x={cx}
          y={cy - 4}
          textAnchor="middle"
          className="fill-foreground"
          fontSize="28"
          fontWeight="bold"
        >
          {score}
        </text>
        <text
          x={cx}
          y={cy + 16}
          textAnchor="middle"
          className="fill-muted-foreground"
          fontSize="12"
        >
          {label}
        </text>
      </svg>
    </div>
  );
}

function MissionItem({
  icon,
  title,
  xp,
  done,
}: {
  icon: React.ReactNode;
  title: string;
  xp: string;
  done?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-shrink-0 text-muted-foreground">{icon}</div>
      <span className={`text-sm flex-1 ${done ? "line-through text-muted-foreground" : ""}`}>
        {title}
      </span>
      <Badge variant="outline" className={`text-xs border-emerald-800 ${done ? "text-muted-foreground line-through" : "text-emerald-400"}`}>
        {done ? "Done" : xp}
      </Badge>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function UserDashboard() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const numericId = profile?.numericId ?? null;
  const tokenBalance = profile?.token_balance ?? 0;
  const qc = useQueryClient();

  const [insightData, setInsightData] = useState<{ strategies: AiStrategy[]; totalSavings: number } | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [insightUnlocked, setInsightUnlocked] = useState(false);

  // ── Org lookup ──────────────────────────────────────────────────────────────
  const { data: orgData } = useQuery<{ id: number } | null>({
    queryKey: ["user_org", numericId],
    enabled: numericId !== null,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("id")
        .eq("owner_id", numericId!)
        .limit(1)
        .maybeSingle();
      if (error) {
        console.warn("[dashboard] organizations query failed:", error.message, error.code);
        throw error;
      }
      if (!data) console.warn("[dashboard] no organization found for numericId:", numericId);
      return (data as { id: number } | null) ?? null;
    },
  });
  const orgId = orgData?.id ?? null;

  useEffect(() => {
    console.log("[dashboard] numericId:", numericId, "orgId:", orgId);
  }, [numericId, orgId]);

  // ── Real-time transaction updates ──────────────────────────────────────────
  useEffect(() => {
    if (!orgId) return;
    const channel = supabase
      .channel(`transactions:org_${orgId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions", filter: `org_id=eq.${orgId}` }, () => {
        qc.invalidateQueries({ queryKey: ["tx_month", orgId] });
        qc.invalidateQueries({ queryKey: ["tx_recent", orgId] });
        qc.invalidateQueries({ queryKey: ["tx_count", orgId] });
        qc.invalidateQueries({ queryKey: ["tx_last_month", orgId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [orgId, qc]);

  // ── This month's transactions ───────────────────────────────────────────────
  const { data: monthTxs = [], isLoading: monthLoading } = useQuery<Transaction[]>({
    queryKey: ["tx_month", orgId],
    enabled: orgId !== null,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("id, title, amount, type, date_time, description, deductible")
        .eq("org_id", orgId!)
        .gte("date_time", startOfMonth())
        .order("date_time", { ascending: false });
      if (error) { console.error("[dashboard] tx_month failed:", error.message); throw error; }
      console.log("[dashboard] tx_month rows:", data?.length ?? 0);
      return data ?? [];
    },
  });

  // ── Recent 5 transactions (all time) ───────────────────────────────────────
  const { data: recentTxs = [], isLoading: recentLoading } = useQuery<Transaction[]>({
    queryKey: ["tx_recent", orgId],
    enabled: orgId !== null,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("id, title, amount, type, date_time, description")
        .eq("org_id", orgId!)
        .order("date_time", { ascending: false })
        .limit(5);
      if (error) { console.error("[dashboard] tx_recent failed:", error.message); throw error; }
      console.log("[dashboard] tx_recent rows:", data?.length ?? 0);
      return data ?? [];
    },
  });

  // ── All-time transaction count ─────────────────────────────────────────────
  const { data: allTxCount = 0 } = useQuery<number>({
    queryKey: ["tx_count", orgId],
    enabled: orgId !== null,
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const { count } = await supabase
        .from("transactions")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId!);
      return count ?? 0;
    },
  });

  // ── Last month's income (for Revenue Growth) ───────────────────────────────
  const { data: lastMonthTxs = [] } = useQuery<{ amount: number }[]>({
    queryKey: ["tx_last_month", orgId],
    enabled: orgId !== null,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("transactions")
        .select("amount")
        .eq("org_id", orgId!)
        .gte("date_time", startOfLastMonth())
        .lt("date_time", startOfMonth());
      return data ?? [];
    },
  });

  // ── Document count ─────────────────────────────────────────────────────────
  const { data: docCount = 0 } = useQuery<number>({
    queryKey: ["doc_count", numericId],
    enabled: numericId !== null,
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const { count } = await supabase
        .from("user_documents")
        .select("id", { count: "exact", head: true })
        .eq("user_id", numericId!);
      return count ?? 0;
    },
  });

  // ── Pending transactions count ─────────────────────────────────────────────
  const { data: pendingCount = 0 } = useQuery<number>({
    queryKey: ["pending_count", numericId],
    enabled: numericId !== null,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { count } = await supabase
        .from("pending_transactions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", numericId!);
      return count ?? 0;
    },
  });

  // ── Live token balance ─────────────────────────────────────────────────────
  const { data: liveTokens = tokenBalance } = useQuery<number>({
    queryKey: ["token_balance", numericId],
    enabled: numericId !== null,
    initialData: tokenBalance,
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("users")
        .select("token_balance")
        .eq("id", numericId!)
        .single();
      return (data as { token_balance: number } | null)?.token_balance ?? 0;
    },
  });

  // ── Derived metrics ────────────────────────────────────────────────────────
  const income = monthTxs.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const expenses = Math.abs(monthTxs.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0));
  const netProfit = income - expenses;

  const lastMonthIncome = lastMonthTxs.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const lastMonthExpenses = Math.abs(lastMonthTxs.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0));

  const profileComplete = !!(profile?.full_name && profile.phone);
  const netPositive = netProfit > 0;

  const bpsScore = calcBPS({
    txCount: allTxCount,
    docCount,
    hasOrg: orgId !== null,
    profileComplete,
    netPositive,
    hasPendingReview: pendingCount > 0,
  });
  const bpsInfo = bpsLevel(bpsScore);

  // XP = transactions * 50 + documents * 100
  const xpTotal = allTxCount * 50 + docCount * 100;
  // Streak = distinct days with transactions in last 7 days (approx from recentTxs)
  const recentDays = new Set(recentTxs.map((t) => t.date_time.split("T")[0])).size;
  const streakDays = Math.min(7, recentDays);

  // Business Challenges
  const revGrowthPct =
    lastMonthIncome === 0
      ? income > 0 ? 100 : 0
      : Math.min(100, Math.round((income / lastMonthIncome) * 100));

  const taxReadinessPct = Math.min(100, Math.round((docCount / 4) * 100)); // 4 docs = full readiness

  const cashFlowPct =
    income + expenses === 0
      ? 0
      : Math.min(100, Math.round((income / (income + expenses)) * 100));

  // Achievements
  const achievements = [
    { icon: <Trophy className="h-5 w-5 text-amber-400" />, label: "First Upload", done: docCount > 0 },
    { icon: <CheckCircle2 className="h-5 w-5 text-emerald-400" />, label: "5-Day Streak", done: streakDays >= 5 },
    { icon: <TrendingUp className="h-5 w-5 text-blue-400" />, label: "Profit+", done: netPositive && allTxCount > 0 },
    { icon: <ShieldCheck className="h-5 w-5 text-purple-400" />, label: "Tax Ready", done: docCount >= 4 },
    { icon: <MessageSquare className="h-5 w-5 text-sky-400" />, label: "AI Chat", done: false },
    { icon: <BarChart2 className="h-5 w-5 text-orange-400" />, label: "Reporting", done: false },
  ];

  // Missions
  const missions = [
    {
      icon: <Upload className="h-4 w-4 text-blue-500" />,
      title: "Upload a bank statement",
      xp: "+200 XP",
      done: docCount > 0,
    },
    {
      icon: <Folder className="h-4 w-4 text-emerald-500" />,
      title: "Approve your AI-scanned transactions",
      xp: "+300 XP",
      done: pendingCount === 0 && allTxCount > 0,
    },
    {
      icon: <FileText className="h-4 w-4 text-purple-500" />,
      title: "Upload tax documents (P&L, Balance Sheet)",
      xp: "+400 XP",
      done: docCount >= 2,
    },
    {
      icon: <Lightbulb className="h-4 w-4 text-amber-500" />,
      title: "Unlock AI tax strategies",
      xp: "+500 XP",
      done: insightUnlocked,
    },
  ];

  const firstName = profile?.full_name?.split(" ")[0] ?? user?.email?.split("@")[0] ?? "there";

  // ── AI Insight unlock ──────────────────────────────────────────────────────
  async function unlockAiInsight() {
    if (liveTokens < 150) {
      toast({
        title: "Insufficient tokens",
        description: "You need at least 150 tokens to unlock AI Insights.",
        variant: "destructive",
      });
      return;
    }

    setInsightLoading(true);
    try {
      const txLines = [...monthTxs]
        .slice(0, 30)
        .map((t) => `${t.date_time.split("T")[0]}: ${t.title} ${t.amount >= 0 ? "+" : ""}$${Math.abs(t.amount).toFixed(2)}`)
        .join("\n");

      const prompt = `You are a US tax strategist for freelancers and small businesses. Analyze these recent transactions and financial summary:

${txLines || "(No transactions this month yet)"}

Monthly income: $${income.toFixed(2)}
Monthly expenses: $${expenses.toFixed(2)}
Net profit: $${netProfit.toFixed(2)}
Total documents uploaded: ${docCount}

Generate 3-5 specific, actionable US tax-saving strategies. Respond ONLY with valid JSON in this exact format:
{
  "strategies": [
    { "title": "Strategy Name", "savings": 1500, "description": "Clear actionable step.", "difficulty": "Easy" },
    { "title": "Strategy Name", "savings": 2000, "description": "Clear actionable step.", "difficulty": "Medium" }
  ]
}

difficulty must be exactly "Easy", "Medium", or "Hard". savings is a number (USD).`;

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const res = await fetch("/api/openai-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          model: "openai/gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!res.ok) throw new Error(`AI call failed: ${res.status}`);
      const aiData = await res.json() as { choices?: { message?: { content?: string } }[] };
      const content = aiData.choices?.[0]?.message?.content ?? "";

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Could not parse AI response");

      const parsed = JSON.parse(jsonMatch[0]) as { strategies: AiStrategy[] };
      const strategies = parsed.strategies ?? [];
      const totalSavings = strategies.reduce((s, st) => s + (st.savings ?? 0), 0);

      setInsightData({ strategies, totalSavings });
      setInsightUnlocked(true);

      // Deduct 150 tokens
      await supabase
        .from("users")
        .update({ token_balance: Math.max(0, liveTokens - 150) })
        .eq("id", numericId!);
      qc.invalidateQueries({ queryKey: ["token_balance", numericId] });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast({ title: "Failed to generate insights", description: msg, variant: "destructive" });
    } finally {
      setInsightLoading(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {firstName}!</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-sm font-semibold">
            <Flame className="h-5 w-5 text-orange-500" />
            <span>Streak: {streakDays} day{streakDays !== 1 ? "s" : ""}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm font-semibold">
            <Star className="h-5 w-5 text-emerald-500" />
            <span>{xpTotal.toLocaleString()} XP</span>
          </div>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Income"
          value={formatMoney(income)}
          sub="This month"
          icon={<ArrowUpRight className="h-4 w-4 text-emerald-500" />}
          loading={monthLoading}
        />
        <StatCard
          title="Expenses"
          value={formatMoney(expenses)}
          sub="This month"
          icon={<ArrowDownRight className="h-4 w-4 text-rose-500" />}
          loading={monthLoading}
        />
        <StatCard
          title="Net Profit"
          value={formatMoney(netProfit)}
          sub="Income minus expenses"
          icon={<DollarSign className="h-4 w-4 text-primary" />}
          loading={monthLoading}
        />
        <StatCard
          title="Token Balance"
          value={`${liveTokens.toLocaleString()} BS`}
          sub="BookSmart tokens"
          icon={<Wallet className="h-4 w-4 text-yellow-500" />}
          loading={!profile}
        />
      </div>

      {/* ── Main content row ── */}
      <div className="grid gap-4 lg:grid-cols-7">
        {/* Left column — 4 cols */}
        <div className="lg:col-span-4 space-y-4">

          {/* Business Power Score */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold">Business Power Score (BPS)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-start gap-6">
                <div className="flex-shrink-0">
                  <BPSGauge score={bpsScore} />
                </div>
                <div className="flex-1 space-y-3 pt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">Level {bpsInfo.level}</span>
                    <span className="text-sm text-muted-foreground">{bpsInfo.title}</span>
                    <Star className="h-4 w-4 text-amber-400 ml-1" />
                  </div>
                  <Progress value={(bpsScore % 10) * 10} className="h-1.5" />

                  <div className="pt-1">
                    <p className="text-lg font-bold">{bpsInfo.title}</p>
                    <Progress value={bpsScore} className="h-1.5 mt-1.5 [&>*]:bg-amber-400" />
                    <div className="flex justify-between mt-1.5 text-xs text-muted-foreground">
                      <span>{bpsInfo.next ? `Next rank: ${bpsInfo.next}` : "Maximum rank reached!"}</span>
                      <span>XP: {xpTotal.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end">
                    <div className="rounded-full border border-border/50 bg-secondary/30 px-4 py-1.5 flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Today's XP Potential:</span>
                      <span className="font-bold text-emerald-400">+{Math.max(0, (4 - missions.filter(m => m.done).length) * 100)} XP</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Missions + AI Insight row */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Today's Missions */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold">
                  Today's Missions
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {missions.filter((m) => m.done).length}/{missions.length} complete
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {missions.map((m) => (
                  <MissionItem key={m.title} icon={m.icon} title={m.title} xp={m.xp} done={m.done} />
                ))}
              </CardContent>
            </Card>

            {/* AI Insight */}
            <Card className="bg-gradient-to-br from-[#0a1628] to-[#0d2044] border-primary/20">
              {!insightUnlocked ? (
                <CardContent className="pt-5 flex flex-col items-center text-center gap-2">
                  <p className="text-base font-bold text-white flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-primary" /> AI Insight
                  </p>
                  <p className="text-xs text-white/60">Maximize Your Business Savings Potential!</p>
                  {insightLoading ? (
                    <div className="flex flex-col items-center gap-2 mt-3">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <p className="text-xs text-white/60">Analyzing your finances…</p>
                    </div>
                  ) : (
                    <>
                      <p className="text-4xl font-bold text-emerald-400 mt-1">
                        {income > 0 ? formatMoney(income * 0.15) : "$—"}
                      </p>
                      <p className="text-sm text-white/80">estimated savings potential</p>
                      <p className="text-xs text-white/50 mt-1 max-w-[180px]">
                        Unlock AI-powered strategies tailored to your transactions
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-3 border-white/20 text-white hover:bg-white/10 gap-2"
                        onClick={unlockAiInsight}
                        disabled={liveTokens < 150 || insightLoading}
                      >
                        <Lock className="h-3.5 w-3.5" />
                        Unlock &amp; View
                        <span className="text-cyan-400 font-bold">150 Tokens</span>
                        <Coins className="h-3.5 w-3.5 text-amber-400" />
                      </Button>
                      {liveTokens < 150 && (
                        <p className="text-[11px] text-rose-400 mt-1">
                          Need {150 - liveTokens} more tokens
                        </p>
                      )}
                    </>
                  )}
                </CardContent>
              ) : insightData ? (
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-white flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-primary" /> AI Insights
                    </p>
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-800 text-xs">
                      {insightData.strategies.length} strategies
                    </Badge>
                  </div>
                  <p className="text-2xl font-bold text-emerald-400">{formatMoney(insightData.totalSavings)}</p>
                  <p className="text-xs text-white/60">total savings potential identified</p>
                  <div className="space-y-2 mt-1">
                    {insightData.strategies.slice(0, 3).map((s, i) => (
                      <div key={i} className="flex items-center justify-between gap-2">
                        <span className="text-xs text-white/80 truncate flex-1">{s.title}</span>
                        <span className="text-xs font-semibold text-emerald-400 flex-shrink-0">{formatMoney(s.savings)}</span>
                      </div>
                    ))}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full mt-2 border-white/20 text-white hover:bg-white/10 gap-2 text-xs"
                    onClick={() => window.location.href = "/ai-strategy"}
                  >
                    View Full Strategies <ArrowRight className="h-3 w-3" />
                  </Button>
                </CardContent>
              ) : null}
            </Card>
          </div>

          {/* Achievements + Challenges */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Achievements */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold">
                  Achievements
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {achievements.filter((a) => a.done).length}/{achievements.length}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  {achievements.map((a) => (
                    <div
                      key={a.label}
                      className={`flex flex-col items-center gap-1 rounded-lg p-2 ${
                        a.done ? "bg-secondary/40" : "bg-secondary/10 opacity-40"
                      }`}
                    >
                      {a.icon}
                      <span className="text-[10px] text-center leading-tight">{a.label}</span>
                      {a.done && <CheckCircle2 className="h-2.5 w-2.5 text-emerald-400" />}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Business Challenges */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold">Business Challenges</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  {
                    label: "Revenue Growth",
                    pct: revGrowthPct,
                    color: "bg-emerald-500",
                    sub: lastMonthIncome > 0
                      ? `vs ${formatMoney(lastMonthIncome)} last month`
                      : income > 0 ? "First month data" : "No income yet",
                  },
                  {
                    label: "Tax Readiness",
                    pct: taxReadinessPct,
                    color: "bg-amber-500",
                    sub: `${docCount}/4 documents uploaded`,
                  },
                  {
                    label: "Cash Flow Score",
                    pct: cashFlowPct,
                    color: "bg-blue-500",
                    sub: income + expenses > 0
                      ? `${formatMoney(income)} in / ${formatMoney(expenses)} out`
                      : "Upload statements to score",
                  },
                ].map((c) => (
                  <div key={c.label} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>{c.label}</span>
                      <span className="font-semibold">{c.pct}%</span>
                    </div>
                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div
                        className={`h-full ${c.color} rounded-full transition-all duration-700`}
                        style={{ width: `${c.pct}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground">{c.sub}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right column — 3 cols */}
        <div className="lg:col-span-3 space-y-4">

          {/* Recent Transactions */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold">Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              {recentLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : recentTxs.length === 0 ? (
                <div className="text-center py-6 space-y-2">
                  <p className="text-sm text-muted-foreground">No transactions yet.</p>
                  {pendingCount > 0 && (
                    <p className="text-xs text-amber-400">
                      {pendingCount} pending — approve them in Transactions
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {recentTxs.map((tx) => (
                    <div key={tx.id} className="flex items-center gap-3">
                      <div
                        className={`flex-shrink-0 rounded-full p-1.5 ${
                          tx.amount >= 0
                            ? "bg-emerald-500/10 text-emerald-500"
                            : "bg-rose-500/10 text-rose-500"
                        }`}
                      >
                        {tx.amount >= 0 ? (
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        ) : (
                          <ArrowDownRight className="h-3.5 w-3.5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{tx.title}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(tx.date_time)}</p>
                      </div>
                      <span
                        className={`text-sm font-semibold flex-shrink-0 ${
                          tx.amount >= 0 ? "text-emerald-500" : "text-rose-500"
                        }`}
                      >
                        {tx.amount >= 0 ? "+" : ""}
                        {formatMoney(tx.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dun & Bradstreet — requires external integration */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold">Dun &amp; Bradstreet</CardTitle>
                <Badge variant="outline" className="text-[10px] text-muted-foreground">Not connected</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="relative flex-shrink-0 w-16 h-16 opacity-40">
                  <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
                    <circle cx="32" cy="32" r="26" fill="none" stroke="currentColor" strokeOpacity="0.1" strokeWidth="8" />
                    <circle
                      cx="32" cy="32" r="26" fill="none"
                      stroke="currentColor" strokeWidth="8"
                      strokeDasharray="50 163"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-lg font-bold">—</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Connect your D&B account to track your PAYDEX score and business credit health.</p>
                </div>
              </div>
              <Button size="sm" variant="outline" className="w-full mt-3 text-xs" disabled>
                Connect D&B Account
              </Button>
            </CardContent>
          </Card>

          {/* Funding */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold">Funding Readiness</CardTitle>
                <Badge variant="outline" className="text-[10px] text-muted-foreground">Estimated</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-emerald-500/10 p-2 flex-shrink-0">
                  <Wallet className="h-5 w-5 text-emerald-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold">
                    {bpsScore >= 70 ? "Loan Ready" : bpsScore >= 45 ? "Getting There" : "Build Credit First"}
                  </p>
                  <p className="text-xs text-muted-foreground">Based on your BPS of {bpsScore}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xl font-bold">{Math.round(bpsScore * 0.85)}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Points</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Token Wallet */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold">Token Wallet</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 mb-3">
                <Coins className="h-5 w-5 text-white" />
                <div className="flex-1">
                  <p className="text-base font-bold">{liveTokens.toLocaleString()} Tokens</p>
                  <p className="text-xs text-muted-foreground">Available balance</p>
                </div>
                <span className="text-xl font-bold">{liveTokens.toLocaleString()}</span>
              </div>
              <div className="space-y-2">
                {[
                  { icon: <Sparkles className="h-3 w-3 text-primary" />, label: "AI Insights", cost: "150 tokens" },
                  { icon: <BarChart2 className="h-3 w-3" />, label: "Monthly report", cost: "100 tokens" },
                  { icon: <MessageSquare className="h-3 w-3" />, label: "CPA consultation", cost: "200 tokens" },
                  { icon: <Lightbulb className="h-3 w-3" />, label: "Banking recommendations", cost: "75 tokens" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      {item.icon}
                      <span>{item.label}</span>
                    </div>
                    <span className="text-amber-400/70">{item.cost}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Business Credit */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold">Business Credit (Dun &amp; Bradstreet)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium flex-1">PAYDEX</span>
                <span className="text-sm text-muted-foreground">—</span>
                <span className="text-muted-foreground text-lg">›</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Connect D&B to see your PAYDEX score</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
