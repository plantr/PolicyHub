import { useState } from "react";
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
import { format } from "date-fns";
import { Plus, Search, MoreHorizontal, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import type { Audit, BusinessUnit } from "@shared/schema";
import { insertAuditSchema } from "@shared/schema";

const auditFormSchema = insertAuditSchema.extend({
  title: z.string().min(1, "Title is required"),
  auditType: z.string().min(1, "Audit type is required"),
  status: z.string().min(1, "Status is required"),
  leadAuditor: z.string().min(1, "Lead auditor is required"),
  businessUnitId: z.coerce.number().nullable().default(null),
  scope: z.string().nullable().default(null),
  auditFirm: z.string().nullable().default(null),
  scheduledDate: z.string().nullable().default(null),
  startDate: z.string().nullable().default(null),
  endDate: z.string().nullable().default(null),
  reportDate: z.string().nullable().default(null),
  findingsCount: z.coerce.number().int().min(0).nullable().default(0),
  recommendations: z.string().nullable().default(null),
  overallRating: z.string().nullable().default(null),
});

type AuditFormValues = z.infer<typeof auditFormSchema>;

const AUDIT_TYPES = ["Internal", "External", "Regulatory", "Thematic", "Follow-up"];
const AUDIT_STATUSES = ["Planned", "In Progress", "Fieldwork Complete", "Draft Report", "Final Report", "Closed"];
const AUDIT_RATINGS = ["Satisfactory", "Needs Improvement", "Unsatisfactory", "N/A"];

function getStatusVariant(status: string) {
  switch (status) {
    case "Closed": return "secondary" as const;
    case "Final Report": return "default" as const;
    case "In Progress":
    case "Fieldwork Complete": return "default" as const;
    case "Draft Report": return "outline" as const;
    default: return "secondary" as const;
  }
}

function getRatingVariant(rating: string | null) {
  switch (rating) {
    case "Satisfactory": return "default" as const;
    case "Needs Improvement": return "outline" as const;
    case "Unsatisfactory": return "destructive" as const;
    default: return "secondary" as const;
  }
}

function formatDateForInput(date: string | Date | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  return d.toISOString().split("T")[0];
}

export default function Audits() {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAudit, setEditingAudit] = useState<Audit | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingAudit, setDeletingAudit] = useState<Audit | null>(null);
  const { toast } = useToast();

  const form = useForm<AuditFormValues>({
    resolver: zodResolver(auditFormSchema),
    defaultValues: {
      title: "",
      auditType: "",
      status: "Planned",
      leadAuditor: "",
      businessUnitId: null,
      scope: null,
      auditFirm: null,
      scheduledDate: null,
      startDate: null,
      endDate: null,
      reportDate: null,
      findingsCount: 0,
      recommendations: null,
      overallRating: null,
    },
  });

  const { data: auditsData, isLoading: auditsLoading } = useQuery<Audit[]>({
    queryKey: ["/api/audits"],
  });
  const { data: businessUnits } = useQuery<BusinessUnit[]>({
    queryKey: ["/api/business-units"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: AuditFormValues) => {
      const payload = {
        ...data,
        scheduledDate: data.scheduledDate ? new Date(data.scheduledDate).toISOString() : null,
        startDate: data.startDate ? new Date(data.startDate).toISOString() : null,
        endDate: data.endDate ? new Date(data.endDate).toISOString() : null,
        reportDate: data.reportDate ? new Date(data.reportDate).toISOString() : null,
      };
      const res = await apiRequest("POST", "/api/audits", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/audits"] });
      toast({ title: "Audit created" });
      closeDialog();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: AuditFormValues }) => {
      const payload = {
        ...data,
        scheduledDate: data.scheduledDate ? new Date(data.scheduledDate).toISOString() : null,
        startDate: data.startDate ? new Date(data.startDate).toISOString() : null,
        endDate: data.endDate ? new Date(data.endDate).toISOString() : null,
        reportDate: data.reportDate ? new Date(data.reportDate).toISOString() : null,
      };
      const res = await apiRequest("PUT", `/api/audits/${id}`, payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/audits"] });
      toast({ title: "Audit updated" });
      closeDialog();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/audits/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/audits"] });
      toast({ title: "Audit deleted" });
      setDeleteConfirmOpen(false);
      setDeletingAudit(null);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  function openCreateDialog() {
    setEditingAudit(null);
    form.reset({
      title: "",
      auditType: "",
      status: "Planned",
      leadAuditor: "",
      businessUnitId: null,
      scope: null,
      auditFirm: null,
      scheduledDate: null,
      startDate: null,
      endDate: null,
      reportDate: null,
      findingsCount: 0,
      recommendations: null,
      overallRating: null,
    });
    setDialogOpen(true);
  }

  function openEditDialog(audit: Audit) {
    setEditingAudit(audit);
    form.reset({
      title: audit.title,
      auditType: audit.auditType,
      status: audit.status,
      leadAuditor: audit.leadAuditor,
      businessUnitId: audit.businessUnitId,
      scope: audit.scope ?? null,
      auditFirm: audit.auditFirm ?? null,
      scheduledDate: formatDateForInput(audit.scheduledDate),
      startDate: formatDateForInput(audit.startDate),
      endDate: formatDateForInput(audit.endDate),
      reportDate: formatDateForInput(audit.reportDate),
      findingsCount: audit.findingsCount ?? 0,
      recommendations: audit.recommendations ?? null,
      overallRating: audit.overallRating ?? null,
    });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingAudit(null);
  }

  function onSubmit(values: AuditFormValues) {
    if (editingAudit) {
      updateMutation.mutate({ id: editingAudit.id, data: values });
    } else {
      createMutation.mutate(values);
    }
  }

  const hasActiveFilters = typeFilter !== "all" || statusFilter !== "all" || searchQuery !== "";

  function resetFilters() {
    setTypeFilter("all");
    setStatusFilter("all");
    setSearchQuery("");
    setCurrentPage(1);
  }

  const filtered = (auditsData ?? []).filter((a) => {
    if (typeFilter !== "all" && a.auditType !== typeFilter) return false;
    if (statusFilter !== "all" && a.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!a.title.toLowerCase().includes(q) && !a.leadAuditor.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const buMap = new Map((businessUnits ?? []).map((bu) => [bu.id, bu.name]));

  const totalResults = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / pageSize));
  const paginatedAudits = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const startItem = totalResults === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalResults);

  return (
    <div className="space-y-4" data-testid="audits-page">
      <div className="flex flex-wrap items-center gap-2" data-testid="audits-header">
        <h1 className="text-xl font-semibold tracking-tight" data-testid="text-page-title">Audits</h1>

        <div className="relative ml-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search"
            className="pl-9 w-[160px]"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            data-testid="input-search-audits"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="text-sm" data-testid="filter-type">
              Type <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => { setTypeFilter("all"); setCurrentPage(1); }}>All Types</DropdownMenuItem>
            {AUDIT_TYPES.map((t) => (
              <DropdownMenuItem key={t} onClick={() => { setTypeFilter(t); setCurrentPage(1); }}>{t}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="text-sm" data-testid="filter-status">
              Status <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => { setStatusFilter("all"); setCurrentPage(1); }}>All Statuses</DropdownMenuItem>
            {AUDIT_STATUSES.map((s) => (
              <DropdownMenuItem key={s} onClick={() => { setStatusFilter(s); setCurrentPage(1); }}>{s}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" className="text-sm text-muted-foreground" onClick={resetFilters} data-testid="button-reset-view">
            Reset view
          </Button>
        )}

        <div className="ml-auto">
          <Button onClick={openCreateDialog} data-testid="button-add-audit">
            <Plus className="h-4 w-4 mr-1" />
            Add Audit
          </Button>
        </div>
      </div>

      {auditsLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <>
          <div className="border rounded-md" data-testid="audits-table">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-medium text-muted-foreground" data-testid="th-title">Title</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground" data-testid="th-type">Type</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground" data-testid="th-status">Status</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground" data-testid="th-lead">Lead Auditor</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground" data-testid="th-bu">Business Unit</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground" data-testid="th-scheduled">Scheduled</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground" data-testid="th-rating">Rating</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground w-10" data-testid="th-actions" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedAudits.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-muted-foreground" data-testid="text-no-audits">
                      No audits found. Click "Add Audit" to create one.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedAudits.map((audit) => (
                    <TableRow
                      key={audit.id}
                      className="group"
                      data-testid={`row-audit-${audit.id}`}
                    >
                      <TableCell className="font-medium" data-testid={`text-title-${audit.id}`}>
                        {audit.title}
                      </TableCell>
                      <TableCell data-testid={`text-type-${audit.id}`}>
                        <Badge variant="outline" className="no-default-active-elevate">{audit.auditType}</Badge>
                      </TableCell>
                      <TableCell data-testid={`badge-status-${audit.id}`}>
                        <Badge variant={getStatusVariant(audit.status)} className="no-default-active-elevate">{audit.status}</Badge>
                      </TableCell>
                      <TableCell className="text-sm" data-testid={`text-lead-${audit.id}`}>
                        {audit.leadAuditor}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground" data-testid={`text-bu-${audit.id}`}>
                        {audit.businessUnitId ? buMap.get(audit.businessUnitId) ?? "\u2014" : "Group-wide"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground" data-testid={`text-scheduled-${audit.id}`}>
                        {audit.scheduledDate ? format(new Date(audit.scheduledDate), "dd MMM yyyy") : "\u2014"}
                      </TableCell>
                      <TableCell data-testid={`badge-rating-${audit.id}`}>
                        {audit.overallRating ? (
                          <Badge variant={getRatingVariant(audit.overallRating)} className="no-default-active-elevate">{audit.overallRating}</Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">{"\u2014"}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                              data-testid={`button-actions-${audit.id}`}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(audit)} data-testid={`button-edit-audit-${audit.id}`}>
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => { setDeletingAudit(audit); setDeleteConfirmOpen(true); }}
                              className="text-destructive"
                              data-testid={`button-delete-audit-${audit.id}`}
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground" data-testid="section-pagination">
            <span data-testid="text-pagination-info">
              {startItem} to {endItem} of {totalResults} results
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <span>Show per page</span>
              <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setCurrentPage(1); }}>
                <SelectTrigger className="w-[70px]" data-testid="select-page-size">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="200">200</SelectItem>
                  <SelectItem value="500">500</SelectItem>
                </SelectContent>
              </Select>
              <Button
                size="icon"
                variant="ghost"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                data-testid="button-prev-page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                data-testid="button-next-page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-audit">
          <DialogHeader>
            <DialogTitle data-testid="text-dialog-title">
              {editingAudit ? "Edit Audit" : "Add Audit"}
            </DialogTitle>
            <DialogDescription>
              {editingAudit ? "Update audit details." : "Create a new audit record."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl><Input placeholder="e.g. Annual AML Audit 2025" {...field} data-testid="input-audit-title" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="auditType" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Audit Type</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="select-audit-type"><SelectValue placeholder="Select type" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {AUDIT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="select-audit-status"><SelectValue placeholder="Select status" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {AUDIT_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="leadAuditor" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lead Auditor</FormLabel>
                    <FormControl><Input placeholder="e.g. John Smith" {...field} data-testid="input-audit-lead" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="auditFirm" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Audit Firm</FormLabel>
                    <FormControl><Input placeholder="e.g. Deloitte" {...field} value={field.value ?? ""} data-testid="input-audit-firm" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="businessUnitId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Business Unit (optional)</FormLabel>
                  <Select value={field.value?.toString() ?? "none"} onValueChange={(v) => field.onChange(v === "none" ? null : Number(v))}>
                    <FormControl>
                      <SelectTrigger data-testid="select-audit-bu"><SelectValue placeholder="Group-wide" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Group-wide</SelectItem>
                      {(businessUnits ?? []).filter(bu => bu.status === "Active").map((bu) => (
                        <SelectItem key={bu.id} value={bu.id.toString()}>{bu.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="scope" render={({ field }) => (
                <FormItem>
                  <FormLabel>Scope</FormLabel>
                  <FormControl><Textarea placeholder="Describe the scope of this audit..." {...field} value={field.value ?? ""} data-testid="input-audit-scope" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="scheduledDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Scheduled Date</FormLabel>
                    <FormControl><Input type="date" {...field} value={field.value ?? ""} data-testid="input-audit-scheduled" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="startDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl><Input type="date" {...field} value={field.value ?? ""} data-testid="input-audit-start" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="endDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <FormControl><Input type="date" {...field} value={field.value ?? ""} data-testid="input-audit-end" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="reportDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Report Date</FormLabel>
                    <FormControl><Input type="date" {...field} value={field.value ?? ""} data-testid="input-audit-report" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="findingsCount" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Findings Count</FormLabel>
                    <FormControl><Input type="number" {...field} value={field.value ?? 0} data-testid="input-audit-findings-count" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="overallRating" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Overall Rating</FormLabel>
                    <Select value={field.value ?? "none"} onValueChange={(v) => field.onChange(v === "none" ? null : v)}>
                      <FormControl>
                        <SelectTrigger data-testid="select-audit-rating"><SelectValue placeholder="Select rating" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Not Rated</SelectItem>
                        {AUDIT_RATINGS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="recommendations" render={({ field }) => (
                <FormItem>
                  <FormLabel>Recommendations</FormLabel>
                  <FormControl><Textarea placeholder="Key recommendations from the audit..." {...field} value={field.value ?? ""} data-testid="input-audit-recommendations" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeDialog} data-testid="button-cancel-audit">Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-audit">
                  {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent data-testid="dialog-delete-audit">
          <DialogHeader>
            <DialogTitle>Delete Audit</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingAudit?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)} data-testid="button-cancel-delete">Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deletingAudit && deleteMutation.mutate(deletingAudit.id)}
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
