import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2 } from "lucide-react";

export default function AdminTaxDeductions() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tax Deductions</h1>
          <p className="text-muted-foreground">Manage rules for AI-powered deduction suggestions.</p>
        </div>
        <Button className="gap-2 bg-primary">
          <Plus className="h-4 w-4" /> Add Strategy
        </Button>
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>AI Tax Strategies</CardTitle>
          <CardDescription>These strategies are suggested to users based on their transaction history.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md border-border/50">
            <Table>
              <TableHeader className="bg-secondary/20">
                <TableRow>
                  <TableHead>Strategy Title</TableHead>
                  <TableHead>Trigger Condition</TableHead>
                  <TableHead>Avg. Savings</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  { title: "Home Office Deduction", condition: "High rent/mortgage + WFH status", savings: "$1,500+" },
                  { title: "Vehicle Mileage", condition: "Gas/Auto repairs > $500/mo", savings: "$800+" },
                  { title: "S-Corp Election", condition: "Net profit > $80k", savings: "$4,000+" },
                  { title: "QBI Deduction", condition: "Pass-through entity", savings: "Up to 20%" },
                ].map((strat, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{strat.title}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{strat.condition}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-primary">{strat.savings}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
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