import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import { Plus, Trash2, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Rule = { id: number; name: string; condition: string; category: string };

const INITIAL_RULES: Rule[] = [
  { id: 1, name: "Uber Rides", condition: "Description contains 'UBER'", category: "Travel" },
  { id: 2, name: "AWS Hosting", condition: "Description contains 'AWS'", category: "Software" },
  { id: 3, name: "Stripe Payouts", condition: "Description contains 'STRIPE' AND Amount > 0", category: "Revenue" },
  { id: 4, name: "Coffee Shops", condition: "Description contains 'STARBUCKS' OR 'PEETS'", category: "Meals" },
];

export default function RulesManagement() {
  const { toast } = useToast();
  const [rules, setRules] = useState<Rule[]>(INITIAL_RULES);
  const [toDelete, setToDelete] = useState<Rule | null>(null);

  function handleDelete() {
    if (!toDelete) return;
    setRules((prev) => prev.filter((r) => r.id !== toDelete.id));
    toast({ title: "Rule deleted", description: `"${toDelete.name}" has been removed.` });
    setToDelete(null);
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Category Rules</h1>
          <p className="text-muted-foreground">Automate your bookkeeping with smart transaction rules.</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> Create Rule
        </Button>
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>Active Rules</CardTitle>
          <CardDescription>Incoming transactions matching these conditions will be auto-categorized.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md border-border/50">
            <Table>
              <TableHeader className="bg-secondary/20">
                <TableRow>
                  <TableHead>Rule Name</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>Assign Category</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell className="font-medium">{rule.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{rule.condition}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{rule.category}</Badge>
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
                          onClick={() => setToDelete(rule)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {rules.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">No rules found.</TableCell>
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
            <AlertDialogTitle>Delete rule?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the rule <strong>"{toDelete?.name}"</strong>. Future transactions matching this condition will no longer be auto-categorized.
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
