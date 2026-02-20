import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { Plus, Pencil, Trash2, BookOpen, Search, ArrowLeft, FileUp } from "lucide-react";
import * as XLSX from "xlsx";
import type { KnowledgeBaseArticle, Document } from "@shared/schema";
import { insertKnowledgeBaseArticleSchema } from "@shared/schema";

const articleFormSchema = insertKnowledgeBaseArticleSchema.extend({
  title: z.string().min(1, "Title is required"),
  category: z.string().min(1, "Category is required"),
  content: z.string().min(1, "Content is required"),
  author: z.string().min(1, "Author is required"),
  status: z.string().min(1, "Status is required"),
  tags: z.string().default(""),
  jurisdiction: z.string().nullable().default(null),
  relatedDocumentId: z.coerce.number().nullable().default(null),
});

type ArticleFormValues = z.infer<typeof articleFormSchema>;

const ARTICLE_CATEGORIES = ["Policy Guidance", "Regulatory Update", "Best Practice", "How-To Guide", "FAQ", "Template", "Training Material", "Other"];
const ARTICLE_STATUSES = ["Draft", "Published", "Archived"];
const JURISDICTIONS = ["UK", "Gibraltar", "Estonia/EU", "All"];

export default function KnowledgeBase() {
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedArticle, setSelectedArticle] = useState<KnowledgeBaseArticle | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<KnowledgeBaseArticle | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingArticle, setDeletingArticle] = useState<KnowledgeBaseArticle | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const form = useForm<ArticleFormValues>({
    resolver: zodResolver(articleFormSchema),
    defaultValues: {
      title: "",
      category: "",
      content: "",
      author: "",
      status: "Draft",
      tags: "",
      jurisdiction: null,
      relatedDocumentId: null,
    },
  });

  const handleFileImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const lines: string[] = [];
        workbook.SheetNames.forEach((sheetName) => {
          const sheet = workbook.Sheets[sheetName];
          const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
          if (rows.length === 0) return;
          if (workbook.SheetNames.length > 1) {
            lines.push(`## ${sheetName}\n`);
          }
          const header = rows[0] as string[];
          lines.push("| " + header.map((h) => String(h ?? "")).join(" | ") + " |");
          lines.push("| " + header.map(() => "---").join(" | ") + " |");
          for (let i = 1; i < rows.length; i++) {
            const row = rows[i] as unknown[];
            const cells = header.map((_, ci) => {
              const val = row[ci];
              return val != null ? String(val).replace(/\|/g, "\\|").replace(/\n/g, " ") : "";
            });
            lines.push("| " + cells.join(" | ") + " |");
          }
          lines.push("");
        });
        const markdown = lines.join("\n");
        form.setValue("content", markdown, { shouldValidate: true });
        toast({ title: "File imported", description: `Converted "${file.name}" to markdown` });
      } catch {
        toast({ title: "Import failed", description: "Could not parse the file", variant: "destructive" });
      }
    };
    reader.readAsArrayBuffer(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [form, toast]);

  const { data: articles, isLoading } = useQuery<KnowledgeBaseArticle[]>({
    queryKey: ["/api/knowledge-base"],
  });
  const { data: docsList } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: ArticleFormValues) => {
      const payload = {
        ...data,
        tags: data.tags ? data.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
        relatedDocumentId: data.relatedDocumentId || null,
      };
      return apiRequest("POST", "/api/knowledge-base", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-base"] });
      queryClient.invalidateQueries({ queryKey: ["audit-log"] });
      toast({ title: "Article created" });
      setDialogOpen(false);
      form.reset();
    },
    onError: () => toast({ title: "Error creating article", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: ArticleFormValues }) => {
      const payload = {
        ...data,
        tags: data.tags ? data.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
        relatedDocumentId: data.relatedDocumentId || null,
      };
      return apiRequest("PUT", `/api/knowledge-base/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-base"] });
      queryClient.invalidateQueries({ queryKey: ["audit-log"] });
      toast({ title: "Article updated" });
      setDialogOpen(false);
      setEditingArticle(null);
      setSelectedArticle(null);
      form.reset();
    },
    onError: () => toast({ title: "Error updating article", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/knowledge-base/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-base"] });
      queryClient.invalidateQueries({ queryKey: ["audit-log"] });
      toast({ title: "Article deleted" });
      setDeleteConfirmOpen(false);
      setDeletingArticle(null);
      setSelectedArticle(null);
    },
    onError: () => toast({ title: "Error deleting article", variant: "destructive" }),
  });

  function openCreateDialog() {
    setEditingArticle(null);
    form.reset({
      title: "",
      category: "",
      content: "",
      author: "",
      status: "Draft",
      tags: "",
      jurisdiction: null,
      relatedDocumentId: null,
    });
    setDialogOpen(true);
  }

  function openEditDialog(a: KnowledgeBaseArticle) {
    setEditingArticle(a);
    form.reset({
      title: a.title,
      category: a.category,
      content: a.content,
      author: a.author,
      status: a.status,
      tags: (a.tags || []).join(", "),
      jurisdiction: a.jurisdiction || null,
      relatedDocumentId: a.relatedDocumentId || null,
    });
    setDialogOpen(true);
  }

  function onSubmit(data: ArticleFormValues) {
    if (editingArticle) {
      updateMutation.mutate({ id: editingArticle.id, data });
    } else {
      createMutation.mutate(data);
    }
  }

  const filtered = (articles || []).filter(a => {
    if (categoryFilter !== "all" && a.category !== categoryFilter) return false;
    if (statusFilter !== "all" && a.status !== statusFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      if (!a.title.toLowerCase().includes(term) && !a.content.toLowerCase().includes(term) && !(a.tags || []).some(t => t.toLowerCase().includes(term))) return false;
    }
    return true;
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Knowledge Base</h1>
          <p className="text-muted-foreground mt-1">Internal compliance guidance library</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}><CardContent className="pt-6"><Skeleton className="h-32" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  if (selectedArticle) {
    const relatedDoc = docsList?.find(d => d.id === selectedArticle.relatedDocumentId);
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => setSelectedArticle(null)} data-testid="button-back-to-list">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Knowledge Base
        </Button>
        <div>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-article-title">{selectedArticle.title}</h1>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge variant="outline">{selectedArticle.category}</Badge>
                <Badge variant={selectedArticle.status === "Published" ? "secondary" : "outline"}>{selectedArticle.status}</Badge>
                {selectedArticle.jurisdiction && <Badge variant="outline">{selectedArticle.jurisdiction}</Badge>}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button size="icon" variant="ghost" onClick={() => openEditDialog(selectedArticle)} data-testid="button-edit-article">
                <Pencil className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => { setDeletingArticle(selectedArticle); setDeleteConfirmOpen(true); }} data-testid="button-delete-article">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground flex-wrap">
            <span>By {selectedArticle.author}</span>
            {selectedArticle.createdAt && <span>Created {format(new Date(selectedArticle.createdAt), "dd MMM yyyy")}</span>}
            {selectedArticle.updatedAt && <span>Updated {format(new Date(selectedArticle.updatedAt), "dd MMM yyyy")}</span>}
          </div>
        </div>
        <Card>
          <CardContent className="pt-6 prose prose-sm dark:prose-invert max-w-none">
            <div className="whitespace-pre-wrap" data-testid="text-article-content">{selectedArticle.content}</div>
          </CardContent>
        </Card>
        <div className="flex items-center gap-2 flex-wrap">
          {(selectedArticle.tags || []).map(tag => (
            <Badge key={tag} variant="secondary">{tag}</Badge>
          ))}
        </div>
        {relatedDoc && (
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Related document: <span className="font-medium">{relatedDoc.title}</span></span>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  const categoryCounts = ARTICLE_CATEGORIES.reduce<Record<string, number>>((acc, cat) => {
    acc[cat] = (articles || []).filter(a => a.category === cat && a.status === "Published").length;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Knowledge Base</h1>
          <p className="text-muted-foreground mt-1">Internal compliance guidance and reference library</p>
        </div>
        <Button onClick={openCreateDialog} data-testid="button-add-article">
          <Plus className="mr-2 h-4 w-4" /> Add Article
        </Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search articles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-search-articles"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-category-filter">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {ARTICLE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]" data-testid="select-status-filter">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {ARTICLE_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No articles found</h3>
            <p className="text-muted-foreground mt-1">Try adjusting your search or filters, or create a new article.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map(article => (
            <Card
              key={article.id}
              className="cursor-pointer hover-elevate"
              onClick={() => setSelectedArticle(article)}
              data-testid={`card-article-${article.id}`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base line-clamp-2">{article.title}</CardTitle>
                  <Badge variant={article.status === "Published" ? "secondary" : "outline"} className="shrink-0">{article.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground line-clamp-3">{article.content}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline">{article.category}</Badge>
                  {article.jurisdiction && <Badge variant="outline">{article.jurisdiction}</Badge>}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {(article.tags || []).slice(0, 3).map(tag => (
                    <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                  ))}
                  {(article.tags || []).length > 3 && (
                    <span className="text-xs text-muted-foreground">+{(article.tags || []).length - 3} more</span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground flex-wrap">
                  <span>{article.author}</span>
                  {article.updatedAt && <span>{format(new Date(article.updatedAt), "dd MMM yyyy")}</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingArticle ? "Edit Article" : "New Article"}</DialogTitle>
            <DialogDescription>
              {editingArticle ? "Update article details." : "Create a new knowledge base article."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl><Input {...field} data-testid="input-article-title" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="category" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-article-category">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ARTICLE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-article-status">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ARTICLE_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="author" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Author</FormLabel>
                    <FormControl><Input {...field} data-testid="input-article-author" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="jurisdiction" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Jurisdiction</FormLabel>
                    <Select onValueChange={(v) => field.onChange(v === "none" ? null : v)} value={field.value || "none"}>
                      <FormControl>
                        <SelectTrigger data-testid="select-article-jurisdiction">
                          <SelectValue placeholder="All jurisdictions" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">All Jurisdictions</SelectItem>
                        {JURISDICTIONS.map(j => <SelectItem key={j} value={j}>{j}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="tags" render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags (comma-separated)</FormLabel>
                  <FormControl><Input {...field} placeholder="e.g. AML, KYC, payments" data-testid="input-article-tags" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="relatedDocumentId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Related Document</FormLabel>
                  <Select onValueChange={(v) => field.onChange(v === "none" ? null : Number(v))} value={field.value ? String(field.value) : "none"}>
                    <FormControl>
                      <SelectTrigger data-testid="select-article-document">
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {(docsList || []).map(d => <SelectItem key={d.id} value={String(d.id)}>{d.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="content" render={({ field }) => (
                <FormItem>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <FormLabel>Content</FormLabel>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      className="hidden"
                      onChange={handleFileImport}
                      data-testid="input-file-import"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      data-testid="button-import-file"
                    >
                      <FileUp className="h-4 w-4 mr-1" />
                      Import from file
                    </Button>
                  </div>
                  <FormControl><Textarea {...field} rows={12} className="font-mono text-sm" data-testid="input-article-content" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-submit-article">
                  {editingArticle ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Article</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingArticle?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)} data-testid="button-cancel-delete">Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deletingArticle && deleteMutation.mutate(deletingArticle.id)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
