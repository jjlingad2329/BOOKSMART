import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileUp, Filter, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function Tax() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tax Filing</h1>
          <p className="text-muted-foreground">Manage your tax documents and filings.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button className="gap-2">
            <FileUp className="h-4 w-4" />
            Upload Document
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="col-span-2 border-border/50">
          <CardHeader>
            <CardTitle>Tax Documents</CardTitle>
            <CardDescription>Your uploaded forms and generated returns</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center mb-4">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search documents..." className="pl-9 h-9" />
              </div>
              <Button variant="outline" size="sm" className="h-9 gap-2">
                <Filter className="h-3 w-3" /> Filter
              </Button>
            </div>
            
            <div className="border rounded-md border-border/50">
              <Table>
                <TableHeader className="bg-secondary/20">
                  <TableRow>
                    <TableHead>Document Name</TableHead>
                    <TableHead>Tax Year</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date Added</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { name: "1099-NEC Stripe", year: "2023", type: "Income", date: "Jan 15, 2024" },
                    { name: "W-9 Contractor", year: "2023", type: "Form", date: "Feb 02, 2024" },
                    { name: "Q4 Estimated Tax", year: "2023", type: "Payment", date: "Jan 10, 2024" },
                    { name: "2022 Tax Return", year: "2022", type: "Return", date: "Apr 12, 2023" },
                  ].map((doc, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{doc.name}</TableCell>
                      <TableCell>{doc.year}</TableCell>
                      <TableCell><Badge variant="outline">{doc.type}</Badge></TableCell>
                      <TableCell className="text-muted-foreground">{doc.date}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="h-8 px-2 text-primary hover:text-primary hover:bg-primary/10">
                          <Download className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-border/50 bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="text-lg">Next Deadline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary mb-1">Apr 15</div>
              <p className="text-sm font-medium mb-4">Federal Income Tax Return</p>
              <div className="text-sm text-muted-foreground mb-4">
                You have 45 days remaining to file your 2023 tax return or request an extension.
              </div>
              <Button className="w-full">Start Filing Process</Button>
            </CardContent>
          </Card>
          
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Filing Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">2023 Federal</span>
                <Badge className="bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 border-yellow-500/20">In Progress</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">2023 State (CA)</span>
                <Badge variant="outline">Not Started</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">2022 Returns</span>
                <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/20">Completed</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}