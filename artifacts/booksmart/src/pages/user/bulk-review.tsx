import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Wand2 } from "lucide-react";

export default function BulkReview() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bulk Review</h1>
          <p className="text-muted-foreground">Quickly categorize multiple uncategorized transactions.</p>
        </div>
        <Button className="gap-2 bg-primary text-primary-foreground">
          <Wand2 className="h-4 w-4" /> AI Auto-Categorize
        </Button>
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>Needs Review (12)</CardTitle>
          <CardDescription>Select a category for each transaction to finalize them.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md border-border/50">
            <Table>
              <TableHeader className="bg-secondary/20">
                <TableRow>
                  <TableHead className="w-12"><Checkbox /></TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead className="w-64">Category</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  { date: "Oct 12, 2023", desc: "AWS CLOUD WEB SERVICES", amount: "-$145.00" },
                  { date: "Oct 11, 2023", desc: "UBER TRIP SAN FRANCISCO", amount: "-$32.50" },
                  { date: "Oct 10, 2023", desc: "UPWORK ESCROW INC", amount: "+$2,450.00" },
                  { date: "Oct 08, 2023", desc: "WEWORK MEMBERSHIP", amount: "-$400.00" },
                ].map((tx, i) => (
                  <TableRow key={i}>
                    <TableCell><Checkbox /></TableCell>
                    <TableCell className="text-muted-foreground">{tx.date}</TableCell>
                    <TableCell className="font-medium">{tx.desc}</TableCell>
                    <TableCell className={tx.amount.startsWith('+') ? 'text-emerald-500 font-medium' : ''}>{tx.amount}</TableCell>
                    <TableCell>
                      <Select>
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="software">Software/SaaS</SelectItem>
                          <SelectItem value="travel">Travel</SelectItem>
                          <SelectItem value="income">Freelance Income</SelectItem>
                          <SelectItem value="office">Office Space</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="mt-4 flex justify-end">
            <Button>Save Selected</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}