import { useState } from "react";
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
import { Plus, Pencil, Trash2, Library, ArrowRight, Shield } from "lucide-react";
import type { RiskLibraryItem, RiskCategory } from "@shared/schema";
import { insertRiskLibrarySchema } from "@shared/schema";

const templateFormSchema = insertRiskLibrarySchema.extend({
  title: z.string().min(1, "Title is required"),
  category: z.string().min(1, "Category is required"),
  description: z.string().nullable().default(null),
  suggestedControls: z.string().nullable().default(null),
  suggestedLikelihood: z.coerce.number().min(1).max(5).default(3),
  suggestedImpact: z.coerce.number().min(1).max(5).default(3),
  jurisdiction: z.string().nullable().default(null),
  source: z.string().nullable().default(null),
  active: z.boolean().default(true),
});

type TemplateFormValues = z.infer<typeof templateFormSchema>;

const FALLBACK_CATEGORIES = [
  "Operational", "Compliance", "Strategic", "Financial",
  "Technology", "Reputational", "Legal", "Environmental",
];

export default function RiskLibrary() {
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<RiskLibraryItem | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingTemplate, setDeletingTemplate] = useState<RiskLibraryItem | null>(null);
  const { toast } = useToast();

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      title: "",
      category: "",
      description: null,
      suggestedControls: null,
      suggestedLikelihood: 3,
      suggestedImpact: 3,
      jurisdiction: null,
      source: null,
      active: true,
    },
  });

  const { data: templates, isLoading } = useQuery<RiskLibraryItem[]>({
    queryKey: ["/api/risk-library"],
  });

  const { data: riskCategories } = useQuery<RiskCategory[]>({
    queryKey: ["/api/risk-categories"],
  });

  const categories = riskCategories && riskCategories.length > 0
    ? riskCategories.filter(c => c.active).map(c => c.label)
    : FALLBACK_CATEGORIES;

  const createMutation = useMutation({
    mutationFn: async (data: TemplateFormValues) => {
      return apiRequest("POST", "/api/risk-library", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/risk-library"] });
      queryClient.invalidateQueries({ queryKey: ["/api/audit-log"] });
      toast({ title: "Template created" });
      setDialogOpen(false);
      form.reset();
    },
    onError: () => toast({ title: "Error creating template", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: TemplateFormValues }) => {
      return apiRequest("PUT", `/api/risk-library/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/risk-library"] });
      queryClient.invalidateQueries({ queryKey: ["/api/audit-log"] });
      toast({ title: "Template updated" });
      setDialogOpen(false);
      setEditingTemplate(null);
      form.reset();
    },
    onError: () => toast({ title: "Error updating template", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/risk-library/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/risk-library"] });
      queryClient.invalidateQueries({ queryKey: ["/api/audit-log"] });
      toast({ title: "Template deleted" });
      setDeleteConfirmOpen(false);
      setDeletingTemplate(null);
    },
    onError: () => toast({ title: "Error deleting template", variant: "destructive" }),
  });

  const addToRegisterMutation = useMutation({
    mutationFn: async (template: RiskLibraryItem) => {
      const score = template.suggestedLikelihood * template.suggestedImpact;
      const rating = score >= 20 ? "Critical" : score >= 12 ? "High" : score >= 6 ? "Medium" : "Low";
      return apiRequest("POST", "/api/risks", {
        title: template.title,
        description: template.description,
        category: template.category,
        controlDescription: template.suggestedControls,
        inherentLikelihood: template.suggestedLikelihood,
        inherentImpact: template.suggestedImpact,
        inherentScore: score,
        inherentRating: rating,
        residualLikelihood: template.suggestedLikelihood,
        residualImpact: template.suggestedImpact,
        residualScore: score,
        residualRating: rating,
        status: "Identified",
        owner: "",
        mitigationStrategy: "Mitigate",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/risks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/audit-log"] });
      toast({ title: "Risk added to register" });
    },
    onError: () => toast({ title: "Error adding risk to register", variant: "destructive" }),
  });

  function openCreateDialog() {
    setEditingTemplate(null);
    form.reset({
      title: "",
      category: "",
      description: null,
      suggestedControls: null,
      suggestedLikelihood: 3,
      suggestedImpact: 3,
      jurisdiction: null,
      source: null,
      active: true,
    });
    setDialogOpen(true);
  }

  function openEditDialog(t: RiskLibraryItem) {
    setEditingTemplate(t);
    form.reset({
      title: t.title,
      category: t.category,
      description: t.description || null,
      suggestedControls: t.suggestedControls || null,
      suggestedLikelihood: t.suggestedLikelihood,
      suggestedImpact: t.suggestedImpact,
      jurisdiction: t.jurisdiction || null,
      source: t.source || null,
      active: t.active,
    });
    setDialogOpen(true);
  }

  function onSubmit(data: TemplateFormValues) {
    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, data });
    } else {
      createMutation.mutate(data);
    }
  }

  const filtered = (templates || []).filter(t => {
    if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
    return true;
  });

  const uniqueCategories = Array.from(new Set((templates || []).map(t => t.category)));

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Risk Library</h1>
          <p className="text-muted-foreground mt-1">Manage risk templates for your register</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}><CardContent className="pt-6"><Skeleton className="h-32" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Risk Library</h1>
          <p className="text-muted-foreground mt-1">Reusable risk templates to populate your risk register</p>
        </div>
        <Button onClick={openCreateDialog} data-testid="button-add-template">
          <Plus className="mr-2 h-4 w-4" /> Add Template
        </Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-category-filter">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {uniqueCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Library className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No templates found</h3>
            <p className="text-muted-foreground mt-1">Adjust your filter or create a new template.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map(template => (
            <Card key={template.id} data-testid={`card-template-${template.id}`}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base line-clamp-2">{template.title}</CardTitle>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => openEditDialog(template)}
                      data-testid={`button-edit-template-${template.id}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => { setDeletingTemplate(template); setDeleteConfirmOpen(true); }}
                      data-testid={`button-delete-template-${template.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Badge variant="outline">{template.category}</Badge>
                {template.description && (
                  <p className="text-sm text-muted-foreground line-clamp-3">{template.description}</p>
                )}
                {template.suggestedControls && (
                  <div className="flex items-start gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground line-clamp-2">{template.suggestedControls}</p>
                  </div>
                )}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>Likelihood: {template.suggestedLikelihood}/5</span>
                  <span>Impact: {template.suggestedImpact}/5</span>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => addToRegisterMutation.mutate(template)}
                  disabled={addToRegisterMutation.isPending}
                  data-testid={`button-add-to-register-${template.id}`}
                >
                  <ArrowRight className="mr-2 h-4 w-4" /> Add to Register
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? "Edit Template" : "Add Template"}</DialogTitle>
            <DialogDescription>
              {editingTemplate ? "Update the risk template details." : "Create a new risk template for the library."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl><Input {...field} data-testid="input-template-title" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="category" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-template-category">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="source" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Source</FormLabel>
                    <FormControl><Input {...field} value={field.value || ""} placeholder="e.g. ISO 27001" data-testid="input-template-source" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl><Textarea {...field} value={field.value || ""} data-testid="input-template-description" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="suggestedControls" render={({ field }) => (
                <FormItem>
                  <FormLabel>Suggested Controls</FormLabel>
                  <FormControl><Textarea {...field} value={field.value || ""} data-testid="input-template-controls" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="suggestedLikelihood" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Likelihood (1-5)</FormLabel>
                    <Select onValueChange={(v) => field.onChange(Number(v))} value={String(field.value)}>
                      <FormControl>
                        <SelectTrigger data-testid="select-template-likelihood">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {[1, 2, 3, 4, 5].map(v => <SelectItem key={v} value={String(v)}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="suggestedImpact" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Impact (1-5)</FormLabel>
                    <Select onValueChange={(v) => field.onChange(Number(v))} value={String(field.value)}>
                      <FormControl>
                        <SelectTrigger data-testid="select-template-impact">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {[1, 2, 3, 4, 5].map(v => <SelectItem key={v} value={String(v)}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="jurisdiction" render={({ field }) => (
                <FormItem>
                  <FormLabel>Jurisdiction</FormLabel>
                  <FormControl><Input {...field} value={field.value || ""} placeholder="e.g. UK, EU" data-testid="input-template-jurisdiction" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-submit-template">
                  {editingTemplate ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Template</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingTemplate?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)} data-testid="button-cancel-delete">Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deletingTemplate && deleteMutation.mutate(deletingTemplate.id)}
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