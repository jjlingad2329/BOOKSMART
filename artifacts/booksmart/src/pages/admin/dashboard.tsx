import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Building, ShieldAlert, ArrowUpRight } from "lucide-react";

export default function AdminDashboard() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Overview</h1>
        <p className="text-muted-foreground">Platform metrics and system health.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/50 bg-secondary/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12,450</div>
            <p className="text-xs text-muted-foreground">+12% this month</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-secondary/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verified CPAs</CardTitle>
            <Building className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">482</div>
            <p className="text-xs text-muted-foreground">15 pending verification</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-secondary/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$142,300</div>
            <p className="text-xs text-muted-foreground">+8.2% from last month</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-destructive/5 border-destructive/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-destructive">System Alerts</CardTitle>
            <ShieldAlert className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">2</div>
            <p className="text-xs text-destructive/80">API rate limits approaching</p>
          </CardContent>
        </Card>
      </div>

      <Card className="col-span-4 border-border/50">
        <CardHeader>
          <CardTitle>Recent Signups</CardTitle>
          <CardDescription>Latest platform registrations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { email: "john@techcorp.com", role: "user", date: "2 mins ago" },
              { email: "sarah.j@accounting.net", role: "cpa", date: "15 mins ago", status: "pending" },
              { email: "mike@freelance.dev", role: "user", date: "1 hour ago" },
              { email: "david.cpa@firm.com", role: "cpa", date: "3 hours ago", status: "approved" },
              { email: "emily@studio.co", role: "user", date: "5 hours ago" },
            ].map((user, i) => (
              <div key={i} className="flex items-center justify-between border-b border-border/30 pb-3 last:border-0 last:pb-0">
                <div className="flex flex-col">
                  <span className="font-medium text-sm">{user.email}</span>
                  <span className="text-xs text-muted-foreground">{user.date}</span>
                </div>
                <div className="flex items-center gap-3">
                  {user.status && (
                    <Badge variant="outline" className={
                      user.status === 'pending' ? "text-yellow-500 border-yellow-500/30" : "text-emerald-500 border-emerald-500/30"
                    }>
                      {user.status}
                    </Badge>
                  )}
                  <Badge variant="secondary" className="capitalize">
                    {user.role}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}