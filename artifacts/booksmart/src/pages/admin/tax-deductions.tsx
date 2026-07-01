import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Strategy = { id: number; title: string; condition: string; savings: string };

const INITIAL_STRATEGIES: Strategy[] = [
  { id: 1, title: "Home Office Deduction", condition: "High rent/mortgage + WFH status", savings: "$1,500+" },
  { id: 2, title: "Vehicle Mileage", condition: "Gas/Auto repairs > $500/mo", savings: "$800+" },
  { id: 3, title: "S-Corp Election", condition: "Net profit > $80k", savings: "$4,000+" },
  { id: 4, title: "QBI Deduction", condition: "Pass-through entity", savings: "Up to 20%" },
];

export default function AdminTaxDeductions() {
  const { toast } = useToast();
  const [strategies, setStrategies] = useState<Strategy[]>(INITIAL_STRATEGIES);
  const [toDelete, setToDelete] = useState<Strategy | null>(null);

  function handleDelete() {
    if (!toDelete) return;
    setStrategies((prev) => prev.filter((s) => s.id !== toDelete.id));
    toast({ title: "Strategy deleted", description: `"${toDelete.title}" has been removed.` });
    setToDelete(null);
  }

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
                {strategies.map((strat) => (
                  <TableRow key={strat.id}>
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
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => setToDelete(strat)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {strategies.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">No strategies found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!toDelete} onOpenChange={(open) => { if (!open) setToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete strategy?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove <strong>"{toDelete?.title}"</strong>. Users will no longer receive this AI tax suggestion.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
