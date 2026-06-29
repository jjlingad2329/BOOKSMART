import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, ArrowDownRight, DollarSign, Wallet, Users, FileText, CheckCircle2 } from "lucide-react";

export default function CpaDashboard() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">CPA Dashboard</h1>
        <p className="text-muted-foreground">Manage your clients, leads, and firm analytics.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-muted-foreground">+3 this month</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Leads</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">7</div>
            <p className="text-xs text-muted-foreground">2 awaiting response</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$8,450.00</div>
            <p className="text-xs text-muted-foreground">+15% from last month</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasks Due</CardTitle>
            <FileText className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">4 due within 48h</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { action: "New message from", subject: "Michael Scott", time: "2 hours ago" },
                { action: "Document uploaded by", subject: "Jim Halpert", time: "5 hours ago" },
                { action: "Payment received from", subject: "Pam Beesly", time: "1 day ago" },
                { action: "Order completed for", subject: "Dwight Schrute", time: "2 days ago" },
              ].map((act, i) => (
                <div key={i} className="flex flex-col gap-1 border-b border-border/30 pb-3 last:border-0 last:pb-0">
                  <div className="text-sm">
                    <span className="text-muted-foreground">{act.action}</span>{" "}
                    <span className="font-medium text-foreground">{act.subject}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{act.time}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Upcoming Deadlines</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { client: "Vance Refrigeration", task: "Q4 Estimated Taxes", date: "Jan 15" },
                { client: "Sabre Corp", task: "1099 Filings", date: "Jan 31" },
                { client: "Dunder Mifflin", task: "Corporate Return", date: "Mar 15" },
              ].map((task, i) => (
                <div key={i} className="flex justify-between items-center border-b border-border/30 pb-3 last:border-0 last:pb-0">
                  <div>
                    <div className="font-medium text-sm">{task.client}</div>
                    <div className="text-xs text-muted-foreground">{task.task}</div>
                  </div>
                  <Badge variant="outline" className={i === 0 ? "text-rose-500 border-rose-500/30 bg-rose-500/10" : ""}>
                    {task.date}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}