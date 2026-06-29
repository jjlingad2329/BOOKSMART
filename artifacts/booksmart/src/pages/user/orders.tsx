import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Filter, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function Orders() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
          <p className="text-muted-foreground">Manage your active and past CPA service orders.</p>
        </div>
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>Order History</CardTitle>
          <CardDescription>Track the status of your tax prep and consultation orders.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-4">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search orders..." className="pl-9 h-9" />
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
                  <TableHead>CPA Name</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  { id: "ORD-8092", cpa: "Sarah Jenkins, CPA", service: "2023 Tax Filing", date: "Oct 12, 2023", amount: "$450.00", status: "completed" },
                  { id: "ORD-8093", cpa: "Michael Chen", service: "Q3 Consultation", date: "Nov 05, 2023", amount: "$150.00", status: "completed" },
                  { id: "ORD-8094", cpa: "Elena Rodriguez, CPA", service: "Business Structuring", date: "Dec 10, 2023", amount: "$800.00", status: "active" },
                  { id: "ORD-8095", cpa: "David Kim, CPA", service: "1099 Review", date: "Jan 15, 2024", amount: "$250.00", status: "pending" },
                ].map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium text-primary">{order.id}</TableCell>
                    <TableCell>{order.cpa}</TableCell>
                    <TableCell>{order.service}</TableCell>
                    <TableCell className="text-muted-foreground">{order.date}</TableCell>
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
                      <Button variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground hover:text-primary hover:bg-primary/10">
                        <Eye className="h-4 w-4" />
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