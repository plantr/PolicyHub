import { useState } from "react";
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Pencil, Archive, Building2, MapPin } from "lucide-react";
import type { BusinessUnit } from "@shared/schema";
import { insertBusinessUnitSchema } from "@shared/schema";

const buFormSchema = insertBusinessUnitSchema.extend({
  code: z.string().nullable().default(null),
  name: z.string().min(1, "Name is required"),
  jurisdiction: z.string().min(1, "Jurisdiction is required"),
  type: z.string().min(1, "Entity type is required"),
  description: z.string().nullable().default(null),
  activitiesText: z.string().default(""),
}).omit({ activities: true, effectiveDate: true });

type BUFormValues = z.infer<typeof buFormSchema>;

export default function BusinessUnits() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBU, setEditingBU] = useState<BusinessUnit | null>(null);
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
  const [archivingBU, setArchivingBU] = useState<BusinessUnit | null>(null);
  const { toast } = useToast();

  const form = useForm<BUFormValues>({
    resolver: zodResolver(buFormSchema),
    defaultValues: {
      code: null,
      name: "",
      jurisdiction: "",
      type: "",
      description: null,
      activitiesText: "",
    },
  });

  const { data: businessUnits, isLoading } = useQuery<BusinessUnit[]>({
    queryKey: ["/api/business-units"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: BUFormValues) => {
      const activities = data.activitiesText
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean);
      const res = await apiRequest("POST", "/api/business-units", {
        code: data.code || null,
        name: data.name,
        jurisdiction: data.jurisdiction,
        type: data.type,
        description: data.description || null,
        activities,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/business-units"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Business unit created" });
      closeDialog();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: BUFormValues }) => {
      const activities = data.activitiesText
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean);
      const res = await apiRequest("PUT", `/api/business-units/${id}`, {
        code: data.code || null,
        name: data.name,
        jurisdiction: data.jurisdiction,
        type: data.type,
        description: data.description || null,
        activities,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/business-units"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Business unit updated" });
      closeDialog();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("PUT", `/api/business-units/${id}/archive`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/business-units"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Business unit archived" });
      setArchiveConfirmOpen(false);
      setArchivingBU(null);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  function openCreateDialog() {
    setEditingBU(null);
    form.reset({
      code: null,
      name: "",
      jurisdiction: "",
      type: "",
      description: null,
      activitiesText: "",
    });
    setDialogOpen(true);
  }

  function openEditDialog(bu: BusinessUnit) {
    setEditingBU(bu);
    form.reset({
      code: bu.code ?? null,
      name: bu.name,
      jurisdiction: bu.jurisdiction,
      type: bu.type,
      description: bu.description ?? null,
      activitiesText: (bu.activities ?? []).join(", "),
    });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingBU(null);
  }

  function onSubmit(values: BUFormValues) {
    if (editingBU) {
      updateMutation.mutate({ id: editingBU.id, data: values });
    } else {
      createMutation.mutate(values);
    }
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-6" data-testid="business-units-page">
      <div data-testid="bu-header">
        <div className="flex items-center gap-2">
          <Building2 className="h-6 w-6 text-muted-foreground" />
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Business Units</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1" data-testid="text-page-subtitle">
          Manage regulated entities across jurisdictions
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3" data-testid="bu-toolbar">
        <Button onClick={openCreateDialog} data-testid="button-add-bu">
          <Plus className="h-4 w-4 mr-1" />
          Add Business Unit
        </Button>
      </div>

      <Card data-testid="bu-table-card">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead data-testid="th-code">Code</TableHead>
                <TableHead data-testid="th-name">Name</TableHead>
                <TableHead data-testid="th-type">Type</TableHead>
                <TableHead data-testid="th-jurisdiction">Jurisdiction</TableHead>
                <TableHead data-testid="th-status">Status</TableHead>
                <TableHead data-testid="th-activities">Activities</TableHead>
                <TableHead data-testid="th-description">Description</TableHead>
                <TableHead className="text-right" data-testid="th-actions">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(businessUnits ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-muted-foreground" data-testid="text-no-bus">
                    No business units configured. Click "Add Business Unit" to create one.
                  </TableCell>
                </TableRow>
              ) : (
                (businessUnits ?? []).map((bu) => (
                  <TableRow key={bu.id} data-testid={`row-bu-${bu.id}`}>
                    <TableCell className="text-sm text-muted-foreground" data-testid={`text-code-${bu.id}`}>
                      {bu.code ?? "--"}
                    </TableCell>
                    <TableCell className="font-medium" data-testid={`text-name-${bu.id}`}>
                      {bu.name}
                    </TableCell>
                    <TableCell data-testid={`badge-type-${bu.id}`}>
                      <Badge variant="outline">{bu.type}</Badge>
                    </TableCell>
                    <TableCell data-testid={`text-jurisdiction-${bu.id}`}>
                      <div className="flex items-center gap-1 text-sm">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        {bu.jurisdiction}
                      </div>
                    </TableCell>
                    <TableCell data-testid={`badge-status-${bu.id}`}>
                      <Badge variant={bu.status === "Active" ? "default" : "secondary"}>
                        {bu.status}
                      </Badge>
                    </TableCell>
                    <TableCell data-testid={`text-activities-${bu.id}`}>
                      <div className="flex flex-wrap gap-1">
                        {(bu.activities ?? []).map((a, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs no-default-active-elevate">
                            {a}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate" data-testid={`text-desc-${bu.id}`}>
                      {bu.description ?? "--"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openEditDialog(bu)}
                          data-testid={`button-edit-bu-${bu.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setArchivingBU(bu);
                            setArchiveConfirmOpen(true);
                          }}
                          disabled={bu.status === "Archived"}
                          data-testid={`button-archive-bu-${bu.id}`}
                        >
                          <Archive className="h-4 w-4" />
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
        <DialogContent className="sm:max-w-[500px]" data-testid="dialog-bu">
          <DialogHeader>
            <DialogTitle data-testid="text-dialog-title">
              {editingBU ? "Edit Business Unit" : "Add Business Unit"}
            </DialogTitle>
            <DialogDescription>
              {editingBU ? "Update business unit details." : "Create a new regulated entity."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Code</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. UK-EMI" {...field} value={field.value ?? ""} data-testid="input-bu-code" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. UK EMI" {...field} data-testid="input-bu-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Entity Type</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. EMI, VASP, CASP" {...field} data-testid="input-bu-type" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="jurisdiction"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jurisdiction</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. United Kingdom" {...field} data-testid="input-bu-jurisdiction" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="activitiesText"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Activities (comma-separated)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Electronic money issuance, Payment services, Safeguarding"
                        className="resize-none"
                        {...field}
                        data-testid="input-bu-activities"
                      />
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
                        placeholder="Brief description of the business unit"
                        className="resize-none"
                        {...field}
                        value={field.value ?? ""}
                        data-testid="input-bu-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeDialog} data-testid="button-cancel-bu">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-bu"
                >
                  {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={archiveConfirmOpen} onOpenChange={setArchiveConfirmOpen}>
        <DialogContent data-testid="dialog-archive-bu">
          <DialogHeader>
            <DialogTitle>Archive Business Unit</DialogTitle>
            <DialogDescription>
              Are you sure you want to archive "{archivingBU?.name}"? It will no longer appear as active but its data will be preserved.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setArchiveConfirmOpen(false)} data-testid="button-cancel-archive-bu">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => archivingBU && archiveMutation.mutate(archivingBU.id)}
              disabled={archiveMutation.isPending}
              data-testid="button-confirm-archive-bu"
            >
              {archiveMutation.isPending ? "Archiving..." : "Archive"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
