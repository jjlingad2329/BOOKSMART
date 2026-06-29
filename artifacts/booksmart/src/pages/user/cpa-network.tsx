import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Filter, Star, MessageSquare } from "lucide-react";

const cpaData = [
  {
    id: 1,
    name: "Sarah Jenkins, CPA",
    rating: 4.9,
    reviews: 124,
    rate: 150,
    specialties: ["Freelancers", "E-commerce", "Real Estate"],
    bio: "Over 10 years of experience helping independent contractors and small business owners minimize their tax liability and maximize growth.",
    image: "https://i.pravatar.cc/150?u=a042581f4e29026704d"
  },
  {
    id: 2,
    name: "Michael Chen",
    rating: 4.8,
    reviews: 89,
    rate: 175,
    specialties: ["Tech Startups", "SaaS", "Crypto"],
    bio: "Specializing in high-growth technology startups and cryptocurrency taxation. Former Big 4 auditor.",
    image: "https://i.pravatar.cc/150?u=a042581f4e29026704e"
  },
  {
    id: 3,
    name: "Elena Rodriguez, CPA",
    rating: 5.0,
    reviews: 210,
    rate: 130,
    specialties: ["Creative Agencies", "Retail", "Non-profits"],
    bio: "Passionate about helping creative professionals understand their finances. Friendly, approachable, and highly responsive.",
    image: "https://i.pravatar.cc/150?u=a042581f4e29026704f"
  },
  {
    id: 4,
    name: "David Kim, CPA",
    rating: 4.7,
    reviews: 56,
    rate: 160,
    specialties: ["Healthcare", "Consulting", "Legal"],
    bio: "Strategic tax planning for professional services. Focus on long-term wealth preservation and corporate structuring.",
    image: "https://i.pravatar.cc/150?u=a042581f4e29026704g"
  }
];

export default function CpaNetwork() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">CPA Network</h1>
          <p className="text-muted-foreground">Find and connect with vetted tax professionals.</p>
        </div>
      </div>

      <div className="flex gap-4 items-center bg-card p-4 rounded-lg border border-border">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search CPAs by name or specialty..." className="pl-9 bg-background" />
        </div>
        <Button variant="outline" className="gap-2">
          <Filter className="h-4 w-4" />
          Filters
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {cpaData.map((cpa) => (
          <Card key={cpa.id} className="flex flex-col border-border/50 hover:border-primary/50 transition-colors">
            <CardHeader className="flex flex-row gap-4 items-start pb-4">
              <Avatar className="h-16 w-16 border-2 border-primary/20">
                <AvatarImage src={cpa.image} alt={cpa.name} />
                <AvatarFallback className="bg-primary/10 text-primary font-bold">
                  {cpa.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1 flex-1">
                <CardTitle className="text-lg">{cpa.name}</CardTitle>
                <div className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
                  <span className="flex items-center text-yellow-500 font-medium">
                    <Star className="h-3 w-3 fill-current mr-1" />
                    {cpa.rating}
                  </span>
                  <span>({cpa.reviews} reviews)</span>
                  <span className="font-semibold text-foreground ml-auto">${cpa.rate}/hr</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 space-y-4">
              <div className="flex flex-wrap gap-2">
                {cpa.specialties.map(spec => (
                  <Badge key={spec} variant="secondary" className="bg-secondary/50 hover:bg-secondary text-xs font-normal">
                    {spec}
                  </Badge>
                ))}
              </div>
              <p className="text-sm text-muted-foreground line-clamp-3">
                {cpa.bio}
              </p>
            </CardContent>
            <CardFooter className="pt-4 border-t border-border/50 flex gap-2">
              <Button className="flex-1 font-semibold">Hire CPA</Button>
              <Button variant="secondary" size="icon" className="shrink-0">
                <MessageSquare className="h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}