import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
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
import { Plus, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Category = { id: number; name: string; type: string; system: boolean };

const INITIAL_CATEGORIES: Category[] = [
  { id: 1, name: "Software/SaaS", type: "expense", system: true },
  { id: 2, name: "Travel", type: "expense", system: true },
  { id: 3, name: "Freelance Income", type: "income", system: true },
  { id: 4, name: "Office Space", type: "expense", system: true },
  { id: 5, name: "Crypto Trading", type: "income", system: false },
];

export default function AdminCategories() {
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [toDelete, setToDelete] = useState<Category | null>(null);

  function handleDelete() {
    if (!toDelete) return;
    setCategories((prev) => prev.filter((c) => c.id !== toDelete.id));
    toast({ title: "Category deleted", description: `"${toDelete.name}" has been removed.` });
    setToDelete(null);
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Categories</h1>
          <p className="text-muted-foreground">Manage global transaction categories.</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> Add Category
        </Button>
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>Global Categories</CardTitle>
          <CardDescription>These categories are available to all users for transaction tagging.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md border-border/50">
            <Table>
              <TableHeader className="bg-secondary/20">
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>System</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((cat) => (
                  <TableRow key={cat.id}>
                    <TableCell className="text-muted-foreground">{cat.id}</TableCell>
                    <TableCell className="font-medium">{cat.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cat.type === "income" ? "text-emerald-500 border-emerald-500/30" : "text-rose-500 border-rose-500/30"}>
                        {cat.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {cat.system ? <Badge variant="secondary">Yes</Badge> : <Badge variant="outline">No</Badge>}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                          <Edit className="h-4 w-4" />
                        </Button>
                        {!cat.system && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => setToDelete(cat)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {categories.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">No categories found.</TableCell>
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
            <AlertDialogTitle>Delete category?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove <strong>"{toDelete?.name}"</strong>. Any transactions tagged with this category will be unaffected but may lose their label.
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
