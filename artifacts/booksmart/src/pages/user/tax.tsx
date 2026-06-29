import { useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FileUp,
  Search,
  FileText,
  FileImage,
  File,
  FolderOpen,
  MoreVertical,
  Trash2,
  ExternalLink,
  X,
  Calendar,
  Loader2,
  Sparkles,
  CheckCircle2,
  SkipForward,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ── Types ────────────────────────────────────────────────────────────────────

type UserDocument = {
  id: number;
  user_id: number;
  name: string;
  file_url: string;
  category: string | null;
  tax_year: string | null;
  file_size: number | null;
  mime_type: string | null;
  created_at: string;
};

const CATEGORIES = [
  "Balance Sheet",
  "Profit & Loss",
  "Income Statement",
  "Cash Flow Statement",
  "Transactions",
] as const;

// ── AI Extraction types ───────────────────────────────────────────────────────

type PnlExtracted = {
  revenue: number;
  cost_of_goods_sold: number;
  gross_profit: number;
  operating_expenses: number;
  net_income: number;
};

type BsExtracted = {
  assets: { current: number; non_current: number };
  liabilities: { current: number; long_term: number };
  equity: number;
};

type CfExtracted = {
  operating_activities: number;
  investing_activities: number;
  financing_activities: number;
};

type ExtractedDoc =
  | { type: "pnl"; data: PnlExtracted }
  | { type: "bs"; data: BsExtracted }
  | { type: "cf"; data: CfExtracted };

function categoryToDocType(cat: string): string | null {
  if (cat === "Profit & Loss" || cat === "Income Statement") return "pnl";
  if (cat === "Balance Sheet") return "bs";
  if (cat === "Cash Flow Statement") return "cf";
  return null;
}

function fmtMoney(v: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(v);
}

async function callExtractDocument(
  file: File,
  mime: string,
  docType: string
): Promise<ExtractedDoc> {
  const { data: { session } } = await (await import("@/lib/supabase")).supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("Not authenticated");

  const bytes = await file.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(bytes)));

  const res = await fetch("/api/extract-document", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ fileData: base64, mimeType: mime, docType }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
  }

  const json = await res.json() as { extracted: unknown; docType: string };
  return { type: json.docType as "pnl" | "bs" | "cf", data: json.extracted } as ExtractedDoc;
}

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 1959 }, (_, i) =>
  String(CURRENT_YEAR - i)
);

// ── Helpers ──────────────────────────────────────────────────────────────────

function guessMime(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return "application/pdf";
  if (["jpg", "jpeg"].includes(ext)) return "image/jpeg";
  if (ext === "png") return "image/png";
  if (ext === "gif") return "image/gif";
  if (ext === "webp") return "image/webp";
  if (["xls", "xlsx"].includes(ext)) return "application/vnd.ms-excel";
  if (["doc", "docx"].includes(ext)) return "application/msword";
  if (ext === "csv") return "text/csv";
  return "application/octet-stream";
}

