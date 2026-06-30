import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2, MessageSquare, ChevronRight, FileText } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface Order {
  id: number;
  user_id: number;
  cpa_id: number;
  title: string;
  services: string[];
  description: string;
  status: string;
  payment_status: string;
  amount: number;
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
  return fullName(u).slice(0, 2).toUpperCase();
}

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

const STATUS_OPTIONS = ["pending", "active", "completed", "cancelled"];

const statusColor = (s: string) => {
  if (s === "completed") return "text-emerald-500 border-emerald-500/30 bg-emerald-500/10";
  if (s === "active") return "text-primary border-primary/30 bg-primary/10";
  if (s === "cancelled") return "text-rose-500 border-rose-500/30 bg-rose-500/10";
  return "text-yellow-500 border-yellow-500/30 bg-yellow-500/10";
};

export default function CpaOrders() {
  const { profile } = useAuth();
  const numericId = profile?.numericId as number | undefined;
  const qc = useQueryClient();
  const [, navigate] = useLocation();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [newStatus, setNewStatus] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [userMap, setUserMap] = useState<Record<number, UserRow>>({});

  // ── All orders for this CPA ────────────────────────────────────────────────
  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ["cpa_orders", numericId],
    enabled: !!numericId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id,user_id,cpa_id,title,services,description,status,payment_status,amount,created_at")
        .eq("cpa_id", numericId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // ── Fetch user display names ───────────────────────────────────────────────
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

  // ── Update order (status + amount) ────────────────────────────────────────
  const updateOrder = useMutation({
    mutationFn: async ({ id, status, amount }: { id: number; status: string; amount: number }) => {
      const { error } = await supabase
        .from("orders")
        .update({ status, amount })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      toast.success("Order updated.");
      qc.invalidateQueries({ queryKey: ["cpa_orders", numericId] });
      qc.invalidateQueries({ queryKey: ["cpa_leads", numericId] });
      if (selectedOrder) {
        setSelectedOrder({ ...selectedOrder, status: vars.status, amount: vars.amount });
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filtered = orders.filter((o) => {
    const client = userMap[o.user_id];
    const nameMatch = !search ||
      o.title.toLowerCase().includes(search.toLowerCase()) ||
      (client && fullName(client).toLowerCase().includes(search.toLowerCase()));
    const statusMatch = statusFilter === "all" || o.status === statusFilter;
    return nameMatch && statusMatch;
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Active Orders</h1>
          <p className="text-muted-foreground">Manage your current client engagements.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search orders..."
            className="pl-9 h-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 h-9">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Order Cards */}
      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="py-16 text-center">
            <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="text-muted-foreground">No orders found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => {
            const client = userMap[order.user_id];
            return (
              <Card
                key={order.id}
                className="border-border/50 hover:border-primary/40 transition-colors cursor-pointer"
                onClick={() => {
                  setSelectedOrder(order);
                  setNewStatus(order.status);
                  setNewAmount(String(order.amount ?? 0));
                }}
              >
                <CardContent className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-sm font-semibold text-primary">
                      {client ? initials(client) : "#"}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-semibold truncate">{order.title}</p>
                        <span className="text-xs text-muted-foreground shrink-0">#{order.id}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {client ? fullName(client) : `Client #${order.user_id}`}
                        {" · "}
                        {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                      </p>
                    </div>

                    {/* Amount */}
                    <span className="text-sm font-semibold text-primary shrink-0">
                      {fmtCurrency(order.amount ?? 0)}
                    </span>

                    {/* Status badge */}
                    <Badge
                      variant="outline"
                      className={`capitalize text-xs shrink-0 ${statusColor(order.status)}`}
                    >
                      {order.status}
                    </Badge>

                    {/* Chat + chevron */}
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                        title="Chat with client"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate("/chat");
                        }}
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>

                  {/* Services */}
                  {order.services?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2 ml-13">
                      {order.services.map((s, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Order detail dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={(o) => !o && setSelectedOrder(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Order #{selectedOrder?.id}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Client</div>
                  <div className="font-medium">
                    {userMap[selectedOrder.user_id]
                      ? fullName(userMap[selectedOrder.user_id])
                      : `Client #${selectedOrder.user_id}`}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Fee Amount ($)</div>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    className="h-9"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Payment</div>
                  <div className="font-medium capitalize">{selectedOrder.payment_status}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Received</div>
                  <div className="font-medium">{new Date(selectedOrder.created_at).toLocaleDateString()}</div>
                </div>
              </div>

              {selectedOrder.services?.length > 0 && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Services</div>
                  <div className="flex flex-wrap gap-1">
                    {selectedOrder.services.map((s, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">{s}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedOrder.description && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Description</div>
                  <p className="text-muted-foreground bg-secondary/10 p-3 rounded-md text-sm">
                    {selectedOrder.description}
                  </p>
                </div>
              )}

              <div>
                <div className="text-xs text-muted-foreground mb-1">Update Status</div>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedOrder(null)}>Close</Button>
            <Button
              disabled={
                !selectedOrder ||
                updateOrder.isPending ||
                (newStatus === selectedOrder.status && Number(newAmount) === (selectedOrder.amount ?? 0))
              }
              onClick={() => {
                if (!selectedOrder) return;
                updateOrder.mutate({
                  id: selectedOrder.id,
                  status: newStatus,
                  amount: Math.max(0, Number(newAmount) || 0),
                });
              }}
            >
              {updateOrder.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
