import { Fragment, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
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
import { format } from "date-fns";
import { AlertTriangle, Clock, FileWarning, ListChecks, ChevronDown, ChevronUp, Plus, Pencil, Trash2 } from "lucide-react";
import type { Finding, BusinessUnit } from "@shared/schema";
import { insertFindingSchema } from "@shared/schema";

const findingFormSchema = insertFindingSchema.extend({
  title: z.string().min(1, "Title is required"),
  source: z.string().min(1, "Source is required"),
  severity: z.string().min(1, "Severity is required"),
  status: z.string().min(1, "Status is required"),
  businessUnitId: z.coerce.number().min(1, "Business unit is required"),
  owner: z.string().min(1, "Owner is required"),
  approver: z.string().nullable().default(null),
  description: z.string().nullable().default(null),
  rootCause: z.string().nullable().default(null),
  remediationPlan: z.string().nullable().default(null),
  dueDate: z.string().nullable().default(null),
});

type FindingFormValues = z.infer<typeof findingFormSchema>;

function getSeverityVariant(severity: string) {
  switch (severity) {
    case "High": return "destructive" as const;
    case "Medium": return "default" as const;
    case "Low": return "secondary" as const;
    default: return "secondary" as const;
  }
}

function isOverdue(finding: Finding) {
  if (!finding.dueDate) return false;
  if (finding.status === "Closed" || finding.status === "Verified") return false;
  return new Date(finding.dueDate) < new Date();
}

function formatDateForInput(date: string | Date | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  return d.toISOString().split("T")[0];
}

export default function Findings() {
  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [buFilter, setBuFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFinding, setEditingFinding] = useState<Finding | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingFinding, setDeletingFinding] = useState<Finding | null>(null);
  const { toast } = useToast();

  const form = useForm<FindingFormValues>({
    resolver: zodResolver(findingFormSchema),
    defaultValues: {
      title: "",
      source: "",
      severity: "",
      status: "New",
      businessUnitId: 0,
      owner: "",
      approver: null,
      description: null,
      rootCause: null,
      remediationPlan: null,
      dueDate: null,
    },
  });

  const { data: findings, isLoading: findingsLoading } = useQuery<Finding[]>({
    queryKey: ["/api/findings"],
  });
  const { data: businessUnits, isLoading: buLoading } = useQuery<BusinessUnit[]>({
    queryKey: ["/api/business-units"],
  });

  const isLoading = findingsLoading || buLoading;

  const createMutation = useMutation({
    mutationFn: async (data: FindingFormValues) => {
      const payload = {
        ...data,
        approver: data.approver || null,
        description: data.description || null,
        rootCause: data.rootCause || null,
        remediationPlan: data.remediationPlan || null,
        dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
      };
      const res = await apiRequest("POST", "/api/findings", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/findings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Finding created" });
      closeDialog();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: FindingFormValues }) => {
      const payload = {
        ...data,
        approver: data.approver || null,
        description: data.description || null,
        rootCause: data.rootCause || null,
        remediationPlan: data.remediationPlan || null,
        dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
      };
      const res = await apiRequest("PUT", `/api/findings/${id}`, payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/findings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Finding updated" });
      closeDialog();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/findings/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/findings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Finding deleted" });
      setDeleteConfirmOpen(false);
      setDeletingFinding(null);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  function openCreateDialog() {
    setEditingFinding(null);
    form.reset({
      title: "",
      source: "",
      severity: "",
      status: "New",
      businessUnitId: 0,
      owner: "",
      approver: null,
      description: null,
      rootCause: null,
      remediationPlan: null,
      dueDate: null,
    });
    setDialogOpen(true);
  }

  function openEditDialog(finding: Finding) {
    setEditingFinding(finding);
    form.reset({
      title: finding.title,
      source: finding.source,
      severity: finding.severity,
      status: finding.status,
      businessUnitId: finding.businessUnitId,
      owner: finding.owner,
      approver: finding.approver ?? null,
      description: finding.description ?? null,
      rootCause: finding.rootCause ?? null,
      remediationPlan: finding.remediationPlan ?? null,
      dueDate: finding.dueDate ? formatDateForInput(finding.dueDate) : null,
    });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingFinding(null);
  }

  function onSubmit(values: FindingFormValues) {
    if (editingFinding) {
      updateMutation.mutate({ id: editingFinding.id, data: values });
    } else {
      createMutation.mutate(values);
    }
  }

  const buMap = new Map((businessUnits ?? []).map((b) => [b.id, b]));
  const allFindings = findings ?? [];

  const totalFindings = allFindings.length;
  const openCount = allFindings.filter((f) => f.status !== "Closed" && f.status !== "Verified").length;
  const highCount = allFindings.filter((f) => f.severity === "High").length;
  const overdueCount = allFindings.filter(isOverdue).length;

  const filtered = allFindings.filter((f) => {
    if (severityFilter !== "all" && f.severity !== severityFilter) return false;
    if (statusFilter !== "all" && f.status !== statusFilter) return false;
    if (buFilter !== "all" && String(f.businessUnitId) !== buFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6" data-testid="findings-page">
      <div className="flex flex-wrap items-start justify-between gap-3" data-testid="findings-header">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">Findings & Remediation</h1>
          <p className="text-sm text-muted-foreground mt-1" data-testid="text-page-subtitle">Audit findings and remediation tracking</p>
        </div>
        <Button onClick={openCreateDialog} data-testid="button-add-finding">
          <Plus className="h-4 w-4 mr-1" />
          Add Finding
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-6" data-testid="findings-skeleton">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}
          </div>
          <Skeleton className="h-10 w-full" />
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="summary-cards">
            <Card data-testid="stat-total-findings">
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm text-muted-foreground" data-testid="stat-total-findings-label">Total Findings</p>
                    <p className="text-2xl font-bold mt-1" data-testid="stat-total-findings-value">{totalFindings}</p>
                  </div>
                  <div className="p-2 rounded-md bg-muted">
                    <ListChecks className="w-5 h-5 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card data-testid="stat-open">
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm text-muted-foreground" data-testid="stat-open-label">Open</p>
                    <p className="text-2xl font-bold mt-1" data-testid="stat-open-value">{openCount}</p>
                  </div>
                  <div className="p-2 rounded-md bg-muted">
                    <FileWarning className="w-5 h-5 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card data-testid="stat-high-severity">
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm text-muted-foreground" data-testid="stat-high-severity-label">High Severity</p>
                    <p className="text-2xl font-bold mt-1" data-testid="stat-high-severity-value">{highCount}</p>
                  </div>
                  <div className="p-2 rounded-md bg-red-100 dark:bg-red-900">
                    <AlertTriangle className="w-5 h-5 text-red-700 dark:text-red-300" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card data-testid="stat-overdue">
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm text-muted-foreground" data-testid="stat-overdue-label">Overdue</p>
                    <p className="text-2xl font-bold mt-1" data-testid="stat-overdue-value">{overdueCount}</p>
                  </div>
                  <div className="p-2 rounded-md bg-amber-100 dark:bg-amber-900">
                    <Clock className="w-5 h-5 text-amber-700 dark:text-amber-300" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-wrap items-center gap-3" data-testid="filter-bar">
            <Select value={severityFilter} onValueChange={setSeverityFilter} data-testid="select-severity">
              <SelectTrigger className="w-[160px]" data-testid="select-trigger-severity">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" data-testid="select-item-severity-all">All Severity</SelectItem>
                <SelectItem value="High" data-testid="select-item-severity-high">High</SelectItem>
                <SelectItem value="Medium" data-testid="select-item-severity-medium">Medium</SelectItem>
                <SelectItem value="Low" data-testid="select-item-severity-low">Low</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter} data-testid="select-status">
              <SelectTrigger className="w-[200px]" data-testid="select-trigger-status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" data-testid="select-item-status-all">All Statuses</SelectItem>
                <SelectItem value="New" data-testid="select-item-status-new">New</SelectItem>
                <SelectItem value="Triage" data-testid="select-item-status-triage">Triage</SelectItem>
                <SelectItem value="In Remediation" data-testid="select-item-status-remediation">In Remediation</SelectItem>
                <SelectItem value="Evidence Submitted" data-testid="select-item-status-evidence">Evidence Submitted</SelectItem>
                <SelectItem value="Verified" data-testid="select-item-status-verified">Verified</SelectItem>
                <SelectItem value="Closed" data-testid="select-item-status-closed">Closed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={buFilter} onValueChange={setBuFilter} data-testid="select-bu">
              <SelectTrigger className="w-[200px]" data-testid="select-trigger-bu">
                <SelectValue placeholder="Business Unit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" data-testid="select-item-bu-all">All Business Units</SelectItem>
                {(businessUnits ?? []).map((bu) => (
                  <SelectItem key={bu.id} value={String(bu.id)} data-testid={`select-item-bu-${bu.id}`}>{bu.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Card data-testid="findings-table-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" data-testid="th-expand"></TableHead>
                  <TableHead data-testid="th-title">Title</TableHead>
                  <TableHead data-testid="th-source">Source</TableHead>
                  <TableHead data-testid="th-severity">Severity</TableHead>
                  <TableHead data-testid="th-status">Status</TableHead>
                  <TableHead data-testid="th-bu">Business Unit</TableHead>
                  <TableHead data-testid="th-owner">Owner</TableHead>
                  <TableHead data-testid="th-due-date">Due Date</TableHead>
                  <TableHead className="text-right" data-testid="th-actions">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-32 text-center text-muted-foreground" data-testid="text-no-findings">
                      No findings found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((f) => {
                    const overdue = isOverdue(f);
                    const expanded = expandedId === f.id;
                    return (
                      <Fragment key={f.id}>
                        <TableRow
                          className={`cursor-pointer ${overdue ? "bg-red-50 dark:bg-red-950/30" : ""}`}
                          onClick={() => setExpandedId(expanded ? null : f.id)}
                          data-testid={`row-finding-${f.id}`}
                        >
                          <TableCell data-testid={`button-expand-${f.id}`}>
                            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </TableCell>
                          <TableCell className="font-medium" data-testid={`text-title-${f.id}`}>
                            {f.title}
                            {overdue && <span className="ml-2 text-xs text-red-600 dark:text-red-400 font-medium">OVERDUE</span>}
                          </TableCell>
                          <TableCell className="text-sm" data-testid={`text-source-${f.id}`}>{f.source}</TableCell>
                          <TableCell data-testid={`badge-severity-${f.id}`}>
                            <Badge variant={getSeverityVariant(f.severity)}>{f.severity}</Badge>
                          </TableCell>
                          <TableCell data-testid={`badge-status-${f.id}`}>
                            <Badge variant="outline">{f.status}</Badge>
                          </TableCell>
                          <TableCell className="text-sm" data-testid={`text-bu-${f.id}`}>
                            {buMap.get(f.businessUnitId)?.name ?? `BU #${f.businessUnitId}`}
                          </TableCell>
                          <TableCell className="text-sm" data-testid={`text-owner-${f.id}`}>{f.owner}</TableCell>
                          <TableCell className="text-sm text-muted-foreground" data-testid={`text-due-date-${f.id}`}>
                            {f.dueDate ? format(new Date(f.dueDate), "MMM d, yyyy") : "--"}
                          </TableCell>
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => openEditDialog(f)}
                                data-testid={`button-edit-finding-${f.id}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  setDeletingFinding(f);
                                  setDeleteConfirmOpen(true);
                                }}
                                data-testid={`button-delete-finding-${f.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        {expanded && (
                          <TableRow data-testid={`detail-panel-${f.id}`}>
                            <TableCell colSpan={9} className="bg-muted/30 p-6">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div className="space-y-3">
                                  <div>
                                    <p className="font-medium text-muted-foreground mb-1" data-testid={`label-description-${f.id}`}>Description</p>
                                    <p data-testid={`text-description-${f.id}`}>{f.description ?? "--"}</p>
                                  </div>
                                  <div>
                                    <p className="font-medium text-muted-foreground mb-1" data-testid={`label-root-cause-${f.id}`}>Root Cause</p>
                                    <p data-testid={`text-root-cause-${f.id}`}>{f.rootCause ?? "--"}</p>
                                  </div>
                                </div>
                                <div className="space-y-3">
                                  <div>
                                    <p className="font-medium text-muted-foreground mb-1" data-testid={`label-remediation-${f.id}`}>Remediation Plan</p>
                                    <p data-testid={`text-remediation-${f.id}`}>{f.remediationPlan ?? "--"}</p>
                                  </div>
                                  <div className="flex flex-wrap gap-4">
                                    {f.requirementId && (
                                      <div>
                                        <p className="font-medium text-muted-foreground mb-1">Related Requirement</p>
                                        <p data-testid={`text-related-req-${f.id}`}>REQ #{f.requirementId}</p>
                                      </div>
                                    )}
                                    {f.documentId && (
                                      <div>
                                        <p className="font-medium text-muted-foreground mb-1">Related Document</p>
                                        <p data-testid={`text-related-doc-${f.id}`}>Doc #{f.documentId}</p>
                                      </div>
                                    )}
                                    {f.approver && (
                                      <div>
                                        <p className="font-medium text-muted-foreground mb-1">Approver</p>
                                        <p data-testid={`text-approver-${f.id}`}>{f.approver}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Card>
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto" data-testid="dialog-finding">
          <DialogHeader>
            <DialogTitle data-testid="text-dialog-title">
              {editingFinding ? "Edit Finding" : "Add Finding"}
            </DialogTitle>
            <DialogDescription>
              {editingFinding ? "Update finding details." : "Create a new audit finding."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Finding title" {...field} data-testid="input-finding-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="source"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Source</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Internal Audit" {...field} data-testid="input-finding-source" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="owner"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Owner</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. John Smith" {...field} data-testid="input-finding-owner" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="severity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Severity</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-trigger-finding-severity">
                            <SelectValue placeholder="Select severity" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="High" data-testid="select-item-finding-severity-high">High</SelectItem>
                          <SelectItem value="Medium" data-testid="select-item-finding-severity-medium">Medium</SelectItem>
                          <SelectItem value="Low" data-testid="select-item-finding-severity-low">Low</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-trigger-finding-status">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="New" data-testid="select-item-finding-status-new">New</SelectItem>
                          <SelectItem value="Triage" data-testid="select-item-finding-status-triage">Triage</SelectItem>
                          <SelectItem value="In Remediation" data-testid="select-item-finding-status-remediation">In Remediation</SelectItem>
                          <SelectItem value="Evidence Submitted" data-testid="select-item-finding-status-evidence">Evidence Submitted</SelectItem>
                          <SelectItem value="Verified" data-testid="select-item-finding-status-verified">Verified</SelectItem>
                          <SelectItem value="Closed" data-testid="select-item-finding-status-closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="businessUnitId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Unit</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ? String(field.value) : ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-trigger-finding-bu">
                            <SelectValue placeholder="Select business unit" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(businessUnits ?? []).map((bu) => (
                            <SelectItem key={bu.id} value={String(bu.id)} data-testid={`select-item-finding-bu-${bu.id}`}>
                              {bu.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due Date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value || null)}
                          data-testid="input-finding-due-date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="approver"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Approver</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Approver name (optional)"
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value || null)}
                        data-testid="input-finding-approver"
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
                        placeholder="Describe the finding"
                        className="resize-none"
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value || null)}
                        data-testid="input-finding-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="rootCause"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Root Cause</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Root cause analysis"
                        className="resize-none"
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value || null)}
                        data-testid="input-finding-root-cause"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="remediationPlan"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Remediation Plan</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Steps to remediate"
                        className="resize-none"
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value || null)}
                        data-testid="input-finding-remediation-plan"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeDialog} data-testid="button-cancel-finding">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-finding"
                >
                  {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent data-testid="dialog-delete-finding">
          <DialogHeader>
            <DialogTitle>Delete Finding</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingFinding?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)} data-testid="button-cancel-delete-finding">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingFinding && deleteMutation.mutate(deletingFinding.id)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete-finding"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
