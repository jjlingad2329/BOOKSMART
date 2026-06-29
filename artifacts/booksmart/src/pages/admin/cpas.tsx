import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function AdminCpas() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">CPA Directory</h1>
        <p className="text-muted-foreground">Manage and verify CPA applications.</p>
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>CPA Verification</CardTitle>
          <CardDescription>Review credentials for pending CPAs to allow them into the network.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-4">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search CPAs..." className="pl-9 h-9" />
            </div>
          </div>

          <div className="border rounded-md border-border/50">
            <Table>
              <TableHeader className="bg-secondary/20">
                <TableRow>
                  <TableHead>CPA Name</TableHead>
                  <TableHead>License #</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Applied</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  { name: "Robert Fischer", license: "CPA-98324", state: "NY", applied: "2 days ago", status: "pending" },
                  { name: "Emily Wang", license: "CPA-77491", state: "CA", applied: "5 days ago", status: "pending" },
                  { name: "Sarah Jenkins", license: "CPA-11204", state: "TX", applied: "1 month ago", status: "approved" },
                ].map((cpa, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{cpa.name}</TableCell>
                    <TableCell className="font-mono text-sm">{cpa.license}</TableCell>
                    <TableCell>{cpa.state}</TableCell>
                    <TableCell className="text-muted-foreground">{cpa.applied}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        cpa.status === 'pending' ? "text-yellow-500 border-yellow-500/30" : "text-emerald-500 border-emerald-500/30"
                      }>
                        {cpa.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {cpa.status === 'pending' ? (
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" className="h-8 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10">
                            Approve
                          </Button>
                          <Button size="sm" variant="outline" className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10">
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <Button variant="ghost" size="sm" disabled>Processed</Button>
                      )}
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