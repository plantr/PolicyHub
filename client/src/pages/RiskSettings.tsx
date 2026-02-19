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
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";
import { Plus, Pencil, Trash2, Settings2 } from "lucide-react";
import type { RiskCategory, ImpactLevel, LikelihoodLevel } from "@shared/schema";

type TabKey = "categories" | "impact" | "likelihood";

const categoryFormSchema = z.object({
  value: z.string().min(1, "Value is required"),
  label: z.string().min(1, "Label is required"),
  sortOrder: z.coerce.number().int().min(0),
  active: z.boolean().default(true),
});

const levelFormSchema = z.object({
  value: z.coerce.number().int().min(1).max(5),
  label: z.string().min(1, "Label is required"),
  description: z.string().nullable().default(null),
  sortOrder: z.coerce.number().int().min(0),
  active: z.boolean().default(true),
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;
type LevelFormValues = z.infer<typeof levelFormSchema>;

const TAB_CONFIG: Record<TabKey, { label: string; singular: string; apiBase: string; table: string; queryKey: string; hasDescription: boolean; valueType: "text" | "number" }> = {
  categories: { label: "Categories", singular: "Category", apiBase: "/api/risk-categories", table: "risk_categories", queryKey: "risk-categories", hasDescription: false, valueType: "text" },
  impact: { label: "Impact Levels", singular: "Impact Level", apiBase: "/api/impact-levels", table: "impact_levels", queryKey: "impact-levels", hasDescription: true, valueType: "number" },
  likelihood: { label: "Likelihood Levels", singular: "Likelihood Level", apiBase: "/api/likelihood-levels", table: "likelihood_levels", queryKey: "likelihood-levels", hasDescription: true, valueType: "number" },
};

function SettingsTable({ tabKey }: { tabKey: TabKey }) {
  const config = TAB_CONFIG[tabKey];
  const isCategory = tabKey === "categories";

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<RiskCategory | ImpactLevel | LikelihoodLevel | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState<RiskCategory | ImpactLevel | LikelihoodLevel | null>(null);
  const { toast } = useToast();

  const categoryForm = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: { value: "", label: "", sortOrder: 0, active: true },
  });

  const levelForm = useForm<LevelFormValues>({
    resolver: zodResolver(levelFormSchema),
    defaultValues: { value: 1, label: "", description: null, sortOrder: 0, active: true },
  });

  const form = isCategory ? categoryForm : levelForm;

  const { data: records, isLoading } = useQuery<(RiskCategory | ImpactLevel | LikelihoodLevel)[]>({
    queryKey: [config.queryKey],
    queryFn: async () => {
      const { data, error } = await supabase.from(config.table).select("*");
      if (error) throw error;
      return (data ?? []) as (RiskCategory | ImpactLevel | LikelihoodLevel)[];
    },
  });

  const sorted = [...(records || [])].sort((a, b) => a.sortOrder - b.sortOrder);

  const createMutation = useMutation({
    mutationFn: async (data: CategoryFormValues | LevelFormValues) => {
      return apiRequest("POST", config.apiBase, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [config.queryKey] });
      toast({ title: `${config.singular} created` });
      closeDialog();
    },
    onError: () => toast({ title: `Error creating ${config.singular.toLowerCase()}`, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: CategoryFormValues | LevelFormValues }) => {
      return apiRequest("PUT", `${config.apiBase}/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [config.queryKey] });
      toast({ title: `${config.singular} updated` });
      closeDialog();
    },
    onError: () => toast({ title: `Error updating ${config.singular.toLowerCase()}`, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `${config.apiBase}/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [config.queryKey] });
      toast({ title: `${config.singular} deleted` });
      setDeleteConfirmOpen(false);
      setDeletingRecord(null);
    },
    onError: () => toast({ title: `Error deleting ${config.singular.toLowerCase()}`, variant: "destructive" }),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, active }: { id: number; active: boolean }) => {
      return apiRequest("PUT", `${config.apiBase}/${id}`, { active });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [config.queryKey] });
    },
    onError: () => toast({ title: "Error updating status", variant: "destructive" }),
  });

  function openCreateDialog() {
    setEditingRecord(null);
    if (isCategory) {
      categoryForm.reset({ value: "", label: "", sortOrder: sorted.length + 1, active: true });
    } else {
      levelForm.reset({ value: 1, label: "", description: null, sortOrder: sorted.length + 1, active: true });
    }
    setDialogOpen(true);
  }

  function openEditDialog(record: RiskCategory | ImpactLevel | LikelihoodLevel) {
    setEditingRecord(record);
    if (isCategory) {
      const r = record as RiskCategory;
      categoryForm.reset({ value: r.value, label: r.label, sortOrder: r.sortOrder, active: r.active });
    } else {
      const r = record as ImpactLevel | LikelihoodLevel;
      levelForm.reset({ value: r.value, label: r.label, description: r.description || null, sortOrder: r.sortOrder, active: r.active });
    }
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingRecord(null);
  }

  function onSubmit(values: CategoryFormValues | LevelFormValues) {
    if (editingRecord) {
      updateMutation.mutate({ id: editingRecord.id, data: values });
    } else {
      createMutation.mutate(values);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button onClick={openCreateDialog} data-testid={`button-add-${tabKey}`}>
          <Plus className="h-4 w-4 mr-1" /> Add {config.singular}
        </Button>
      </div>

      <Card data-testid={`table-card-${tabKey}`}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Value</TableHead>
              <TableHead>Label</TableHead>
              {config.hasDescription && <TableHead>Description</TableHead>}
              <TableHead>Order</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={config.hasDescription ? 6 : 5} className="h-32 text-center text-muted-foreground">
                  No {config.label.toLowerCase()} configured. Click "Add {config.singular}" to create one.
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((record) => {
                const desc = config.hasDescription ? (record as ImpactLevel | LikelihoodLevel).description : null;
                return (
                  <TableRow key={record.id} data-testid={`row-${tabKey}-${record.id}`}>
                    <TableCell className="font-mono text-sm" data-testid={`text-value-${tabKey}-${record.id}`}>
                      {record.value}
                    </TableCell>
                    <TableCell className="font-medium" data-testid={`text-label-${tabKey}-${record.id}`}>
                      {record.label}
                    </TableCell>
                    {config.hasDescription && (
                      <TableCell className="text-sm text-muted-foreground" data-testid={`text-desc-${tabKey}-${record.id}`}>
                        {desc || "-"}
                      </TableCell>
                    )}
                    <TableCell data-testid={`text-order-${tabKey}-${record.id}`}>
                      {record.sortOrder}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={record.active}
                        onCheckedChange={(checked) => toggleActiveMutation.mutate({ id: record.id, active: checked })}
                        data-testid={`switch-active-${tabKey}-${record.id}`}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openEditDialog(record)}
                          data-testid={`button-edit-${tabKey}-${record.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => { setDeletingRecord(record); setDeleteConfirmOpen(true); }}
                          data-testid={`button-delete-${tabKey}-${record.id}`}
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
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent data-testid={`dialog-${tabKey}`}>
          <DialogHeader>
            <DialogTitle>{editingRecord ? `Edit ${config.singular}` : `Add ${config.singular}`}</DialogTitle>
            <DialogDescription>
              {editingRecord ? `Update ${config.singular.toLowerCase()} details.` : `Add a new ${config.singular.toLowerCase()}.`}
            </DialogDescription>
          </DialogHeader>
          {isCategory ? (
            <Form {...categoryForm}>
              <form onSubmit={categoryForm.handleSubmit(onSubmit)} className="space-y-4 py-2">
                <FormField control={categoryForm.control} name="value" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Value (slug)</FormLabel>
                    <FormControl><Input {...field} placeholder="e.g. operational" data-testid={`input-value-${tabKey}`} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={categoryForm.control} name="label" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Label</FormLabel>
                    <FormControl><Input {...field} placeholder="e.g. Operational Risk" data-testid={`input-label-${tabKey}`} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={categoryForm.control} name="sortOrder" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sort Order</FormLabel>
                    <FormControl><Input type="number" {...field} data-testid={`input-sort-${tabKey}`} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={categoryForm.control} name="active" render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} data-testid={`switch-active-form-${tabKey}`} />
                    </FormControl>
                    <FormLabel className="!mt-0">Active</FormLabel>
                  </FormItem>
                )} />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={closeDialog} data-testid={`button-cancel-${tabKey}`}>Cancel</Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid={`button-save-${tabKey}`}>
                    {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          ) : (
            <Form {...levelForm}>
              <form onSubmit={levelForm.handleSubmit(onSubmit)} className="space-y-4 py-2">
                <FormField control={levelForm.control} name="value" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Value (1-5)</FormLabel>
                    <FormControl><Input type="number" min={1} max={5} {...field} data-testid={`input-value-${tabKey}`} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={levelForm.control} name="label" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Label</FormLabel>
                    <FormControl><Input {...field} placeholder="e.g. Very High" data-testid={`input-label-${tabKey}`} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={levelForm.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl><Input {...field} value={field.value || ""} placeholder="Optional description" data-testid={`input-desc-${tabKey}`} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={levelForm.control} name="sortOrder" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sort Order</FormLabel>
                    <FormControl><Input type="number" {...field} data-testid={`input-sort-${tabKey}`} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={levelForm.control} name="active" render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} data-testid={`switch-active-form-${tabKey}`} />
                    </FormControl>
                    <FormLabel className="!mt-0">Active</FormLabel>
                  </FormItem>
                )} />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={closeDialog} data-testid={`button-cancel-${tabKey}`}>Cancel</Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid={`button-save-${tabKey}`}>
                    {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent data-testid={`dialog-delete-${tabKey}`}>
          <DialogHeader>
            <DialogTitle>Delete {config.singular}</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingRecord?.label}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)} data-testid={`button-cancel-delete-${tabKey}`}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deletingRecord && deleteMutation.mutate(deletingRecord.id)}
              disabled={deleteMutation.isPending}
              data-testid={`button-confirm-delete-${tabKey}`}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function RiskSettings() {
  return (
    <div className="space-y-6" data-testid="risk-settings-page">
      <div>
        <div className="flex items-center gap-2">
          <Settings2 className="h-6 w-6 text-muted-foreground" />
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Risk Settings</h1>
        </div>
        <p className="text-muted-foreground mt-1">Configure risk categories, impact levels, and likelihood levels</p>
      </div>

      <Tabs defaultValue="categories" data-testid="tabs-risk-settings">
        <TabsList data-testid="tabs-list-risk-settings">
          <TabsTrigger value="categories" data-testid="tab-categories">Categories</TabsTrigger>
          <TabsTrigger value="impact" data-testid="tab-impact">Impact Levels</TabsTrigger>
          <TabsTrigger value="likelihood" data-testid="tab-likelihood">Likelihood Levels</TabsTrigger>
        </TabsList>
        <TabsContent value="categories">
          <SettingsTable tabKey="categories" />
        </TabsContent>
        <TabsContent value="impact">
          <SettingsTable tabKey="impact" />
        </TabsContent>
        <TabsContent value="likelihood">
          <SettingsTable tabKey="likelihood" />
        </TabsContent>
      </Tabs>
    </div>
  );
}