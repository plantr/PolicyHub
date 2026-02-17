import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Pencil, Trash2 } from "lucide-react";
import type { Requirement, RegulatorySource } from "@shared/schema";
import { insertRequirementSchema } from "@shared/schema";

const reqFormSchema = insertRequirementSchema.extend({
  sourceId: z.coerce.number().min(1, "Source is required"),
  code: z.string().min(1, "Code is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  category: z.string().min(1, "Category is required"),
  article: z.string().nullable().default(null),
});

type ReqFormValues = z.infer<typeof reqFormSchema>;

export default function Requirements() {
  const [jurisdictionFilter, setJurisdictionFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReq, setEditingReq] = useState<Requirement | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingReq, setDeletingReq] = useState<Requirement | null>(null);
  const { toast } = useToast();

  const form = useForm<ReqFormValues>({
    resolver: zodResolver(reqFormSchema),
    defaultValues: {
      sourceId: 0,
      code: "",
      title: "",
      description: "",
      category: "",
      article: null,
    },
  });

  const { data: requirements, isLoading: reqLoading } = useQuery<Requirement[]>({
    queryKey: ["/api/requirements"],
  });

  const { data: sources, isLoading: srcLoading } = useQuery<RegulatorySource[]>({
    queryKey: ["/api/regulatory-sources"],
  });

  const isLoading = reqLoading || srcLoading;

  const sourceMap = useMemo(
    () => new Map((sources ?? []).map((s) => [s.id, s])),
    [sources]
  );

  const jurisdictions = Array.from(new Set((sources ?? []).map((s) => s.jurisdiction))).sort();
  const categories = Array.from(new Set((requirements ?? []).map((r) => r.category))).sort();

  const filtered = (requirements ?? []).filter((req) => {
    const source = sourceMap.get(req.sourceId);
    if (jurisdictionFilter !== "all" && source?.jurisdiction !== jurisdictionFilter) return false;
    if (categoryFilter !== "all" && req.category !== categoryFilter) return false;
    if (sourceFilter !== "all" && String(req.sourceId) !== sourceFilter) return false;
    return true;
  });

  const createMutation = useMutation({
    mutationFn: async (data: ReqFormValues) => {
      const res = await apiRequest("POST", "/api/requirements", {
        sourceId: data.sourceId,
        code: data.code,
        title: data.title,
        description: data.description,
        category: data.category,
        article: data.article || null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/requirements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Requirement created" });
      closeDialog();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: ReqFormValues }) => {
      const res = await apiRequest("PUT", `/api/requirements/${id}`, {
        sourceId: data.sourceId,
        code: data.code,
        title: data.title,
        description: data.description,
        category: data.category,
        article: data.article || null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/requirements"] });
      toast({ title: "Requirement updated" });
      closeDialog();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/requirements/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/requirements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Requirement deleted" });
      setDeleteConfirmOpen(false);
      setDeletingReq(null);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  function openCreateDialog() {
    setEditingReq(null);
    form.reset({
      sourceId: 0,
      code: "",
      title: "",
      description: "",
      category: "",
      article: null,
    });
    setDialogOpen(true);
  }

  function openEditDialog(req: Requirement) {
    setEditingReq(req);
    form.reset({
      sourceId: req.sourceId,
      code: req.code,
      title: req.title,
      description: req.description,
      category: req.category,
      article: req.article ?? null,
    });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingReq(null);
  }

  function onSubmit(values: ReqFormValues) {
    if (editingReq) {
      updateMutation.mutate({ id: editingReq.id, data: values });
    } else {
      createMutation.mutate(values);
    }
  }

  return (
    <div className="space-y-6" data-testid="requirements-page">
      <div className="flex flex-wrap items-start justify-between gap-3" data-testid="requirements-header">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">Requirements Library</h1>
          <p className="text-sm text-muted-foreground mt-1" data-testid="text-page-subtitle">Regulatory obligations and requirement statements</p>
        </div>
        <Button onClick={openCreateDialog} data-testid="button-add-requirement">
          <Plus className="h-4 w-4 mr-1" />
          Add Requirement
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3" data-testid="filter-bar">
        <Select value={jurisdictionFilter} onValueChange={setJurisdictionFilter} data-testid="select-jurisdiction">
          <SelectTrigger className="w-[180px]" data-testid="select-trigger-jurisdiction">
            <SelectValue placeholder="Jurisdiction" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" data-testid="select-item-jurisdiction-all">All Jurisdictions</SelectItem>
            {jurisdictions.map((j) => (
              <SelectItem key={j} value={j} data-testid={`select-item-jurisdiction-${j}`}>{j}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={categoryFilter} onValueChange={setCategoryFilter} data-testid="select-category">
          <SelectTrigger className="w-[180px]" data-testid="select-trigger-category">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" data-testid="select-item-category-all">All Categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c} data-testid={`select-item-category-${c}`}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sourceFilter} onValueChange={setSourceFilter} data-testid="select-source">
          <SelectTrigger className="w-[220px]" data-testid="select-trigger-source">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" data-testid="select-item-source-all">All Sources</SelectItem>
            {(sources ?? []).map((s) => (
              <SelectItem key={s.id} value={String(s.id)} data-testid={`select-item-source-${s.id}`}>{s.shortName}</SelectItem>
            ))}
          </SelectContent>
        </Select>

      </div>

      <Card data-testid="requirements-table-card">
        {isLoading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]" data-testid="th-code">Code</TableHead>
                <TableHead data-testid="th-title">Title</TableHead>
                <TableHead className="max-w-[300px]" data-testid="th-description">Description</TableHead>
                <TableHead data-testid="th-source">Source</TableHead>
                <TableHead data-testid="th-category">Category</TableHead>
                <TableHead data-testid="th-article">Article</TableHead>
                <TableHead className="text-right" data-testid="th-actions">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground" data-testid="text-no-requirements">
                    No requirements found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((req) => {
                  const source = sourceMap.get(req.sourceId);
                  return (
                    <TableRow key={req.id} data-testid={`row-requirement-${req.id}`}>
                      <TableCell className="font-mono text-sm font-medium" data-testid={`text-code-${req.id}`}>
                        {req.code}
                      </TableCell>
                      <TableCell className="font-medium" data-testid={`text-title-${req.id}`}>
                        {req.title}
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate text-muted-foreground text-sm" data-testid={`text-description-${req.id}`}>
                        {req.description}
                      </TableCell>
                      <TableCell className="text-sm" data-testid={`text-source-${req.id}`}>
                        {source?.shortName ?? `Source #${req.sourceId}`}
                      </TableCell>
                      <TableCell data-testid={`badge-category-${req.id}`}>
                        <Badge variant="outline">{req.category}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground" data-testid={`text-article-${req.id}`}>
                        {req.article ?? "--"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openEditDialog(req)}
                            data-testid={`button-edit-requirement-${req.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setDeletingReq(req);
                              setDeleteConfirmOpen(true);
                            }}
                            data-testid={`button-delete-requirement-${req.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]" data-testid="dialog-requirement">
          <DialogHeader>
            <DialogTitle data-testid="text-dialog-title">
              {editingReq ? "Edit Requirement" : "Add Requirement"}
            </DialogTitle>
            <DialogDescription>
              {editingReq ? "Update requirement details." : "Create a new regulatory requirement."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
              <FormField
                control={form.control}
                name="sourceId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Source</FormLabel>
                    <Select
                      value={field.value ? String(field.value) : ""}
                      onValueChange={(val) => field.onChange(Number(val))}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-trigger-sourceId">
                          <SelectValue placeholder="Select a source" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(sources ?? []).map((s) => (
                          <SelectItem key={s.id} value={String(s.id)} data-testid={`select-item-sourceId-${s.id}`}>
                            {s.shortName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Code</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. REQ-001" {...field} data-testid="input-requirement-code" />
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
                        <Input placeholder="e.g. AML/KYC" {...field} data-testid="input-requirement-category" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Requirement title" {...field} data-testid="input-requirement-title" />
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
                        placeholder="Describe the requirement"
                        className="resize-none"
                        {...field}
                        data-testid="input-requirement-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="article"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Article</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Art. 5(1)"
                        {...field}
                        value={field.value ?? ""}
                        data-testid="input-requirement-article"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeDialog} data-testid="button-cancel-requirement">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-requirement"
                >
                  {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent data-testid="dialog-delete-requirement">
          <DialogHeader>
            <DialogTitle>Delete Requirement</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingReq?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)} data-testid="button-cancel-delete-requirement">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingReq && deleteMutation.mutate(deletingReq.id)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete-requirement"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
