import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Eye, Loader2, FileText } from "lucide-react";
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

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [newStatus, setNewStatus] = useState("");
  const [userMap, setUserMap] = useState<Record<number, UserRow>>({});

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
  });

  // ── User names ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const ids = [...new Set(orders.map((o) => o.user_id))];
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

  // ── Update order status ────────────────────────────────────────────────────
  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const { error } = await supabase.from("orders").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Order status updated.");
      qc.invalidateQueries({ queryKey: ["cpa_orders", numericId] });
      qc.invalidateQueries({ queryKey: ["cpa_leads", numericId] });
      if (selectedOrder) setSelectedOrder({ ...selectedOrder, status: newStatus });
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

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>All Orders</CardTitle>
          <CardDescription>Track status and progress for all client work.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search client or order..."
                className="pl-9 h-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-40">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2 text-muted-foreground">
              <FileText className="h-8 w-8 opacity-30" />
              <p className="text-sm">No orders found.</p>
            </div>
          ) : (
            <div className="border rounded-md border-border/50 overflow-auto">
              <Table>
                <TableHeader className="bg-secondary/20">
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Received</TableHead>
                    <TableHead className="text-right">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((order) => {
                    const client = userMap[order.user_id];
                    return (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium text-primary">#{order.id}</TableCell>
                        <TableCell>{client ? fullName(client) : `Client #${order.user_id}`}</TableCell>
                        <TableCell className="max-w-[160px] truncate">{order.title}</TableCell>
                        <TableCell>{fmtCurrency(order.amount ?? 0)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`capitalize ${statusColor(order.status)}`}>
                            {order.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-muted-foreground hover:text-primary"
                            onClick={() => {
                              setSelectedOrder(order);
                              setNewStatus(order.status);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

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
                  <div className="text-xs text-muted-foreground mb-1">Amount</div>
                  <div className="font-medium">{fmtCurrency(selectedOrder.amount ?? 0)}</div>
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
              disabled={!selectedOrder || newStatus === selectedOrder.status || updateStatus.isPending}
              onClick={() => {
                if (selectedOrder && newStatus !== selectedOrder.status) {
                  updateStatus.mutate({ id: selectedOrder.id, status: newStatus });
                }
              }}
            >
              {updateStatus.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
