import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, FileText, TrendingUp, Loader2, MessageSquare, CheckCircle2, XCircle } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";
import { formatDistanceToNow } from "date-fns";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface Order {
  id: number;
  user_id: number;
  cpa_id: number;
  title: string;
  services: string[] | null;
  status: string;
  payment_status: string;
  amount: number;
  cpa_payout_amount: number | null;
  created_at: string;
}

interface UserRow {
  id: number;
  first_name: string | null;
  last_name: string | null;
  email: string;
}

function fullName(u: UserRow) {
  return [u.first_name, u.last_name].filter(Boolean).join(" ") || u.email;
}

function initials(u: UserRow) {
  const n = fullName(u);
  return n.slice(0, 2).toUpperCase();
}

export default function CpaDashboard() {
  const { profile } = useAuth();
  const numericId = profile?.numericId as number | undefined;
  const [, navigate] = useLocation();
  const qc = useQueryClient();

  // ── All orders for this CPA ────────────────────────────────────────────────
  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ["cpa_orders", numericId],
    enabled: !!numericId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("cpa_id", numericId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });

  // ── User names ─────────────────────────────────────────────────────────────
  const [userMap, setUserMap] = useState<Record<number, UserRow>>({});
  useEffect(() => {
    const ids = [...new Set(orders.map((o) => o.user_id))].filter(Boolean);
    if (!ids.length) return;
    supabase
      .from("users")
      .select("id,first_name,last_name,email")
      .in("id", ids)
      .then(({ data }) => {
        if (!data) return;
        const m: Record<number, UserRow> = {};
        for (const u of data) m[u.id] = u;
        setUserMap(m);
      });
  }, [orders]);

  // ── Accept / Decline leads ─────────────────────────────────────────────────
  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const { error } = await supabase.from("orders").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      toast.success(status === "active" ? "Lead accepted." : "Lead declined.");
      qc.invalidateQueries({ queryKey: ["cpa_orders", numericId] });
      qc.invalidateQueries({ queryKey: ["cpa_leads", numericId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── KPIs (matching original Flutter) ──────────────────────────────────────
  const totalLeads = orders.length;
  const acceptedOrders = orders.filter((o) =>
    ["active", "completed"].includes(o.status)
  );
  const ordersCount = acceptedOrders.length;
  const acceptedClients = new Set(acceptedOrders.map((o) => o.user_id)).size;
  const conversionRate =
    totalLeads === 0 ? 0 : Math.round((ordersCount / totalLeads) * 100);

  // ── Leads vs Orders chart (last 6 months) ──────────────────────────────────
  const chartData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const start = d.toISOString();
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString();
      const month = d.toLocaleString("default", { month: "short" });
      const leads = orders.filter(
        (o) => o.created_at >= start && o.created_at < end
      ).length;
      const accepted = orders.filter(
        (o) =>
          o.created_at >= start &&
          o.created_at < end &&
          ["active", "completed"].includes(o.status)
      ).length;
      return { month, Leads: leads, Orders: accepted };
    });
  }, [orders]);

  // ── Recent Leads (pending) ──────────────────────────────────────────────────
  const recentLeads = orders.filter((o) => o.status === "pending").slice(0, 5);

  const statusColor = (s: string) => {
    if (s === "completed") return "text-emerald-500 border-emerald-500/30 bg-emerald-500/10";
    if (s === "active") return "text-primary border-primary/30 bg-primary/10";
    if (s === "cancelled") return "text-rose-500 border-rose-500/30 bg-rose-500/10";
    return "text-yellow-500 border-yellow-500/30 bg-yellow-500/10";
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">CPA Dashboard</h1>
        <p className="text-muted-foreground">Manage your clients, leads, and firm analytics.</p>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {/* Total Leads */}
        <Card className="border-border/50">
          <CardContent className="pt-5 pb-5">
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-yellow-500/10 flex items-center justify-center shrink-0">
                  <TrendingUp className="h-5 w-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Total Leads</p>
                  <p className="text-3xl font-bold text-yellow-500">{totalLeads}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Orders */}
        <Card className="border-border/50">
          <CardContent className="pt-5 pb-5">
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Orders</p>
                  <p className="text-3xl font-bold text-primary">{ordersCount}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Accepted Clients */}
        <Card className="border-border/50">
          <CardContent className="pt-5 pb-5">
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <Users className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Accepted Clients</p>
                  <p className="text-3xl font-bold text-emerald-500">{acceptedClients}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Conversion Rate */}
        <Card className="border-border/50">
          <CardContent className="pt-5 pb-5">
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                  <TrendingUp className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Conversion Rate</p>
                  <p className="text-3xl font-bold text-blue-500">{conversionRate}%</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Leads vs Orders Chart ── */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Leads vs Orders (Monthly)</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-[220px]">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} barGap={6} barCategoryGap="30%">
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                />
                <YAxis hide allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                  iconType="circle"
                  iconSize={8}
                />
                <Bar dataKey="Leads" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Orders" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* ── Recent Leads ── */}
      <div>
        <h2 className="text-base font-semibold mb-3">Recent Leads</h2>
        {isLoading ? (
          <div className="flex items-center justify-center h-24">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : recentLeads.length === 0 ? (
          <Card className="border-border/50">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No pending leads right now.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {recentLeads.map((lead) => {
              const client = userMap[lead.user_id];
              const name = client ? fullName(client) : `Client #${lead.user_id}`;
              const avatarText = client ? initials(client) : "?";
              const isPending = updateStatus.isPending;
              return (
                <Card key={lead.id} className="border-border/50 hover:border-primary/40 transition-colors">
                  <CardContent className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-sm font-semibold text-primary">
                        {avatarText}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{name}</p>
                        <p className="text-xs text-muted-foreground">
                          Received {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
                        </p>
                        {lead.title && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{lead.title}</p>
                        )}
                      </div>

                      {/* Badge */}
                      <Badge variant="outline" className={`text-[10px] shrink-0 ${statusColor(lead.status)}`}>
                        {lead.status}
                      </Badge>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                          title="Chat with client"
                          onClick={() => navigate("/chat")}
                        >
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-emerald-500 hover:bg-emerald-500/10"
                          title="Accept lead"
                          disabled={isPending}
                          onClick={() => updateStatus.mutate({ id: lead.id, status: "active" })}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-rose-500 hover:bg-rose-500/10"
                          title="Decline lead"
                          disabled={isPending}
                          onClick={() => updateStatus.mutate({ id: lead.id, status: "cancelled" })}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
