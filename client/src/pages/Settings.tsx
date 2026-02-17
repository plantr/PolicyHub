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
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown } from "lucide-react";


type AdminRecord = { id: number; value?: string; label: string; sortOrder: number; active: boolean };

const TABLES_WITHOUT_VALUE = ["document-categories"];

const adminFormSchema = z.object({
  value: z.string().optional().default(""),
  label: z.string().min(1, "Label is required"),
  sortOrder: z.coerce.number().int().min(0),
  active: z.boolean().default(true),
});

type AdminFormValues = z.infer<typeof adminFormSchema>;

export const ADMIN_CATEGORIES: Record<string, { slug: string; label: string; singular: string }> = {
  "entity-types": { slug: "entity-types", label: "Entity Types", singular: "Entity Type" },
  "roles": { slug: "roles", label: "Roles / Actors", singular: "Role" },
  "jurisdictions": { slug: "jurisdictions", label: "Jurisdictions", singular: "Jurisdiction" },
  "document-categories": { slug: "document-categories", label: "Document Categories", singular: "Document Category" },
  "finding-severities": { slug: "finding-severities", label: "Finding Severities", singular: "Finding Severity" },
  "document-statuses": { slug: "document-statuses", label: "Document Statuses", singular: "Document Status" },
};

export default function LookupAdmin({ slug }: { slug: string }) {
  const config = ADMIN_CATEGORIES[slug];
  const pageTitle = config?.label ?? slug;
  const singular = config?.singular ?? "Item";
  const apiBase = `/api/admin/${slug}`;
  const hasValue = !TABLES_WITHOUT_VALUE.includes(slug);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AdminRecord | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState<AdminRecord | null>(null);
  const { toast } = useToast();

  const form = useForm<AdminFormValues>({
    resolver: zodResolver(adminFormSchema),
    defaultValues: {
      value: "",
      label: "",
      sortOrder: 1,
      active: true,
    },
  });

  const { data: records, isLoading } = useQuery<AdminRecord[]>({
    queryKey: [apiBase],
  });

  const sorted = (records ?? []).sort((a, b) => a.sortOrder - b.sortOrder);

  const createMutation = useMutation({
    mutationFn: async (data: AdminFormValues) => {
      const payload = hasValue ? data : { label: data.label, sortOrder: data.sortOrder, active: data.active };
      const res = await apiRequest("POST", apiBase, payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [apiBase] });
      toast({ title: `${singular} created` });
      closeDialog();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<AdminFormValues> }) => {
      const payload = hasValue ? data : { label: data.label, sortOrder: data.sortOrder, active: data.active };
      const res = await apiRequest("PUT", `${apiBase}/${id}`, payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [apiBase] });
      toast({ title: `${singular} updated` });
      closeDialog();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `${apiBase}/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [apiBase] });
      toast({ title: `${singular} deleted` });
      setDeleteConfirmOpen(false);
      setDeletingRecord(null);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (orderedIds: number[]) => {
      const res = await apiRequest("POST", `${apiBase}/reorder`, { orderedIds });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [apiBase] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  function moveItem(index: number, direction: "up" | "down") {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= sorted.length) return;
    const reordered = [...sorted];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(newIndex, 0, moved);
    reorderMutation.mutate(reordered.map((r) => r.id));
  }

  function openCreateDialog() {
    setEditingRecord(null);
    form.reset({
      value: "",
      label: "",
      sortOrder: sorted.length + 1,
      active: true,
    });
    setDialogOpen(true);
  }

  function openEditDialog(record: AdminRecord) {
    setEditingRecord(record);
    form.reset({
      value: record.value,
      label: record.label,
      sortOrder: record.sortOrder,
      active: record.active,
    });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingRecord(null);
  }

  function onSubmit(values: AdminFormValues) {
    if (editingRecord) {
      updateMutation.mutate({ id: editingRecord.id, data: values });
    } else {
      createMutation.mutate(values);
    }
  }

  return (
    <div className="space-y-6" data-testid={`admin-${slug}-page`}>
      <div className="flex flex-wrap items-start justify-between gap-3" data-testid="admin-header">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">{pageTitle}</h1>
          <p className="text-sm text-muted-foreground mt-1" data-testid="text-page-subtitle">
            Manage {pageTitle.toLowerCase()} used across the platform
          </p>
        </div>
        <Button onClick={openCreateDialog} data-testid="button-add-record">
          <Plus className="h-4 w-4 mr-1" />
          Add {singular}
        </Button>
      </div>

      <Card data-testid="admin-table-card">
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
                {hasValue && <TableHead data-testid="th-value">Value</TableHead>}
                <TableHead data-testid="th-label">{slug === "document-categories" ? "Category" : "Label"}</TableHead>
                <TableHead data-testid="th-status">Status</TableHead>
                <TableHead className="text-right" data-testid="th-actions">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={hasValue ? 5 : 4} className="h-32 text-center text-muted-foreground" data-testid="text-no-records">
                    No {pageTitle.toLowerCase()} configured. Click "Add {singular}" to create one.
                  </TableCell>
                </TableRow>
              ) : (
                sorted.map((record, index) => (
                  <TableRow key={record.id} data-testid={`row-record-${record.id}`}>
                    <TableCell data-testid={`text-order-${record.id}`}>
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-muted-foreground w-6 text-center">{record.sortOrder}</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          disabled={index === 0 || reorderMutation.isPending}
                          onClick={() => moveItem(index, "up")}
                          className="visibility-visible"
                          style={{ visibility: index === 0 ? "hidden" : "visible" }}
                          data-testid={`button-move-up-${record.id}`}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          disabled={index === sorted.length - 1 || reorderMutation.isPending}
                          onClick={() => moveItem(index, "down")}
                          style={{ visibility: index === sorted.length - 1 ? "hidden" : "visible" }}
                          data-testid={`button-move-down-${record.id}`}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                    {hasValue && (
                      <TableCell className="text-sm font-mono" data-testid={`text-value-${record.id}`}>
                        {record.value}
                      </TableCell>
                    )}
                    <TableCell className="text-sm font-medium" data-testid={`text-label-${record.id}`}>
                      {record.label}
                    </TableCell>
                    <TableCell data-testid={`badge-status-${record.id}`}>
                      <Badge variant={record.active ? "default" : "secondary"} className="no-default-active-elevate">
                        {record.active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openEditDialog(record)}
                          data-testid={`button-edit-record-${record.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setDeletingRecord(record);
                            setDeleteConfirmOpen(true);
                          }}
                          data-testid={`button-delete-record-${record.id}`}
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
        <DialogContent data-testid="dialog-admin-record">
          <DialogHeader>
            <DialogTitle data-testid="text-dialog-title">
              {editingRecord ? `Edit ${singular}` : `Add ${singular}`}
            </DialogTitle>
            <DialogDescription>
              {editingRecord ? `Update ${singular.toLowerCase()} details.` : `Add a new ${singular.toLowerCase()} value.`}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
              {hasValue && (
                <FormField
                  control={form.control}
                  name="value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Value (code)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. EMI" {...field} data-testid="input-record-value" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <FormField
                control={form.control}
                name="label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{slug === "document-categories" ? "Category" : "Display Label"}</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Electronic Money Institution" {...field} data-testid="input-record-label" />
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
                      <Input type="number" {...field} data-testid="input-record-sort" />
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
                        data-testid="switch-record-active"
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">Active</FormLabel>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeDialog} data-testid="button-cancel-record">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-record"
                >
                  {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent data-testid="dialog-delete-record">
          <DialogHeader>
            <DialogTitle>Delete {singular}</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingRecord?.label}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)} data-testid="button-cancel-delete">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingRecord && deleteMutation.mutate(deletingRecord.id)}
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
