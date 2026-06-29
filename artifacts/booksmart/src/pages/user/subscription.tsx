import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

export default function Subscription() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Upgrade Your Command Center</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Choose the plan that fits your business needs. Upgrade anytime to unlock AI insights and priority CPA matching.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 mt-8">
        <Card className="border-border/50 flex flex-col">
          <CardHeader>
            <CardTitle className="text-2xl">Starter</CardTitle>
            <CardDescription>Essential tools for tracking finances.</CardDescription>
            <div className="mt-4 flex items-baseline text-4xl font-bold">
              $0
              <span className="text-lg text-muted-foreground font-normal ml-1">/mo</span>
            </div>
          </CardHeader>
          <CardContent className="flex-1">
            <ul className="space-y-3">
              {['Basic transaction tracking', 'Income & expense reports', 'Standard CPA network access', 'Limited AI tax tips'].map((feature, i) => (
                <li key={i} className="flex items-center gap-3 text-sm">
                  <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Check className="h-3 w-3 text-primary" />
                  </div>
                  {feature}
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full" disabled>Current Plan</Button>
          </CardFooter>
        </Card>

        <Card className="border-primary/50 bg-primary/5 shadow-xl shadow-primary/5 flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider">
            Popular
          </div>
          <CardHeader>
            <CardTitle className="text-2xl text-primary">Pro</CardTitle>
            <CardDescription>Advanced tools and unlimited AI strategies.</CardDescription>
            <div className="mt-4 flex items-baseline text-4xl font-bold">
              $29
              <span className="text-lg text-muted-foreground font-normal ml-1">/mo</span>
            </div>
          </CardHeader>
          <CardContent className="flex-1">
            <ul className="space-y-3">
              {[
                'Everything in Starter', 
                'Unlimited AI tax strategies', 
                'Priority CPA matching', 
                'Bulk transaction rules', 
                'Advanced tax forecasting',
                'Export to tax software'
              ].map((feature, i) => (
                <li key={i} className="flex items-center gap-3 text-sm">
                  <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                    <Check className="h-3 w-3 text-primary-foreground" />
                  </div>
                  <span className={i === 0 ? "font-semibold" : ""}>{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter>
            <Button className="w-full">Upgrade to Pro</Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}