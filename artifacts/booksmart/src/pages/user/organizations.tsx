import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus, ArrowRight } from "lucide-react";

export default function Organizations() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Organizations</h1>
          <p className="text-muted-foreground">Manage your businesses, LLCs, and freelance entities.</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> Add Business
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[
          { name: "Doe Consulting LLC", type: "LLC (Multi-member)", status: "Active", taxYear: "Calendar" },
          { name: "John Doe Freelance", type: "Sole Proprietorship", status: "Active", taxYear: "Calendar" }
        ].map((org, i) => (
          <Card key={i} className="border-border/50 hover:border-primary/50 transition-colors flex flex-col group">
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start">
                <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                  {org.status}
                </Badge>
              </div>
              <CardTitle className="text-xl group-hover:text-primary transition-colors">{org.name}</CardTitle>
              <CardDescription>{org.type}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Tax Year</span>
                  <span className="text-foreground">{org.taxYear}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Linked Accounts</span>
                  <span className="text-foreground">2 Banks, 1 Card</span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-0">
              <Button variant="ghost" className="w-full justify-between hover:bg-primary/10 hover:text-primary">
                Manage Entity <ArrowRight className="h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}