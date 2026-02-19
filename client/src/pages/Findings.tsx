import { Fragment, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Plus, Search, MoreHorizontal } from "lucide-react";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [buFilter, setBuFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
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
    queryKey: ["findings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("findings").select("*");
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: businessUnits, isLoading: buLoading } = useQuery<BusinessUnit[]>({
    queryKey: ["business-units"],
    queryFn: async () => {
      const { data, error } = await supabase.from("business_units").select("*");
      if (error) throw error;
      return data ?? [];
    },
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
      queryClient.invalidateQueries({ queryKey: ["findings"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
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
      queryClient.invalidateQueries({ queryKey: ["findings"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
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
      queryClient.invalidateQueries({ queryKey: ["findings"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
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

  const hasActiveFilters = severityFilter !== "all" || statusFilter !== "all" || buFilter !== "all" || searchQuery !== "";

  function resetFilters() {
    setSeverityFilter("all");
    setStatusFilter("all");
    setBuFilter("all");
    setSearchQuery("");
    setCurrentPage(1);
  }

  const filtered = allFindings.filter((f) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!f.title.toLowerCase().includes(q)) return false;
    }
    if (severityFilter !== "all" && f.severity !== severityFilter) return false;
    if (statusFilter !== "all" && f.status !== statusFilter) return false;
    if (buFilter !== "all" && String(f.businessUnitId) !== buFilter) return false;
    return true;
  });

  const totalResults = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / pageSize));
  const paginatedFindings = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const startItem = totalResults === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalResults);

  return (
    <div className="space-y-4" data-testid="findings-page">
      <div className="flex flex-wrap items-center gap-2" data-testid="section-filters">
        <h1 className="text-xl font-semibold tracking-tight" data-testid="text-page-title">Findings & Remediation</h1>

        <div className="relative ml-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search"
            className="pl-9 w-[160px]"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            data-testid="input-search-findings"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="text-sm" data-testid="filter-severity">
              Severity <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => { setSeverityFilter("all"); setCurrentPage(1); }} data-testid="filter-severity-all">All</DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setSeverityFilter("High"); setCurrentPage(1); }} data-testid="filter-severity-high">High</DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setSeverityFilter("Medium"); setCurrentPage(1); }} data-testid="filter-severity-medium">Medium</DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setSeverityFilter("Low"); setCurrentPage(1); }} data-testid="filter-severity-low">Low</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="text-sm" data-testid="filter-status">
              Status <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => { setStatusFilter("all"); setCurrentPage(1); }} data-testid="filter-status-all">All</DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setStatusFilter("New"); setCurrentPage(1); }} data-testid="filter-status-new">New</DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setStatusFilter("Triage"); setCurrentPage(1); }} data-testid="filter-status-triage">Triage</DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setStatusFilter("In Remediation"); setCurrentPage(1); }} data-testid="filter-status-remediation">In Remediation</DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setStatusFilter("Evidence Submitted"); setCurrentPage(1); }} data-testid="filter-status-evidence">Evidence Submitted</DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setStatusFilter("Verified"); setCurrentPage(1); }} data-testid="filter-status-verified">Verified</DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setStatusFilter("Closed"); setCurrentPage(1); }} data-testid="filter-status-closed">Closed</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="text-sm" data-testid="filter-bu">
              Business Unit <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => { setBuFilter("all"); setCurrentPage(1); }} data-testid="filter-bu-all">All</DropdownMenuItem>
            {(businessUnits ?? []).map((bu) => (
              <DropdownMenuItem key={bu.id} onClick={() => { setBuFilter(String(bu.id)); setCurrentPage(1); }} data-testid={`filter-bu-${bu.id}`}>{bu.name}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" className="text-sm text-muted-foreground" onClick={resetFilters} data-testid="button-reset-view">
            Reset view
          </Button>
        )}

        <div className="ml-auto">
          <Button variant="outline" size="sm" onClick={openCreateDialog} data-testid="button-add-finding">
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Finding
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3" data-testid="findings-skeleton">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : (
        <>
          <div className="border rounded-md" data-testid="findings-table-wrapper">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-8 text-xs font-medium text-muted-foreground" data-testid="th-expand"></TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground" data-testid="th-title">Title</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground" data-testid="th-source">Source</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground" data-testid="th-severity">Severity</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground" data-testid="th-status">Status</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground" data-testid="th-bu">Business Unit</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground" data-testid="th-owner">Owner</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground" data-testid="th-due-date">Due Date</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground" data-testid="th-actions"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedFindings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-32 text-center text-muted-foreground" data-testid="text-no-findings">
                      No findings found.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedFindings.map((f) => {
                    const overdue = isOverdue(f);
                    const expanded = expandedId === f.id;
                    return (
                      <Fragment key={f.id}>
                        <TableRow
                          className={`group cursor-pointer ${overdue ? "bg-red-50 dark:bg-red-950/30" : ""}`}
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
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" data-testid={`button-actions-${f.id}`}>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openEditDialog(f)} data-testid={`menu-edit-${f.id}`}>Edit</DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => { setDeletingFinding(f); setDeleteConfirmOpen(true); }}
                                  data-testid={`menu-delete-${f.id}`}
                                >
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
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
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground" data-testid="section-pagination">
            <span data-testid="text-results-count">
              {totalResults === 0 ? "0 results" : `${startItem} to ${endItem} of ${totalResults} results`}
            </span>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span>Show per page</span>
                <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setCurrentPage(1); }}>
                  <SelectTrigger className="w-[65px] h-8" data-testid="select-page-size">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  data-testid="button-prev-page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  data-testid="button-next-page"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
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
