import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";
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
  Trash2,
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
        {/* track */}
        <path
          d={arcPath(-120, 120)}
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.1"
          strokeWidth="12"
          strokeLinecap="round"
        />
        {/* filled arc */}
        <path
          d={arcPath(-120, -120 + (score / 100) * 240)}
          fill="none"
          stroke="url(#bpsGrad)"
          strokeWidth="12"
          strokeLinecap="round"
        />
        {/* needle dot */}
        {(() => {
          const p = polarToXY(angle);
          return <circle cx={p.x} cy={p.y} r="5" fill="white" />;
        })()}
        {/* centre text */}
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
      <Badge variant="outline" className="text-xs text-emerald-400 border-emerald-800">
        {xp}
      </Badge>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function UserDashboard() {
  const { user, profile } = useAuth();
  const numericId = profile?.numericId ?? null;
  const tokenBalance = profile?.token_balance ?? 0;
  const qc = useQueryClient();

  // Fetch the user's organization (transactions are stored under org_id, matching Flutter)
  const { data: orgData } = useQuery<{ id: number } | null>({
    queryKey: ["user_org", numericId],
    enabled: numericId !== null,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("organizations")
        .select("id")
        .eq("owner_id", numericId!)
        .limit(1)
        .maybeSingle();
      return (data as { id: number } | null) ?? null;
    },
  });
  const orgId = orgData?.id ?? null;

  // Real-time: invalidate transaction queries when n8n writes new transactions.
  // Flutter filters by org_id, so we do the same.
  useEffect(() => {
    if (!orgId) return;
    const channel = supabase
      .channel(`transactions:org_${orgId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transactions",
          filter: `org_id=eq.${orgId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["tx_month", orgId] });
          qc.invalidateQueries({ queryKey: ["tx_recent", orgId] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [orgId, qc]);

  // Current-month transactions (for income / expense summary) — filter by org_id like Flutter
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
      if (error) throw error;
      return data ?? [];
    },
  });

  // Recent 5 transactions (all time) — filter by org_id like Flutter
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
      if (error) throw error;
      return data ?? [];
    },
  });

  const income = monthTxs.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const expenses = Math.abs(
    monthTxs.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0)
  );
  const netProfit = income - expenses;

  const firstName = profile?.full_name?.split(" ")[0] ?? user?.email?.split("@")[0] ?? "there";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {firstName}!</p>
        </div>
        {/* Streak / XP strip */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-sm font-semibold">
            <Flame className="h-5 w-5 text-orange-500" />
            <span>Streak: 4 days</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm font-semibold">
            <Star className="h-5 w-5 text-emerald-500" />
            <span>340 XP</span>
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
          value={`${tokenBalance.toLocaleString()} BS`}
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
                  <BPSGauge score={80} />
                </div>
                <div className="flex-1 space-y-3 pt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">Level 8</span>
                    <span className="text-sm text-muted-foreground">Entrepreneur</span>
                    <Star className="h-4 w-4 text-amber-400 ml-1" />
                  </div>
                  <Progress value={75} className="h-1.5" />

                  <div className="pt-1">
                    <p className="text-lg font-bold">Cashflow Builder</p>
                    <Progress value={60} className="h-1.5 mt-1.5 [&>*]:bg-amber-400" />
                    <div className="flex justify-between mt-1.5 text-xs text-muted-foreground">
                      <span>Next rank: Profit Machine</span>
                      <span>Streak: 3,500</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end">
                    <div className="rounded-full border border-border/50 bg-secondary/30 px-4 py-1.5 flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Today's XP Potential:</span>
                      <span className="font-bold text-emerald-400">+340 XP</span>
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
                <CardTitle className="text-sm font-bold">Today's Missions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <MissionItem
                  icon={<Folder className="h-4 w-4 text-emerald-500" />}
                  title="Categorize 5 uncategorized transactions"
                  xp="+550 XP"
                />
                <MissionItem
                  icon={<Flame className="h-4 w-4 text-orange-500" />}
                  title="Pay down credit card balance"
                  xp="+120 XP"
                />
                <MissionItem
                  icon={<Upload className="h-4 w-4 text-blue-500" />}
                  title="Upload receipts for deductions"
                  xp="+75 XP"
                />
                <MissionItem
                  icon={<FileText className="h-4 w-4 text-purple-500" />}
                  title="Review tax strategy suggestion"
                  xp="+90 XP"
                  done
                />
              </CardContent>
            </Card>

            {/* AI Insight teaser */}
            <Card className="bg-gradient-to-br from-[#0a1628] to-[#0d2044] border-primary/20">
              <CardContent className="pt-5 flex flex-col items-center text-center gap-2">
                <p className="text-base font-bold text-white">AI Insight</p>
                <p className="text-xs text-white/60">Maximize Your Business Savings Potential!</p>
                <p className="text-4xl font-bold text-emerald-400 mt-1">$6,470</p>
                <p className="text-sm text-white/80">across 5 strategic insights</p>
                <p className="text-xs text-white/50 mt-1 max-w-[180px]">
                  Unlock to view strategies on how to save your business up to $6,470
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3 border-white/20 text-white hover:bg-white/10 gap-2"
                >
                  <Lock className="h-3.5 w-3.5" />
                  Unlock &amp; View
                  <span className="text-cyan-400 font-bold">150 Tokens</span>
                  <Coins className="h-3.5 w-3.5 text-amber-400" />
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Achievements + Challenges */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Achievements */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold">Achievements</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { icon: <Trophy className="h-5 w-5 text-amber-400" />, label: "First Upload", done: true },
                    { icon: <CheckCircle2 className="h-5 w-5 text-emerald-400" />, label: "5-Day Streak", done: true },
                    { icon: <TrendingUp className="h-5 w-5 text-blue-400" />, label: "Profit+", done: false },
                    { icon: <ShieldCheck className="h-5 w-5 text-purple-400" />, label: "Tax Ready", done: false },
                    { icon: <MessageSquare className="h-5 w-5 text-sky-400" />, label: "AI Chat", done: true },
                    { icon: <BarChart2 className="h-5 w-5 text-orange-400" />, label: "Reporting", done: false },
                  ].map((a) => (
                    <div
                      key={a.label}
                      className={`flex flex-col items-center gap-1 rounded-lg p-2 ${
                        a.done ? "bg-secondary/40" : "bg-secondary/10 opacity-40"
                      }`}
                    >
                      {a.icon}
                      <span className="text-[10px] text-center leading-tight">{a.label}</span>
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
                  { label: "Revenue Growth", pct: 68, color: "bg-emerald-500" },
                  { label: "Tax Readiness", pct: 45, color: "bg-amber-500" },
                  { label: "Cash Flow Score", pct: 72, color: "bg-blue-500" },
                ].map((c) => (
                  <div key={c.label} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>{c.label}</span>
                      <span className="font-semibold">{c.pct}%</span>
                    </div>
                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div
                        className={`h-full ${c.color} rounded-full`}
                        style={{ width: `${c.pct}%` }}
                      />
                    </div>
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
                <p className="text-sm text-muted-foreground py-6 text-center">
                  No transactions yet.
                </p>
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

          {/* Dun & Bradstreet */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold">Dun &amp; Bradstreet</CardTitle>
                <span className="text-xs text-muted-foreground">Verified Business</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                {/* mini circular gauge */}
                <div className="relative flex-shrink-0 w-16 h-16">
                  <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
                    <circle cx="32" cy="32" r="26" fill="none" stroke="currentColor" strokeOpacity="0.1" strokeWidth="8" />
                    <circle
                      cx="32" cy="32" r="26" fill="none"
                      stroke="url(#dbGrad)" strokeWidth="8"
                      strokeDasharray={`${(78 / 100) * 163} 163`}
                      strokeLinecap="round"
                    />
                    <defs>
                      <linearGradient id="dbGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#ef4444" />
                        <stop offset="100%" stopColor="#22c55e" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-lg font-bold">78</span>
                </div>
                <div>
                  <p className="text-xl font-bold">Good</p>
                  <p className="text-xs text-muted-foreground">Business age: 4 Years</p>
                  <p className="text-xs text-muted-foreground">Threshold: 60</p>
                </div>
                <ShieldCheck className="h-7 w-7 text-amber-400/70 ml-auto flex-shrink-0" />
              </div>
              <div className="mt-3 h-1.5 rounded-full bg-gradient-to-r from-emerald-400 to-orange-400" />
            </CardContent>
          </Card>

          {/* Funding */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold">Funding</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-emerald-500/10 p-2 flex-shrink-0">
                  <Wallet className="h-5 w-5 text-emerald-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold">Loan Ready</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xl font-bold">82</p>
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
                  <p className="text-base font-bold">{tokenBalance.toLocaleString()} Tokens</p>
                  <p className="text-xs text-muted-foreground">Available balance</p>
                </div>
                <span className="text-xl font-bold">{tokenBalance.toLocaleString()}</span>
              </div>
              <div className="space-y-2">
                {[
                  { icon: <FileText className="h-3 w-3" />, label: "Allocate estimates" },
                  { icon: <BarChart2 className="h-3 w-3" />, label: "Gen monthly report" },
                  { icon: <MessageSquare className="h-3 w-3" />, label: "Consult to advisor" },
                  { icon: <Lightbulb className="h-3 w-3" />, label: "Get banking recommendations" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2 text-xs text-muted-foreground">
                    {item.icon}
                    <span>{item.label}</span>
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
                <CreditCard className="h-4 w-4 text-emerald-500" />
                <span className="text-sm font-medium flex-1">PAYDEX</span>
                <span className="text-sm text-emerald-500">Good</span>
                <span className="text-muted-foreground text-lg">›</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
