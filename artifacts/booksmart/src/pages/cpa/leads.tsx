import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileUp, Eye, CheckCircle2 } from "lucide-react";

export default function CpaLeads() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Incoming Leads</h1>
        <p className="text-muted-foreground">Review and accept potential clients reaching out to you.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {[
          {
            name: "Acme Corp LLC",
            contact: "John Doe",
            type: "Business Setup & Q3 Planning",
            message: "Hi, I recently formed an LLC and need help structuring my Q3 estimated taxes correctly. We're a software consulting firm.",
            date: "2 hours ago",
            status: "New"
          },
          {
            name: "Sarah's Studio",
            contact: "Sarah Jenkins",
            type: "Freelance Tax Filing",
            message: "I am a freelance designer trying to figure out if I can deduct my home studio renovations and equipment purchases.",
            date: "1 day ago",
            status: "Reviewed"
          }
        ].map((lead, i) => (
          <Card key={i} className="border-border/50 hover:border-primary/50 transition-colors flex flex-col">
            <CardHeader className="pb-3 border-b border-border/20">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{lead.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{lead.contact}</p>
                </div>
                <Badge variant="outline" className={lead.status === "New" ? "bg-primary/10 text-primary border-primary/20" : ""}>
                  {lead.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="flex-1 pt-4 space-y-4">
              <div>
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Inquiry Type</div>
                <div className="font-medium text-sm">{lead.type}</div>
              </div>
              <div className="bg-secondary/10 p-3 rounded-md border border-secondary/20">
                <p className="text-sm italic text-muted-foreground">"{lead.message}"</p>
              </div>
              <div className="text-xs text-muted-foreground">Received {lead.date}</div>
              <div className="flex gap-2 pt-2">
                <button className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors h-9 px-4 py-2">
                  <CheckCircle2 className="mr-2 h-4 w-4" /> Accept Lead
                </button>
                <button className="bg-secondary text-secondary-foreground hover:bg-secondary/80 inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors h-9 px-4 py-2">
                  Decline
                </button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}