function fileSizeLabel(bytes: number | null): string {
  if (!bytes) return "";
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

function FileIcon({ mime }: { mime: string | null }) {
  if (!mime) return <File className="h-5 w-5 text-muted-foreground" />;
  if (mime === "application/pdf")
    return <FileText className="h-5 w-5 text-red-400" />;
  if (mime.startsWith("image/"))
    return <FileImage className="h-5 w-5 text-blue-400" />;
  return <File className="h-5 w-5 text-muted-foreground" />;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ── Upload Dialog ─────────────────────────────────────────────────────────────

type UploadDialogProps = {
  open: boolean;
  onClose: () => void;
  onUploaded: () => void;
  numericUserId: number;
  authUuid: string; // used only for storage path namespacing
};

function UploadDialog({ open, onClose, onUploaded, numericUserId, authUuid }: UploadDialogProps) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  // Form state
  const [pickedFile, setPickedFile] = useState<File | null>(null);
  const [docName, setDocName] = useState("");
  const [category, setCategory] = useState<string>("");
  const [taxYear, setTaxYear] = useState(String(CURRENT_YEAR));
  const [periodStart, setPeriodStart] = useState(`${CURRENT_YEAR}-01-01`);
  const [periodEnd, setPeriodEnd] = useState(`${CURRENT_YEAR}-12-31`);
  const [asOf, setAsOf] = useState(new Date().toISOString().split("T")[0]);

  // Multi-step state
  const [step, setStep] = useState<"form" | "uploading" | "extracting" | "review">("form");
  const [extracted, setExtracted] = useState<ExtractedDoc | null>(null);
  const [insertedDocId, setInsertedDocId] = useState<number | null>(null);
  const [extractError, setExtractError] = useState<string | null>(null);

  const isBalanceSheet = category === "Balance Sheet";
  const busy = step === "uploading" || step === "extracting";

  function reset() {
    setPickedFile(null);
    setDocName("");
    setCategory("");
    setTaxYear(String(CURRENT_YEAR));
    setPeriodStart(`${CURRENT_YEAR}-01-01`);
    setPeriodEnd(`${CURRENT_YEAR}-12-31`);
    setAsOf(new Date().toISOString().split("T")[0]);
    setStep("form");
    setExtracted(null);
    setInsertedDocId(null);
    setExtractError(null);
  }

  function handleClose() {
    if (busy) return;
    reset();
    onClose();
  }

  function handleFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setPickedFile(f);
    if (!docName) setDocName(f.name.replace(/\.[^.]+$/, ""));
  }

  function handleYearChange(y: string) {
    setTaxYear(y);
    if (!isBalanceSheet) {
      setPeriodStart(`${y}-01-01`);
      setPeriodEnd(`${y}-12-31`);
    }
  }

  async function handleSave() {
    if (!pickedFile) { toast({ title: "Please select a file", variant: "destructive" }); return; }
    const name = docName.trim();
    if (!name) { toast({ title: "Please enter a document name", variant: "destructive" }); return; }
    if (!category) { toast({ title: "Please select a category", variant: "destructive" }); return; }
    if (!taxYear) { toast({ title: "Please select a year", variant: "destructive" }); return; }
    if (isBalanceSheet && !asOf) { toast({ title: "Please select an As Of date", variant: "destructive" }); return; }
    if (!isBalanceSheet) {
      if (!periodStart || !periodEnd) { toast({ title: "Please select period dates", variant: "destructive" }); return; }
      if (periodEnd < periodStart) { toast({ title: "End date must be on or after start date", variant: "destructive" }); return; }
    }

    setStep("uploading");
    try {
      const mime = guessMime(pickedFile.name);
      const ext = pickedFile.name.split(".").pop() ?? "";
      const finalName = name.toLowerCase().endsWith(`.${ext}`) ? name : `${name}.${ext}`;
      const storagePath = `${authUuid}/${Date.now()}_${finalName}`;

      const bytes = await pickedFile.arrayBuffer();

      const { error: storageError } = await supabase.storage
        .from("documents")
        .upload(storagePath, bytes, { contentType: mime, upsert: false });
      if (storageError) throw storageError;

      const { data: urlData } = supabase.storage.from("documents").getPublicUrl(storagePath);
      const fileUrl = urlData.publicUrl;

      const baseParsedData: Record<string, string> = { document_category: category };
      if (isBalanceSheet) {
        baseParsedData.as_of = asOf;
      } else {
        baseParsedData.period_start = periodStart;
        baseParsedData.period_end = periodEnd;
      }

      const { data: inserted, error: dbError } = await supabase
        .from("user_documents")
        .insert({
          user_id: numericUserId,
          name: finalName,
          file_url: fileUrl,
          tax_year: taxYear,
          category,
          file_size: pickedFile.size,
          mime_type: mime,
          parsed_data: baseParsedData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (dbError) throw dbError;

      const docId = (inserted as { id: number }).id;
      setInsertedDocId(docId);

      // Insert into statement_imports so the n8n webhook is triggered.
      // Supabase database webhooks watch this table for INSERT events.
      await supabase.from("statement_imports").insert({
        user_id: numericUserId,
        document_id: docId,
        document_path: storagePath,
        mime_type: mime,
        status: "processing",
        is_scanned: false,
        extracted_text: "",
        rows_approved: 0,
        rows_rejected: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      // Check if this category supports AI extraction
      const docType = categoryToDocType(category);
      if (docType) {
        setStep("extracting");
        try {
          const result = await callExtractDocument(pickedFile, mime, docType);
          setExtracted(result);
          setStep("review");
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          setExtractError(msg);
          setStep("review"); // show review step with error state
        }
      } else {
        toast({ title: "Document uploaded successfully" });
        onUploaded();
        reset();
        onClose();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast({ title: "Upload failed", description: msg, variant: "destructive" });
      setStep("form");
    }
  }

  async function handleConfirmExtraction() {
    if (!insertedDocId || !extracted) return;
    try {
      // Flatten extracted data into parsed_data
      const flat: Record<string, unknown> = {};
      if (extracted.type === "pnl") {
        Object.assign(flat, extracted.data);
      } else if (extracted.type === "bs") {
        const d = extracted.data;
        flat.assets_current = d.assets.current;
        flat.assets_non_current = d.assets.non_current;
        flat.liabilities_current = d.liabilities.current;
        flat.liabilities_long_term = d.liabilities.long_term;
        flat.equity = d.equity;
      } else if (extracted.type === "cf") {
        Object.assign(flat, extracted.data);
      }
      flat.ai_extracted = true;
      flat.ai_extracted_at = new Date().toISOString();

      await supabase
        .from("user_documents")
        .update({ parsed_data: flat, updated_at: new Date().toISOString() })
        .eq("id", insertedDocId);

      toast({ title: "Extracted data saved to document" });
    } catch {
      toast({ title: "Could not save extracted data", variant: "destructive" });
    }
    onUploaded();
    reset();
    onClose();
  }

  function handleSkipExtraction() {
    toast({ title: "Document uploaded successfully" });
    onUploaded();
    reset();
    onClose();
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !busy) handleClose(); }}>
      <DialogContent className="max-w-md">

        {/* ── Step: uploading ── */}
        {step === "uploading" && (
          <>
            <DialogHeader>
              <DialogTitle>Uploading Document…</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4 py-10">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Saving to storage…</p>
            </div>
          </>
        )}

        {/* ── Step: extracting ── */}
        {step === "extracting" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Analyzing with AI…
              </DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4 py-10">
              <div className="relative">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <Sparkles className="absolute inset-0 m-auto h-5 w-5 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground text-center max-w-[240px]">
                GPT-4o is reading your document and extracting financial figures…
              </p>
            </div>
          </>
        )}

        {/* ── Step: review ── */}
        {step === "review" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                AI Extraction Review
              </DialogTitle>
            </DialogHeader>

            {extractError ? (
              <div className="space-y-3 py-2">
                <p className="text-sm text-destructive">
                  AI extraction failed: {extractError}
                </p>
                <p className="text-xs text-muted-foreground">
                  Your document was saved. You can still use it without extracted data.
                </p>
              </div>
            ) : extracted ? (
              <div className="space-y-3 py-2">
                <p className="text-xs text-muted-foreground">
                  Review the figures GPT-4o extracted from your document. Confirm to save them,
                  or skip to keep only the file.
                </p>
                <div className="rounded-md border border-border/50 divide-y divide-border/40">
                  {extracted.type === "pnl" && (
                    <>
                      {[
                        ["Revenue", extracted.data.revenue],
                        ["Cost of Goods Sold", extracted.data.cost_of_goods_sold],
                        ["Gross Profit", extracted.data.gross_profit],
                        ["Operating Expenses", extracted.data.operating_expenses],
                        ["Net Income", extracted.data.net_income],
                      ].map(([label, val]) => (
                        <div key={label as string} className="flex justify-between px-3 py-2">
                          <span className="text-sm text-muted-foreground">{label as string}</span>
                          <span className={`text-sm font-semibold ${(val as number) < 0 ? "text-rose-400" : "text-emerald-400"}`}>
                            {fmtMoney(val as number)}
                          </span>
                        </div>
                      ))}
                    </>
                  )}
                  {extracted.type === "bs" && (
                    <>
                      {[
                        ["Current Assets", extracted.data.assets.current],
                        ["Non-Current Assets", extracted.data.assets.non_current],
                        ["Current Liabilities", extracted.data.liabilities.current],
                        ["Long-Term Liabilities", extracted.data.liabilities.long_term],
                        ["Equity", extracted.data.equity],
                      ].map(([label, val]) => (
                        <div key={label as string} className="flex justify-between px-3 py-2">
                          <span className="text-sm text-muted-foreground">{label as string}</span>
                          <span className={`text-sm font-semibold ${(val as number) < 0 ? "text-rose-400" : "text-emerald-400"}`}>
                            {fmtMoney(val as number)}
                          </span>
                        </div>
                      ))}
                    </>
                  )}
                  {extracted.type === "cf" && (
                    <>
                      {[
                        ["Operating Activities", extracted.data.operating_activities],
                        ["Investing Activities", extracted.data.investing_activities],
                        ["Financing Activities", extracted.data.financing_activities],
                      ].map(([label, val]) => (
                        <div key={label as string} className="flex justify-between px-3 py-2">
                          <span className="text-sm text-muted-foreground">{label as string}</span>
                          <span className={`text-sm font-semibold ${(val as number) < 0 ? "text-rose-400" : "text-emerald-400"}`}>
                            {fmtMoney(val as number)}
                          </span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            ) : null}

            <DialogFooter className="gap-2 pt-2">
              <Button variant="outline" onClick={handleSkipExtraction} className="gap-1.5">
                <SkipForward className="h-4 w-4" />
                {extractError ? "Close" : "Skip"}
              </Button>
              {!extractError && extracted && (
                <Button onClick={handleConfirmExtraction} className="gap-1.5">
                  <CheckCircle2 className="h-4 w-4" />
                  Save Extracted Data
                </Button>
              )}
            </DialogFooter>
          </>
        )}

        {/* ── Step: form (default) ── */}
        {step === "form" && (
          <>
            <DialogHeader>
              <DialogTitle>Upload Financial Document</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* File picker zone */}
              <div
                className="border-2 border-dashed border-border/60 rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                {pickedFile ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileUp className="h-5 w-5 text-primary" />
                    <span className="text-sm font-medium truncate max-w-[220px]">{pickedFile.name}</span>
                    <button
                      type="button"
                      className="ml-1 text-muted-foreground hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPickedFile(null);
                        if (fileRef.current) fileRef.current.value = "";
                      }}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <FileUp className="h-8 w-8" />
                    <span className="text-sm">Click to select a file</span>
                    <span className="text-xs">PDF, images, spreadsheets, etc.</span>
                  </div>
                )}
                <input ref={fileRef} type="file" className="hidden" onChange={handleFilePick} />
              </div>

              {/* AI extraction badge */}
              {category && categoryToDocType(category) && (
                <div className="flex items-center gap-2 rounded-md bg-primary/10 border border-primary/20 px-3 py-2 text-xs text-primary">
                  <Sparkles className="h-3.5 w-3.5 flex-shrink-0" />
                  AI will automatically extract financial figures from this document
                </div>
              )}

              {/* Document name */}
              <div className="space-y-1.5">
                <Label>Document Name *</Label>
                <Input
                  placeholder="e.g. Q4 Profit & Loss 2024"
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                />
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <Label>Document Category *</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tax Year */}
              <div className="space-y-1.5">
                <Label>Tax Year</Label>
                <Select value={taxYear} onValueChange={handleYearChange}>
                  <SelectTrigger><SelectValue placeholder="Select year" /></SelectTrigger>
                  <SelectContent className="max-h-48">
                    {YEARS.map((y) => (
                      <SelectItem key={y} value={y}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date fields */}
              {isBalanceSheet ? (
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />As Of Date *
                  </Label>
                  <Input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />Period Start *
                    </Label>
                    <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />Period End *
                    </Label>
                    <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={handleSave} className="min-w-[90px]">Upload</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Main Tax page ─────────────────────────────────────────────────────────────

export default function Tax() {
  const { user, profile } = useAuth();
  const numericId = profile?.numericId ?? null;
  const qc = useQueryClient();
  const { toast } = useToast();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterYear, setFilterYear] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const { data: docs = [], isLoading, error: queryError } = useQuery<UserDocument[]>({
    queryKey: ["user_documents", numericId],
    enabled: numericId !== null,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_documents")
        .select("*")
        .eq("user_id", numericId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (doc: UserDocument) => {
      const { error } = await supabase
        .from("user_documents")
        .delete()
        .eq("id", doc.id);
      if (error) throw error;

      // Best-effort delete from storage (ignore errors if path differs)
      try {
        const url = new URL(doc.file_url);
        const pathParts = url.pathname.split("/documents/");
        if (pathParts[1]) {
          await supabase.storage.from("documents").remove([pathParts[1]]);
        }
      } catch {}
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user_documents", numericId] });
      toast({ title: "Document deleted" });
    },
    onError: (e: Error) => {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    },
  });

  const filtered = docs.filter((d) => {
    const matchSearch =
      !search || d.name.toLowerCase().includes(search.toLowerCase());
    const matchYear = filterYear === "all" || d.tax_year === filterYear;
    const matchCat =
      filterCategory === "all" || d.category === filterCategory;
    return matchSearch && matchYear && matchCat;
  });

  const availableYears = [...new Set(docs.map((d) => d.tax_year).filter(Boolean))] as string[];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tax Filing</h1>
          <p className="text-muted-foreground">
            Manage your tax documents and filings.
          </p>
        </div>
        <Button
          className="gap-2"
          onClick={() => setUploadOpen(true)}
          disabled={!user}
        >
          <FileUp className="h-4 w-4" />
          Upload Document
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Document list */}
        <Card className="col-span-2 border-border/50">
          <CardHeader>
            <CardTitle>Tax Documents</CardTitle>
            <CardDescription>
              Your uploaded financial documents
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex flex-wrap gap-2 mb-4">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search documents…"
                  className="pl-9 h-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={filterYear} onValueChange={setFilterYear}>
                <SelectTrigger className="h-9 w-[110px]">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All years</SelectItem>
                  {availableYears.map((y) => (
                    <SelectItem key={y} value={y}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="h-9 w-[150px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Table / empty state */}
            {isLoading ? (
              <div className="flex justify-center items-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : queryError ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <FolderOpen className="h-12 w-12 mb-3 opacity-40" />
                <p className="text-sm text-destructive font-medium mb-1">Could not load documents</p>
                <p className="text-xs text-center max-w-xs">
                  {(queryError as Error).message}
                </p>
              </div>
            ) : numericId === null ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <FolderOpen className="h-12 w-12 mb-3 opacity-40" />
                <p className="text-sm">Your account profile is still loading…</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <FolderOpen className="h-12 w-12 mb-3 opacity-40" />
                <p className="text-sm">
                  {docs.length === 0
                    ? "No documents yet. Click Upload to add one."
                    : "No documents match your filters."}
                </p>
              </div>
            ) : (
              <div className="border rounded-md border-border/50">
                <Table>
                  <TableHeader className="bg-secondary/20">
                    <TableRow>
                      <TableHead>Document Name</TableHead>
                      <TableHead>Tax Year</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Date Added</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <FileIcon mime={doc.mime_type} />
                            <span className="truncate max-w-[160px]">{doc.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{doc.tax_year ?? "—"}</TableCell>
                        <TableCell>
                          {doc.category ? (
                            <Badge variant="outline" className="text-xs">
                              {doc.category}
                            </Badge>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {fileSizeLabel(doc.file_size) || "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                          {formatDate(doc.created_at)}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() =>
                                  window.open(doc.file_url, "_blank")
                                }
                              >
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Open
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => deleteMutation.mutate(doc)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sidebar cards */}
        <div className="space-y-6">
          <Card className="border-border/50 bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="text-lg">Next Deadline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary mb-1">Apr 15</div>
              <p className="text-sm font-medium mb-4">
                Federal Income Tax Return
              </p>
              <div className="text-sm text-muted-foreground mb-4">
                Make sure all your financial documents are uploaded before the
                filing deadline.
              </div>
              <Button className="w-full" onClick={() => setUploadOpen(true)}>
                Upload Documents
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Document Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {CATEGORIES.map((cat) => {
                const count = docs.filter((d) => d.category === cat).length;
                return (
                  <div key={cat} className="flex justify-between items-center">
                    <span className="text-sm font-medium truncate pr-2">
                      {cat}
                    </span>
                    <Badge
                      variant={count > 0 ? "default" : "outline"}
                      className={count > 0 ? "bg-primary/20 text-primary border-primary/30" : ""}
                    >
                      {count}
                    </Badge>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>

      {user && numericId !== null && (
        <UploadDialog
          open={uploadOpen}
          onClose={() => setUploadOpen(false)}
          onUploaded={() =>
            qc.invalidateQueries({ queryKey: ["user_documents", numericId] })
          }
          numericUserId={numericId}
          authUuid={user.id}
        />
      )}
    </div>
  );
}
