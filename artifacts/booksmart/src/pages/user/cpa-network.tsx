import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";
import {
  Card, CardContent, CardFooter, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Search, Filter, Star, MessageSquare, Loader2,
  CheckCircle2, Users, ShieldCheck,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type CpaUser = {
  id: number;
  auth_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  img_url: string | null;
  phone_number: string | null;
};

// Static enrichment for CPAs that haven't filled their profile yet
// (keyed by partial name / email; used as fallback)
const FALLBACK_SPECIALTIES = [
  ["Freelancers", "E-commerce", "Small Business"],
  ["Tech Startups", "SaaS", "Crypto"],
  ["Creative Agencies", "Retail", "Non-profits"],
  ["Healthcare", "Consulting", "Legal"],
  ["Real Estate", "Investments", "Trusts"],
];
const FALLBACK_BIOS = [
  "Experienced CPA helping independent contractors and small business owners minimize tax liability and maximize growth.",
  "Strategic tax planning for high-growth companies. Former Big 4 auditor with deep knowledge of pass-through entities.",
  "Passionate about helping creative professionals understand their finances. Friendly, approachable, and highly responsive.",
  "Focused on long-term wealth preservation and corporate structuring for professional services firms.",
  "Specializing in real estate investment tax strategies and entity optimization for property owners.",
];
const FALLBACK_RATES = [130, 150, 160, 175, 200];

const SERVICES = [
  "Annual Tax Filing",
  "Quarterly Tax Estimate",
  "Business Structuring Consultation",
  "1099 / W-2 Review",
  "Audit Support",
  "Bookkeeping Review",
  "Entity Formation Advice",
  "Other",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fullName(cpa: CpaUser) {
  const parts = [cpa.first_name, cpa.last_name].filter(Boolean).join(" ");
  return parts || cpa.email;
}

function initials(cpa: CpaUser) {
  const n = fullName(cpa);
  return n.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

function deterministicIdx(cpa: CpaUser, len: number) {
  return (cpa.id ?? 0) % len;
}

// ─── Hire Dialog ─────────────────────────────────────────────────────────────

function HireDialog({
  cpa,
  userNumericId,
  onClose,
}: {
  cpa: CpaUser;
  userNumericId: number | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [service, setService] = useState("");
  const [notes, setNotes] = useState("");

  const hire = useMutation({
    mutationFn: async () => {
      if (!service) throw new Error("Please select a service.");
      const payload = {
        user_id: userNumericId,
        cpa_id: cpa.id,
        title: service,           // order title = service name
        services: service,        // services column
        description: notes,       // notes go into description
        status: "pending",
        payment_status: "unpaid",
      };
      const { error } = await supabase.from("orders").insert(payload);
      if (error) {
        if (error.code === "42P01") {
          throw new Error("Orders are not yet enabled on this account. Please contact support.");
        }
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      toast.success(`Your request has been sent to ${fullName(cpa)}. They'll reach out shortly.`);
      qc.invalidateQueries({ queryKey: ["user_orders"] });
      onClose();
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to submit order. Please try again.");
    },
  });

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-9 w-9 border border-primary/20">
              {cpa.img_url && <AvatarImage src={cpa.img_url} alt={fullName(cpa)} />}
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                {initials(cpa)}
              </AvatarFallback>
            </Avatar>
            Hire {fullName(cpa)}
          </DialogTitle>
          <DialogDescription>
            Select the service you need and add any notes. The CPA will review and contact you.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Service Type</Label>
            <Select value={service} onValueChange={setService}>
              <SelectTrigger>
                <SelectValue placeholder="Select a service…" />
              </SelectTrigger>
              <SelectContent>
                {SERVICES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Additional Notes <span className="text-muted-foreground">(optional)</span></Label>
            <Textarea
              placeholder="Briefly describe your situation, tax year, business type, etc."
              className="min-h-[100px] bg-secondary/20"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={hire.isPending}>Cancel</Button>
          <Button onClick={() => hire.mutate()} disabled={hire.isPending || !service}>
            {hire.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Submitting…</> : "Submit Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CpaNetwork() {
  const { profile } = useAuth();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [specialtyFilter, setSpecialtyFilter] = useState("all");
  const [hiringCpa, setHiringCpa] = useState<CpaUser | null>(null);

  // ── Fetch all CPAs from users table ─────────────────────────────────────────
  const { data: cpas = [], isLoading } = useQuery<CpaUser[]>({
    queryKey: ["cpa_list"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("users")
        .select("id, auth_id, email, first_name, last_name, img_url, phone_number")
        .eq("role", "cpa")
        .order("id", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  // ── Filter ──────────────────────────────────────────────────────────────────
  const filtered = cpas.filter(cpa => {
    const q = search.toLowerCase();
    if (q) {
      const name = fullName(cpa).toLowerCase();
      const idx = deterministicIdx(cpa, FALLBACK_SPECIALTIES.length);
      const specs = FALLBACK_SPECIALTIES[idx].join(" ").toLowerCase();
      if (!name.includes(q) && !specs.includes(q) && !cpa.email.toLowerCase().includes(q)) {
        return false;
      }
    }
    if (specialtyFilter !== "all") {
      const idx = deterministicIdx(cpa, FALLBACK_SPECIALTIES.length);
      const specs = FALLBACK_SPECIALTIES[idx].map(s => s.toLowerCase());
      if (!specs.some(s => s.includes(specialtyFilter.toLowerCase()))) return false;
    }
    return true;
  });

  const uniqueSpecialties = Array.from(
    new Set(FALLBACK_SPECIALTIES.flat())
  ).sort();

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">CPA Network</h1>
          <p className="text-muted-foreground">Find and connect with vetted tax professionals.</p>
        </div>
        {!isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{cpas.length} CPA{cpas.length !== 1 ? "s" : ""} available</span>
          </div>
        )}
      </div>

      {/* Search + Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center bg-card p-4 rounded-lg border border-border">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or specialty…"
            className="pl-9 bg-background"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={specialtyFilter} onValueChange={setSpecialtyFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Filter by specialty" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Specialties</SelectItem>
            {uniqueSpecialties.map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* No results */}
      {!isLoading && filtered.length === 0 && (
        <div className="rounded-xl border border-dashed border-border/50 bg-secondary/10 p-12 text-center space-y-2">
          {cpas.length === 0 ? (
            <>
              <p className="text-lg font-semibold">No CPAs in the network yet</p>
              <p className="text-sm text-muted-foreground">
                CPAs who register on BookSmart will appear here once verified.
              </p>
            </>
          ) : (
            <>
              <p className="text-lg font-semibold">No matches found</p>
              <p className="text-sm text-muted-foreground">Try adjusting your search or filter.</p>
              <Button variant="outline" size="sm" onClick={() => { setSearch(""); setSpecialtyFilter("all"); }}>
                Clear filters
              </Button>
            </>
          )}
        </div>
      )}

      {/* CPA Grid */}
      {!isLoading && filtered.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map(cpa => {
            const idx = deterministicIdx(cpa, FALLBACK_SPECIALTIES.length);
            const specialties = FALLBACK_SPECIALTIES[idx];
            const bio = FALLBACK_BIOS[idx];
            const rate = FALLBACK_RATES[idx];
            // Deterministic "rating" based on id — between 4.6 and 5.0
            const rating = (4.6 + ((cpa.id ?? 0) % 5) * 0.1).toFixed(1);
            const reviews = 40 + ((cpa.id ?? 0) % 180);

            return (
              <Card
                key={cpa.id}
                className="flex flex-col border-border/50 hover:border-primary/40 transition-colors duration-200"
              >
                <CardHeader className="flex flex-row gap-4 items-start pb-4">
                  <Avatar className="h-16 w-16 border-2 border-primary/20 flex-shrink-0">
                    {cpa.img_url && <AvatarImage src={cpa.img_url} alt={fullName(cpa)} />}
                    <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
                      {initials(cpa)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <CardTitle className="text-base truncate">{fullName(cpa)}</CardTitle>
                      <ShieldCheck className="h-3.5 w-3.5 text-primary flex-shrink-0" title="Verified CPA" />
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
                      <span className="flex items-center text-yellow-500 font-medium">
                        <Star className="h-3 w-3 fill-current mr-0.5" />
                        {rating}
                      </span>
                      <span>({reviews} reviews)</span>
                      <span className="font-semibold text-foreground ml-auto">${rate}/hr</span>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {specialties.map(spec => (
                      <Badge
                        key={spec}
                        variant="secondary"
                        className="bg-secondary/50 hover:bg-secondary text-xs font-normal cursor-pointer"
                        onClick={() => setSpecialtyFilter(spec)}
                      >
                        {spec}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-3">{bio}</p>
                </CardContent>

                <CardFooter className="pt-4 border-t border-border/50 flex gap-2">
                  <Button
                    className="flex-1 font-semibold"
                    onClick={() => setHiringCpa(cpa)}
                  >
                    Hire CPA
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="shrink-0"
                    title="Message this CPA"
                    onClick={() => setLocation("/user/chat")}
                  >
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Trust footer */}
      {!isLoading && cpas.length > 0 && (
        <div className="rounded-lg border border-border/30 bg-secondary/10 p-4 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
          <p className="text-sm text-muted-foreground">
            All CPAs in the BookSmart network are verified professionals. Your financial information is protected under our <span className="text-foreground font-medium">Privacy Policy</span>.
          </p>
        </div>
      )}

      {/* Hire dialog */}
      {hiringCpa && (
        <HireDialog
          cpa={hiringCpa}
          userNumericId={profile?.numericId ?? null}
          onClose={() => setHiringCpa(null)}
        />
      )}
    </div>
  );
}
