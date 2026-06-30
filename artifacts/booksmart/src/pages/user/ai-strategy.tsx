import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Sparkles, ArrowRight, Zap, Loader2, RefreshCw, AlertCircle } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Difficulty = "Easy" | "Medium" | "Hard";
type Status = "New" | "Recommended" | "Action Required";

type Strategy = {
  title: string;
  description: string;
  savings: number;
  difficulty: Difficulty;
  status: Status;
  action_steps?: string[];
};

type Transaction = {
  id: number;
  title: string;
  amount: number;
  type: string;
  date_time: string;
  description: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMoney(v: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(v);
}

function startOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}

function statusColor(status: Status) {
  if (status === "Recommended") return "text-primary border-primary/30 bg-primary/10";
  if (status === "Action Required") return "text-destructive border-destructive/30 bg-destructive/10";
  return "text-emerald-500 border-emerald-500/30 bg-emerald-500/10";
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AiStrategy() {
  const { profile } = useAuth();
  const { toast } = useToast();

  const numericId = profile?.numericId ?? null;
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [generating, setGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);

  // ── Org lookup ──────────────────────────────────────────────────────────────
  const { data: orgId } = useQuery<number | null>({
    queryKey: ["user_org_strat", numericId],
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

  // ── Transactions this month ─────────────────────────────────────────────────
  const { data: monthTxs = [] } = useQuery<Transaction[]>({
    queryKey: ["tx_month_strat", orgId],
    enabled: orgId !== null,
    queryFn: async () => {
      const { data } = await supabase
        .from("transactions")
        .select("id, title, amount, type, date_time, description")
        .eq("org_id", orgId!)
        .gte("date_time", startOfMonth())
        .order("date_time", { ascending: false });
      return data ?? [];
    },
  });

  // ── All-time transactions (up to 50 most recent) ────────────────────────────
  const { data: allTxs = [] } = useQuery<Transaction[]>({
    queryKey: ["tx_all_strat", orgId],
    enabled: orgId !== null,
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("transactions")
        .select("id, title, amount, type, date_time, description")
        .eq("org_id", orgId!)
        .order("date_time", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  // ── Derived metrics ────────────────────────────────────────────────────────
  const income = monthTxs.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const expenses = Math.abs(monthTxs.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0));
  const netProfit = income - expenses;
  const annualizedIncome = income * 12;

  // ── Generate strategies via AI ─────────────────────────────────────────────
  const generate = useCallback(async () => {
    setGenerating(true);
    try {
      const txLines = allTxs
        .slice(0, 40)
        .map((t) => `${t.date_time.split("T")[0]}: ${t.title} ${t.amount >= 0 ? "+" : ""}$${Math.abs(t.amount).toFixed(2)}`)
        .join("\n");

      const prompt = `You are an expert US tax strategist for freelancers and small businesses. Analyze the following financial data and generate personalized, actionable tax-saving strategies.

FINANCIAL SUMMARY:
- Monthly income: $${income.toFixed(2)}
- Monthly expenses: $${expenses.toFixed(2)}
- Net profit (month): $${netProfit.toFixed(2)}
- Annualized income (estimate): $${annualizedIncome.toFixed(2)}
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
- Include exactly 5 strategies
- Make descriptions specific to their income level and transaction patterns`;

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

      if (!res.ok) throw new Error(`Request failed: ${res.status} ${res.statusText}`);

      const aiData = await res.json() as { choices?: { message?: { content?: string } }[] };
      const content = aiData.choices?.[0]?.message?.content ?? "";

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Could not parse AI response — unexpected format");

      const parsed = JSON.parse(jsonMatch[0]) as { strategies: Strategy[] };
      if (!Array.isArray(parsed.strategies) || parsed.strategies.length === 0) {
        throw new Error("AI returned no strategies");
      }

      setStrategies(parsed.strategies);
      setHasGenerated(true);
      toast({ title: "Strategies updated!", description: `${parsed.strategies.length} personalized strategies generated.` });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast({
        title: "Failed to generate strategies",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  }, [allTxs, monthTxs, income, expenses, netProfit, annualizedIncome, toast]);

  const totalSavings = strategies.reduce((s, st) => s + (st.savings ?? 0), 0);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            AI Tax Strategies <Sparkles className="h-6 w-6 text-primary" />
          </h1>
          <p className="text-muted-foreground">
            Personalized tax-saving opportunities based on your data.
          </p>
        </div>
        <Button
          variant="outline"
          className="gap-2"
          onClick={generate}
          disabled={generating}
        >
          {generating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : hasGenerated ? (
            <RefreshCw className="h-4 w-4" />
          ) : (
            <Zap className="h-4 w-4" />
          )}
          {generating ? "Analyzing…" : hasGenerated ? "Recalculate" : "Recalculate Now"}
        </Button>
      </div>

      {/* Summary banner — shown after generation */}
      {hasGenerated && totalSavings > 0 && (
        <div className="rounded-xl border border-primary/20 bg-gradient-to-r from-primary/10 to-emerald-500/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">Total savings potential identified</p>
            <p className="text-3xl font-bold text-emerald-400">{formatMoney(totalSavings)}</p>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><Sparkles className="h-3.5 w-3.5 text-primary" /> {strategies.length} strategies</span>
            <span>·</span>
            <span>Based on {allTxs.length} transactions</span>
          </div>
        </div>
      )}

      {/* Empty / loading / error state */}
      {!hasGenerated && !generating && (
        <div className="rounded-xl border border-dashed border-border/50 bg-secondary/10 p-12 flex flex-col items-center text-center gap-4">
          <div className="rounded-full bg-primary/10 p-4">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <div>
            <p className="text-lg font-semibold">No strategies generated yet</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Click <strong>Recalculate Now</strong> to analyze your transactions and get personalized US tax-saving strategies.
            </p>
          </div>
          <Button onClick={generate} className="gap-2">
            <Zap className="h-4 w-4" /> Generate My Strategies
          </Button>
        </div>
      )}

      {generating && (
        <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-12 flex flex-col items-center text-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <div>
            <p className="text-lg font-semibold">Analyzing your finances…</p>
            <p className="text-sm text-muted-foreground mt-1">
              AI is reviewing {allTxs.length} transaction{allTxs.length !== 1 ? "s" : ""} to find your best tax opportunities.
            </p>
          </div>
        </div>
      )}

      {/* Strategy cards — exact same design as original */}
      {hasGenerated && !generating && strategies.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {strategies.map((strategy, i) => (
            <Card key={i} className="border-primary/20 bg-gradient-to-b from-card to-primary/5 flex flex-col">
              <CardHeader>
                <div className="flex justify-between items-start mb-2">
                  <Badge
                    variant="outline"
                    className={statusColor(strategy.status)}
                  >
                    {strategy.status}
                  </Badge>
                  <Badge variant="secondary">{strategy.difficulty}</Badge>
                </div>
                <CardTitle className="text-xl">{strategy.title}</CardTitle>
              </CardHeader>
              <CardContent className="flex-1">
                <p className="text-sm text-muted-foreground mb-4">
                  {strategy.description}
                </p>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                    Estimated Savings
                  </span>
                  <div className="text-2xl font-bold text-primary">
                    {formatMoney(strategy.savings)}
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full gap-2"
                  onClick={() => setSelectedStrategy(strategy)}
                >
                  Apply Strategy <ArrowRight className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Apply Strategy dialog */}
      <Dialog open={!!selectedStrategy} onOpenChange={(open) => !open && setSelectedStrategy(null)}>
        {selectedStrategy && (
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className={statusColor(selectedStrategy.status)}>
                  {selectedStrategy.status}
                </Badge>
                <Badge variant="secondary">{selectedStrategy.difficulty}</Badge>
              </div>
              <DialogTitle className="text-xl">{selectedStrategy.title}</DialogTitle>
              <DialogDescription>{selectedStrategy.description}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="rounded-lg bg-primary/10 border border-primary/20 px-4 py-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">
                  Estimated Annual Savings
                </p>
                <p className="text-3xl font-bold text-primary">{formatMoney(selectedStrategy.savings)}</p>
              </div>

              {selectedStrategy.action_steps && selectedStrategy.action_steps.length > 0 && (
                <div>
                  <p className="text-sm font-semibold mb-2">Action Steps</p>
                  <ol className="space-y-2">
                    {selectedStrategy.action_steps.map((step, i) => (
                      <li key={i} className="flex gap-3 text-sm text-muted-foreground">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-bold mt-0.5">
                          {i + 1}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
                <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  These are AI-generated suggestions. Consult a licensed CPA before implementing any tax strategy.
                </p>
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
