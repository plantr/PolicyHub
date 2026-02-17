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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Pencil, Trash2, ExternalLink } from "lucide-react";
import type { RegulatorySource } from "@shared/schema";
import { insertRegulatorySourceSchema } from "@shared/schema";

const sourceFormSchema = insertRegulatorySourceSchema.extend({
  name: z.string().min(1, "Name is required"),
  shortName: z.string().min(1, "Short name is required"),
  jurisdiction: z.string().min(1, "Jurisdiction is required"),
  category: z.string().min(1, "Category is required"),
  url: z.string().nullable().default(null),
  description: z.string().nullable().default(null),
});

type SourceFormValues = z.infer<typeof sourceFormSchema>;

const JURISDICTION_ORDER = ["UK", "Gibraltar", "Estonia/EU", "International"];

function groupByJurisdiction(sources: RegulatorySource[]) {
  const groups: Record<string, RegulatorySource[]> = {};
  for (const s of sources) {
    const key = s.jurisdiction;
    if (!groups[key]) groups[key] = [];
    groups[key].push(s);
  }
  const ordered: [string, RegulatorySource[]][] = [];
  for (const j of JURISDICTION_ORDER) {
    if (groups[j]) {
      ordered.push([j, groups[j]]);
      delete groups[j];
    }
  }
  for (const [j, list] of Object.entries(groups)) {
    ordered.push([j, list]);
  }
  return ordered;
}

export default function RegulatorySources() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<RegulatorySource | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingSource, setDeletingSource] = useState<RegulatorySource | null>(null);
  const { toast } = useToast();

  const form = useForm<SourceFormValues>({
    resolver: zodResolver(sourceFormSchema),
    defaultValues: {
      name: "",
      shortName: "",
      jurisdiction: "",
      category: "",
      url: null,
      description: null,
    },
  });

  const { data: sources, isLoading } = useQuery<RegulatorySource[]>({
    queryKey: ["/api/regulatory-sources"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: SourceFormValues) => {
      const res = await apiRequest("POST", "/api/regulatory-sources", {
        name: data.name,
        shortName: data.shortName,
        jurisdiction: data.jurisdiction,
        category: data.category,
        url: data.url || null,
        description: data.description || null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/regulatory-sources"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Regulatory source created" });
      closeDialog();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: SourceFormValues }) => {
      const res = await apiRequest("PUT", `/api/regulatory-sources/${id}`, {
        name: data.name,
        shortName: data.shortName,
        jurisdiction: data.jurisdiction,
        category: data.category,
        url: data.url || null,
        description: data.description || null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/regulatory-sources"] });
      toast({ title: "Regulatory source updated" });
      closeDialog();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/regulatory-sources/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/regulatory-sources"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Regulatory source deleted" });
      setDeleteConfirmOpen(false);
      setDeletingSource(null);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  function openCreateDialog() {
    setEditingSource(null);
    form.reset({
      name: "",
      shortName: "",
      jurisdiction: "",
      category: "",
      url: null,
      description: null,
    });
    setDialogOpen(true);
  }

  function openEditDialog(source: RegulatorySource) {
    setEditingSource(source);
    form.reset({
      name: source.name,
      shortName: source.shortName,
      jurisdiction: source.jurisdiction,
      category: source.category,
      url: source.url ?? null,
      description: source.description ?? null,
    });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingSource(null);
  }

  function onSubmit(values: SourceFormValues) {
    if (editingSource) {
      updateMutation.mutate({ id: editingSource.id, data: values });
    } else {
      createMutation.mutate(values);
    }
  }

  const groups = groupByJurisdiction(sources ?? []);

  return (
    <div className="space-y-6" data-testid="regulatory-sources-page">
      <div className="flex flex-wrap items-start justify-between gap-3" data-testid="regulatory-sources-header">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">Regulatory Sources</h1>
          <p className="text-sm text-muted-foreground mt-1" data-testid="text-page-subtitle">Applicable legislation and regulatory instruments</p>
        </div>
        <Button onClick={openCreateDialog} data-testid="button-add-source">
          <Plus className="h-4 w-4 mr-1" />
          Add Source
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-6" data-testid="sources-skeleton">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-6 w-[160px]" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ))}
        </div>
      ) : groups.length === 0 ? (
        <p className="text-muted-foreground text-center py-12" data-testid="text-no-sources">No regulatory sources found.</p>
      ) : (
        groups.map(([jurisdiction, items]) => (
          <div key={jurisdiction} className="space-y-3" data-testid={`section-jurisdiction-${jurisdiction}`}>
            <h2 className="text-lg font-semibold" data-testid={`text-jurisdiction-heading-${jurisdiction}`}>{jurisdiction}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {items.map((source) => (
                <Card key={source.id} data-testid={`card-source-${source.id}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <CardTitle className="text-base" data-testid={`text-source-name-${source.id}`}>
                        {source.name}
                      </CardTitle>
                      <div className="flex items-center gap-1 flex-wrap">
                        <Badge variant="secondary" data-testid={`badge-short-name-${source.id}`}>{source.shortName}</Badge>
                        <Badge variant="outline" data-testid={`badge-category-${source.id}`}>{source.category}</Badge>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openEditDialog(source)}
                          data-testid={`button-edit-source-${source.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setDeletingSource(source);
                            setDeleteConfirmOpen(true);
                          }}
                          data-testid={`button-delete-source-${source.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {source.description && (
                      <p className="text-sm text-muted-foreground" data-testid={`text-source-description-${source.id}`}>
                        {source.description}
                      </p>
                    )}
                    {source.url && (
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-primary"
                        data-testid={`link-source-url-${source.id}`}
                      >
                        <ExternalLink className="w-3 h-3" />
                        View source
                      </a>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]" data-testid="dialog-source">
          <DialogHeader>
            <DialogTitle data-testid="text-dialog-title">
              {editingSource ? "Edit Regulatory Source" : "Add Regulatory Source"}
            </DialogTitle>
            <DialogDescription>
              {editingSource ? "Update regulatory source details." : "Add a new regulatory source."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Electronic Money Regulations 2011" {...field} data-testid="input-source-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="shortName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Short Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. EMRs" {...field} data-testid="input-source-short-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Legislation" {...field} data-testid="input-source-category" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="jurisdiction"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Jurisdiction</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. UK" {...field} data-testid="input-source-jurisdiction" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://..." {...field} value={field.value ?? ""} data-testid="input-source-url" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Brief description of the regulatory source"
                        className="resize-none"
                        {...field}
                        value={field.value ?? ""}
                        data-testid="input-source-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeDialog} data-testid="button-cancel-source">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-source"
                >
                  {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent data-testid="dialog-delete-source">
          <DialogHeader>
            <DialogTitle>Delete Regulatory Source</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingSource?.name}"? This may affect linked requirements and regulatory profiles.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)} data-testid="button-cancel-delete-source">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingSource && deleteMutation.mutate(deletingSource.id)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete-source"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
