import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Pencil, Trash2 } from "lucide-react";
import type { Lookup } from "@shared/schema";
import { insertLookupSchema } from "@shared/schema";
import type { LucideIcon } from "lucide-react";

const lookupFormSchema = insertLookupSchema.extend({
  value: z.string().min(1, "Value is required"),
  label: z.string().min(1, "Label is required"),
  sortOrder: z.coerce.number().int().min(0),
});

type LookupFormValues = z.infer<typeof lookupFormSchema>;

export const ADMIN_CATEGORIES: Record<string, { slug: string; category: string; label: string; singular: string }> = {
  "entity-types": { slug: "entity-types", category: "entity_type", label: "Entity Types", singular: "Entity Type" },
  "roles": { slug: "roles", category: "role", label: "Roles / Actors", singular: "Role" },
  "jurisdictions": { slug: "jurisdictions", category: "jurisdiction", label: "Jurisdictions", singular: "Jurisdiction" },
  "document-categories": { slug: "document-categories", category: "document_category", label: "Document Categories", singular: "Document Category" },
  "finding-severities": { slug: "finding-severities", category: "finding_severity", label: "Finding Severities", singular: "Finding Severity" },
};

export default function LookupAdmin({ slug, icon: Icon }: { slug: string; icon: LucideIcon }) {
  const config = ADMIN_CATEGORIES[slug];
  const categoryKey = config?.category ?? slug;
  const pageTitle = config?.label ?? slug;
  const singular = config?.singular ?? "Item";

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLookup, setEditingLookup] = useState<Lookup | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingLookup, setDeletingLookup] = useState<Lookup | null>(null);
  const { toast } = useToast();

  const form = useForm<LookupFormValues>({
    resolver: zodResolver(lookupFormSchema),
    defaultValues: {
      category: categoryKey,
      value: "",
      label: "",
      sortOrder: 1,
      active: true,
    },
  });

  const { data: allLookups, isLoading } = useQuery<Lookup[]>({
    queryKey: ["/api/lookups"],
  });

  const filtered = (allLookups ?? [])
    .filter((l) => l.category === categoryKey)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const createMutation = useMutation({
    mutationFn: async (data: LookupFormValues) => {
      const res = await apiRequest("POST", "/api/lookups", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lookups"] });
      toast({ title: `${singular} created` });
      closeDialog();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<LookupFormValues> }) => {
      const res = await apiRequest("PUT", `/api/lookups/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lookups"] });
      toast({ title: `${singular} updated` });
      closeDialog();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/lookups/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lookups"] });
      toast({ title: `${singular} deleted` });
      setDeleteConfirmOpen(false);
      setDeletingLookup(null);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  function openCreateDialog() {
    setEditingLookup(null);
    form.reset({
      category: categoryKey,
      value: "",
      label: "",
      sortOrder: filtered.length + 1,
      active: true,
    });
    setDialogOpen(true);
  }

  function openEditDialog(lookup: Lookup) {
    setEditingLookup(lookup);
    form.reset({
      category: lookup.category,
      value: lookup.value,
      label: lookup.label,
      sortOrder: lookup.sortOrder,
      active: lookup.active,
    });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingLookup(null);
  }

  function onSubmit(values: LookupFormValues) {
    if (editingLookup) {
      updateMutation.mutate({ id: editingLookup.id, data: values });
    } else {
      createMutation.mutate(values);
    }
  }

  return (
    <div className="max-w-[1200px] mx-auto space-y-6" data-testid={`admin-${slug}-page`}>
      <div data-testid="admin-header">
        <div className="flex items-center gap-2">
          <Icon className="h-6 w-6 text-muted-foreground" />
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">{pageTitle}</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1" data-testid="text-page-subtitle">
          Manage {pageTitle.toLowerCase()} used across the platform
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3" data-testid="admin-toolbar">
        <Button onClick={openCreateDialog} data-testid="button-add-lookup">
          <Plus className="h-4 w-4 mr-1" />
          Add {singular}
        </Button>
      </div>

      <Card data-testid="lookups-table-card">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead data-testid="th-order">Order</TableHead>
                <TableHead data-testid="th-value">Value</TableHead>
                <TableHead data-testid="th-label">Label</TableHead>
                <TableHead data-testid="th-status">Status</TableHead>
                <TableHead className="text-right" data-testid="th-actions">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground" data-testid="text-no-lookups">
                    No {pageTitle.toLowerCase()} configured. Click "Add {singular}" to create one.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((lookup) => (
                  <TableRow key={lookup.id} data-testid={`row-lookup-${lookup.id}`}>
                    <TableCell className="text-sm text-muted-foreground" data-testid={`text-order-${lookup.id}`}>
                      {lookup.sortOrder}
                    </TableCell>
                    <TableCell className="text-sm font-mono" data-testid={`text-value-${lookup.id}`}>
                      {lookup.value}
                    </TableCell>
                    <TableCell className="text-sm font-medium" data-testid={`text-label-${lookup.id}`}>
                      {lookup.label}
                    </TableCell>
                    <TableCell data-testid={`badge-status-${lookup.id}`}>
                      <Badge variant={lookup.active ? "default" : "secondary"} className="no-default-active-elevate">
                        {lookup.active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openEditDialog(lookup)}
                          data-testid={`button-edit-lookup-${lookup.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setDeletingLookup(lookup);
                            setDeleteConfirmOpen(true);
                          }}
                          data-testid={`button-delete-lookup-${lookup.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent data-testid="dialog-lookup">
          <DialogHeader>
            <DialogTitle data-testid="text-dialog-title">
              {editingLookup ? `Edit ${singular}` : `Add ${singular}`}
            </DialogTitle>
            <DialogDescription>
              {editingLookup ? `Update ${singular.toLowerCase()} details.` : `Add a new ${singular.toLowerCase()} value.`}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
              <FormField
                control={form.control}
                name="value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Value (code)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. EMI" {...field} data-testid="input-lookup-value" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Label</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Electronic Money Institution" {...field} data-testid="input-lookup-label" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sortOrder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sort Order</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} data-testid="input-lookup-sort" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="active"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-lookup-active"
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">Active</FormLabel>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeDialog} data-testid="button-cancel-lookup">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-lookup"
                >
                  {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent data-testid="dialog-delete-lookup">
          <DialogHeader>
            <DialogTitle>Delete {singular}</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingLookup?.label}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)} data-testid="button-cancel-delete">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingLookup && deleteMutation.mutate(deletingLookup.id)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
