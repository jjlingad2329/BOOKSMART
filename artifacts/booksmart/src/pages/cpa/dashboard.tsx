import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Users, FileText, Clock, Loader2, MessageSquare } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";
import { formatDistanceToNow } from "date-fns";

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
  cpa_payout_status: string | null;
  created_at: string;
}

interface Chat {
  id: number;
  sender_id: number;
  receiver_id: number;
  last_message: string;
  last_message_time: string;
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

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

export default function CpaDashboard() {
  const { profile } = useAuth();
  const numericId = profile?.numericId as number | undefined;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  // ── Orders ────────────────────────────────────────────────────────────────
  const { data: orders = [], isLoading: ordersLoading } = useQuery<Order[]>({
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

  // ── Chats (recent activity) ───────────────────────────────────────────────
  const { data: chats = [] } = useQuery<Chat[]>({
    queryKey: ["chats", numericId],
    enabled: !!numericId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chats")
        .select("*")
        .or(`sender_id.eq.${numericId},receiver_id.eq.${numericId}`)
        .order("last_message_time", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
  });

  // ── User names ─────────────────────────────────────────────────────────────
  const [userMap, setUserMap] = useState<Record<number, UserRow>>({});
  useEffect(() => {
    const ids = [
      ...new Set([
        ...orders.map((o) => o.user_id),
        ...chats.map((c) => (c.sender_id === numericId ? c.receiver_id : c.sender_id)),
      ]),
    ].filter(Boolean);
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
  }, [orders, chats, numericId]);

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const pendingLeads = orders.filter((o) => o.status === "pending").length;
  const activeOrders = orders.filter((o) => o.status === "active").length;
  // All unique clients who have ever placed an order with this CPA
  const activeClients = new Set(orders.map((o) => o.user_id)).size;
  // Use cpa_payout_amount (after platform fee) when available, fallback to amount
  const monthlyEarnings = orders
    .filter((o) => o.status === "completed" && o.created_at >= monthStart)
    .reduce((s, o) => s + (o.cpa_payout_amount ?? o.amount ?? 0), 0);

  const recentOrders = orders.slice(0, 5);

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

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {ordersLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
              <>
                <div className="text-2xl font-bold">{activeClients}</div>
                <p className="text-xs text-muted-foreground">
                  {activeClients === 1 ? "client" : "clients"} with orders
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Leads</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            {ordersLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
              <>
                <div className="text-2xl font-bold">{pendingLeads}</div>
                <p className="text-xs text-muted-foreground">awaiting your response</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            {ordersLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
              <>
                <div className="text-2xl font-bold">{fmtCurrency(monthlyEarnings)}</div>
                <p className="text-xs text-muted-foreground">your payout from completed orders</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
            <FileText className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            {ordersLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
              <>
                <div className="text-2xl font-bold">{activeOrders}</div>
                <p className="text-xs text-muted-foreground">orders in progress</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Orders */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {ordersLoading ? (
              <div className="flex items-center justify-center h-20"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : recentOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No orders yet.</p>
            ) : (
              <div className="space-y-3">
                {recentOrders.map((o) => (
                  <div key={o.id} className="flex flex-col gap-1 border-b border-border/30 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate">{o.title}</span>
                      <Badge variant="outline" className={`text-[10px] shrink-0 ml-2 ${statusColor(o.status)}`}>
                        {o.status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {userMap[o.user_id] ? fullName(userMap[o.user_id]) : `Client #${o.user_id}`}
                      </span>
                      <span className="text-xs font-medium text-primary">{fmtCurrency(o.amount ?? 0)}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(o.created_at), { addSuffix: true })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Chats */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Recent Messages</CardTitle>
          </CardHeader>
          <CardContent>
            {chats.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No conversations yet.</p>
            ) : (
              <div className="space-y-3">
                {chats.map((c) => {
                  const otherId = c.sender_id === numericId ? c.receiver_id : c.sender_id;
                  const other = userMap[otherId];
                  return (
                    <div key={c.id} className="flex items-start gap-3 border-b border-border/30 pb-3 last:border-0 last:pb-0">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <MessageSquare className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium truncate">
                            {other ? fullName(other) : `User #${otherId}`}
                          </span>
                          <span className="text-[10px] text-muted-foreground ml-2 whitespace-nowrap">
                            {c.last_message_time ? formatDistanceToNow(new Date(c.last_message_time), { addSuffix: true }) : ""}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{c.last_message || "No messages"}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
