import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ArrowRight, Zap } from "lucide-react";

export default function AiStrategy() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            AI Tax Strategies <Sparkles className="h-6 w-6 text-primary" />
          </h1>
          <p className="text-muted-foreground">Personalized tax-saving opportunities based on your data.</p>
        </div>
        <Button variant="outline" className="gap-2">
          <Zap className="h-4 w-4" /> Recalculate Now
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[
          {
            title: "Home Office Deduction",
            description: "Based on your lease payments, you could qualify for a substantial home office deduction. We suggest allocating 15% of your rent.",
            savings: "$1,850",
            difficulty: "Medium",
            status: "New"
          },
          {
            title: "S-Corp Election",
            description: "Your net income has exceeded $80,000. Electing S-Corp status could save you significantly on self-employment taxes.",
            savings: "$4,200",
            difficulty: "Hard",
            status: "Recommended"
          },
          {
            title: "QBI Deduction",
            description: "As a pass-through entity, you likely qualify for the 20% Qualified Business Income deduction. Let's ensure your categories are set correctly.",
            savings: "$3,100",
            difficulty: "Easy",
            status: "Action Required"
          }
        ].map((strategy, i) => (
          <Card key={i} className="border-primary/20 bg-gradient-to-b from-card to-primary/5 flex flex-col">
            <CardHeader>
              <div className="flex justify-between items-start mb-2">
                <Badge variant="outline" className={
                  strategy.status === 'Recommended' ? "text-primary border-primary/30 bg-primary/10" :
                  strategy.status === 'Action Required' ? "text-destructive border-destructive/30 bg-destructive/10" :
                  "text-emerald-500 border-emerald-500/30 bg-emerald-500/10"
                }>
                  {strategy.status}
                </Badge>
                <Badge variant="secondary">{strategy.difficulty}</Badge>
              </div>
              <CardTitle className="text-xl">{strategy.title}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
              <p className="text-sm text-muted-foreground mb-4">{strategy.description}</p>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Estimated Savings</span>
                <div className="text-2xl font-bold text-primary">{strategy.savings}</div>
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full gap-2">
                Apply Strategy <ArrowRight className="h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}