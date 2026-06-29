import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, Wallet, ArrowUpRight } from "lucide-react";

export default function CpaEarnings() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Earnings</h1>
        <p className="text-muted-foreground">Track your income and payout history.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payout</CardTitle>
            <Wallet className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">$1,250.00</div>
            <p className="text-xs text-muted-foreground mt-1">Available on Oct 15</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Earned This Month</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">$4,800.00</div>
            <p className="text-xs text-muted-foreground mt-1">+12% vs last month</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lifetime Earnings</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">$124,500.00</div>
            <p className="text-xs text-muted-foreground mt-1">Since joining BookSmart</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>Payout History</CardTitle>
          <CardDescription>Recent transfers to your linked bank account.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md border-border/50">
            <Table>
              <TableHeader className="bg-secondary/20">
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  { date: "Oct 01, 2023", period: "Sep 15 - Sep 30", status: "Paid", amount: "$2,400.00" },
                  { date: "Sep 15, 2023", period: "Sep 01 - Sep 15", status: "Paid", amount: "$1,850.00" },
                  { date: "Sep 01, 2023", period: "Aug 15 - Aug 31", status: "Paid", amount: "$3,100.00" },
                ].map((payout, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{payout.date}</TableCell>
                    <TableCell className="text-muted-foreground">{payout.period}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-500">
                        {payout.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium">{payout.amount}</TableCell>
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