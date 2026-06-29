import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Edit } from "lucide-react";

export default function RulesManagement() {
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
                {[
                  { name: "Uber Rides", condition: "Description contains 'UBER'", category: "Travel" },
                  { name: "AWS Hosting", condition: "Description contains 'AWS'", category: "Software" },
                  { name: "Stripe Payouts", condition: "Description contains 'STRIPE' AND Amount > 0", category: "Revenue" },
                  { name: "Coffee Shops", condition: "Description contains 'STARBUCKS' OR 'PEETS'", category: "Meals" },
                ].map((rule, i) => (
                  <TableRow key={i}>
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