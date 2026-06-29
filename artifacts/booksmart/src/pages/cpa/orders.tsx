import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Filter, MoreHorizontal, CheckCircle, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function CpaOrders() {
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
          <CardDescription>Track status and deadlines for all client work.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-4">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search client or ID..." className="pl-9 h-9" />
            </div>
            <Button variant="outline" size="sm" className="h-9 gap-2">
              <Filter className="h-3 w-3" /> Filter
            </Button>
          </div>

          <div className="border rounded-md border-border/50">
            <Table>
              <TableHeader className="bg-secondary/20">
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  { id: "ORD-8092", client: "Acme Corp LLC", service: "2023 Tax Filing", deadline: "Oct 15, 2023", amount: "$450.00", status: "active" },
                  { id: "ORD-8093", client: "Sarah's Studio", service: "Consultation", deadline: "Nov 01, 2023", amount: "$150.00", status: "pending" },
                ].map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium text-primary">{order.id}</TableCell>
                    <TableCell>{order.client}</TableCell>
                    <TableCell>{order.service}</TableCell>
                    <TableCell className="text-muted-foreground">{order.deadline}</TableCell>
                    <TableCell>{order.amount}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        order.status === 'completed' ? "text-emerald-500 border-emerald-500/30" : 
                        order.status === 'active' ? "text-primary border-primary/30 bg-primary/10" : 
                        "text-yellow-500 border-yellow-500/30"
                      }>
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground hover:text-primary">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}