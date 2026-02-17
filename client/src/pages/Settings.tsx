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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Pencil, Trash2, Settings as SettingsIcon } from "lucide-react";
import type { Lookup } from "@shared/schema";
import { insertLookupSchema } from "@shared/schema";

const lookupFormSchema = insertLookupSchema.extend({
  value: z.string().min(1, "Value is required"),
  label: z.string().min(1, "Label is required"),
  sortOrder: z.coerce.number().int().min(0),
});

type LookupFormValues = z.infer<typeof lookupFormSchema>;

const CATEGORIES = [
  { value: "entity_type", label: "Entity Types" },
  { value: "role", label: "Roles / Actors" },
  { value: "jurisdiction", label: "Jurisdictions" },
  { value: "document_category", label: "Document Categories" },
  { value: "finding_severity", label: "Finding Severities" },
];

function getCategoryLabel(cat: string): string {
  return CATEGORIES.find((c) => c.value === cat)?.label ?? cat;
}

export default function Settings() {
  const [selectedCategory, setSelectedCategory] = useState("entity_type");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLookup, setEditingLookup] = useState<Lookup | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingLookup, setDeletingLookup] = useState<Lookup | null>(null);
  const { toast } = useToast();

  const form = useForm<LookupFormValues>({
    resolver: zodResolver(lookupFormSchema),
    defaultValues: {
      category: "entity_type",
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
    .filter((l) => l.category === selectedCategory)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const createMutation = useMutation({
    mutationFn: async (data: LookupFormValues) => {
      const res = await apiRequest("POST", "/api/lookups", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lookups"] });
      toast({ title: "Lookup created" });
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
      toast({ title: "Lookup updated" });
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
      toast({ title: "Lookup deleted" });
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
      category: selectedCategory,
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
    <div className="max-w-[1200px] mx-auto space-y-6" data-testid="settings-page">
      <div data-testid="settings-header">
        <div className="flex items-center gap-2">
          <SettingsIcon className="h-6 w-6 text-muted-foreground" />
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Settings</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1" data-testid="text-page-subtitle">
          Manage configurable lookup values used across the platform
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3" data-testid="settings-toolbar">
        <Select value={selectedCategory} onValueChange={setSelectedCategory} data-testid="select-category">
          <SelectTrigger className="w-[240px]" data-testid="select-trigger-category">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value} data-testid={`select-item-category-${cat.value}`}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={openCreateDialog} data-testid="button-add-lookup">
          <Plus className="h-4 w-4 mr-1" />
          Add {getCategoryLabel(selectedCategory).replace(/s$/, "")}
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
                    No lookup values for this category. Click "Add" to create one.
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
              {editingLookup ? "Edit Lookup" : "Add Lookup"}
            </DialogTitle>
            <DialogDescription>
              {editingLookup ? "Update lookup value details." : `Add a new ${getCategoryLabel(selectedCategory).replace(/s$/, "").toLowerCase()} value.`}
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
            <DialogTitle>Delete Lookup</DialogTitle>
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
