import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Coins, Trophy, Zap, Clock, ShieldCheck } from "lucide-react";

export default function Token() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">Token Wallet</h1>
        <p className="text-muted-foreground">Earn BookSmart tokens for good financial habits.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2 border-primary/20 bg-gradient-to-br from-card to-primary/5">
          <CardContent className="p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center sm:text-left">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Current Balance</p>
              <div className="flex items-end justify-center sm:justify-start gap-2">
                <Coins className="h-10 w-10 text-primary mb-1" />
                <span className="text-5xl font-bold text-foreground">1,250</span>
                <span className="text-xl text-muted-foreground mb-1 font-medium">BS</span>
              </div>
            </div>
            <div className="bg-card p-4 rounded-xl border border-border/50 text-center min-w-[150px]">
              <Trophy className="h-6 w-6 text-yellow-500 mx-auto mb-2" />
              <div className="text-2xl font-bold">5 Days</div>
              <div className="text-xs text-muted-foreground">Login Streak</div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Ways to Earn</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Daily Login</span>
              </div>
              <Badge variant="secondary" className="text-primary">+10 BS</Badge>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Categorize 10 items</span>
              </div>
              <Badge variant="secondary" className="text-primary">+50 BS</Badge>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Implement AI Strategy</span>
              </div>
              <Badge variant="secondary" className="text-primary">+200 BS</Badge>
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full">View All Quests</Button>
          </CardFooter>
        </Card>
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { reason: "Daily Login Streak - Day 5", amount: "+20", date: "Today", type: "earn" },
              { reason: "Categorized 50 pending transactions", amount: "+150", date: "Yesterday", type: "earn" },
              { reason: "CPA Consultation (15 mins)", amount: "-500", date: "Oct 12, 2023", type: "spend" },
              { reason: "Implemented Tax Strategy: Home Office", amount: "+200", date: "Oct 10, 2023", type: "earn" },
            ].map((tx, i) => (
              <div key={i} className="flex justify-between items-center border-b border-border/30 pb-3 last:border-0 last:pb-0">
                <div>
                  <div className="font-medium text-sm">{tx.reason}</div>
                  <div className="text-xs text-muted-foreground">{tx.date}</div>
                </div>
                <div className={`font-bold ${tx.type === 'earn' ? 'text-primary' : 'text-destructive'}`}>
                  {tx.amount} BS
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}