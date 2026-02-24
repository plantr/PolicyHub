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
import type { Commitment, BusinessUnit } from "@shared/schema";
import { insertCommitmentSchema } from "@shared/schema";

const commitmentFormSchema = insertCommitmentSchema.extend({
  title: z.string().min(1, "Title is required"),
  source: z.string().min(1, "Source is required"),
  category: z.string().min(1, "Category is required"),
  owner: z.string().min(1, "Owner is required"),
  status: z.string().min(1, "Status is required"),
  priority: z.string().min(1, "Priority is required"),
  businessUnitId: z.coerce.number().nullable().default(null),
  sourceReference: z.string().nullable().default(null),
  description: z.string().nullable().default(null),
  evidenceNotes: z.string().nullable().default(null),
  dueDate: z.string().nullable().default(null),
});

type CommitmentFormValues = z.infer<typeof commitmentFormSchema>;

function getStatusVariant(status: string) {
  switch (status) {
    case "Open": return "default" as const;
    case "In Progress": return "default" as const;
    case "Completed": return "secondary" as const;
    case "Closed": return "secondary" as const;
    case "Overdue": return "destructive" as const;
    default: return "secondary" as const;
  }
}

function getPriorityVariant(priority: string) {
  switch (priority) {
    case "Critical": return "destructive" as const;
    case "High": return "destructive" as const;
    case "Medium": return "default" as const;
    case "Low": return "secondary" as const;
    default: return "secondary" as const;
  }
}

function formatDateForInput(date: string | Date | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  return d.toISOString().split("T")[0];
}

const CATEGORIES = ["Licence Condition", "Regulatory Requirement", "Undertaking", "Voluntary Commitment", "Remediation Action", "Other"];
const STATUSES = ["Open", "In Progress", "Completed", "Closed"];
const PRIORITIES = ["Critical", "High", "Medium", "Low"];

export default function Commitments() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCommitment, setEditingCommitment] = useState<Commitment | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingCommitment, setDeletingCommitment] = useState<Commitment | null>(null);
  const { toast } = useToast();

  const form = useForm<CommitmentFormValues>({
    resolver: zodResolver(commitmentFormSchema),
    defaultValues: {
      title: "",
      source: "",
      sourceReference: null,
      businessUnitId: null,
      category: "",
      description: null,
      status: "Open",
      owner: "",
      priority: "Medium",
      dueDate: null,
      evidenceNotes: null,
    },
  });

  const { data: commitmentsList, isLoading: commitmentsLoading } = useQuery<Commitment[]>({
    queryKey: ["/api/commitments"],
  });
  const { data: businessUnits } = useQuery<BusinessUnit[]>({
    queryKey: ["/api/business-units"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: CommitmentFormValues) => {
      const payload = {
        ...data,
        dueDate: data.dueDate || null,
        businessUnitId: data.businessUnitId || null,
      };
      return apiRequest("POST", "/api/commitments", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/commitments"] });
      queryClient.invalidateQueries({ queryKey: ["audit-log"] });
      toast({ title: "Commitment created" });
      setDialogOpen(false);
      form.reset();
    },
    onError: () => toast({ title: "Error creating commitment", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: CommitmentFormValues }) => {
      const payload = {
        ...data,
        dueDate: data.dueDate || null,
        businessUnitId: data.businessUnitId || null,
      };
      return apiRequest("PUT", `/api/commitments/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/commitments"] });
      queryClient.invalidateQueries({ queryKey: ["audit-log"] });
      toast({ title: "Commitment updated" });
      setDialogOpen(false);
      setEditingCommitment(null);
      form.reset();
    },
    onError: () => toast({ title: "Error updating commitment", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/commitments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/commitments"] });
      queryClient.invalidateQueries({ queryKey: ["audit-log"] });
      toast({ title: "Commitment deleted" });
      setDeleteConfirmOpen(false);
      setDeletingCommitment(null);
    },
    onError: () => toast({ title: "Error deleting commitment", variant: "destructive" }),
  });

  function openCreateDialog() {
    setEditingCommitment(null);
    form.reset({
      title: "",
      source: "",
      sourceReference: null,
      businessUnitId: null,
      category: "",
      description: null,
      status: "Open",
      owner: "",
      priority: "Medium",
      dueDate: null,
      evidenceNotes: null,
    });
    setDialogOpen(true);
  }

  function openEditDialog(c: Commitment) {
    setEditingCommitment(c);
    form.reset({
      title: c.title,
      source: c.source,
      sourceReference: c.sourceReference || null,
      businessUnitId: c.businessUnitId || null,
      category: c.category,
      description: c.description || null,
      status: c.status,
      owner: c.owner,
      priority: c.priority,
      dueDate: formatDateForInput(c.dueDate),
      evidenceNotes: c.evidenceNotes || null,
    });
    setDialogOpen(true);
  }

  function onSubmit(data: CommitmentFormValues) {
    if (editingCommitment) {
      updateMutation.mutate({ id: editingCommitment.id, data });
    } else {
      createMutation.mutate(data);
    }
  }

  const hasActiveFilters = statusFilter !== "all" || categoryFilter !== "all" || priorityFilter !== "all" || searchQuery !== "";

  function resetFilters() {
    setStatusFilter("all");
    setCategoryFilter("all");
    setPriorityFilter("all");
    setSearchQuery("");
    setCurrentPage(1);
  }

  const filtered = (commitmentsList || []).filter(c => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!c.title.toLowerCase().includes(q) && !c.owner.toLowerCase().includes(q) && !c.source.toLowerCase().includes(q)) return false;
    }
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (categoryFilter !== "all" && c.category !== categoryFilter) return false;
    if (priorityFilter !== "all" && c.priority !== priorityFilter) return false;
    return true;
  });

  const totalResults = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / pageSize));
  const paginatedItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const startItem = totalResults === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalResults);

  const buMap = Object.fromEntries((businessUnits || []).map(bu => [bu.id, bu.name]));

  if (commitmentsLoading) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          <h1 className="text-xl font-semibold tracking-tight" data-testid="text-page-title">Commitments</h1>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2" data-testid="section-filters">
        <h1 className="text-xl font-semibold tracking-tight" data-testid="text-page-title">Commitments</h1>

        <div className="relative ml-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search"
            className="pl-9 w-[160px]"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            data-testid="input-search-commitments"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="text-sm" data-testid="filter-status">
              Status <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => { setStatusFilter("all"); setCurrentPage(1); }}>All Statuses</DropdownMenuItem>
            {STATUSES.map(s => (
              <DropdownMenuItem key={s} onClick={() => { setStatusFilter(s); setCurrentPage(1); }}>{s}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="text-sm" data-testid="filter-category">
              Category <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => { setCategoryFilter("all"); setCurrentPage(1); }}>All Categories</DropdownMenuItem>
            {CATEGORIES.map(c => (
              <DropdownMenuItem key={c} onClick={() => { setCategoryFilter(c); setCurrentPage(1); }}>{c}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="text-sm" data-testid="filter-priority">
              Priority <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => { setPriorityFilter("all"); setCurrentPage(1); }}>All Priorities</DropdownMenuItem>
            {PRIORITIES.map(p => (
              <DropdownMenuItem key={p} onClick={() => { setPriorityFilter(p); setCurrentPage(1); }}>{p}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" className="text-sm text-muted-foreground" onClick={resetFilters} data-testid="button-reset-view">
            Reset view
          </Button>
        )}

        <div className="ml-auto">
          <Button onClick={openCreateDialog} data-testid="button-add-commitment">
            <Plus className="mr-2 h-4 w-4" /> Add Commitment
          </Button>
        </div>
      </div>

      <div className="border rounded-md" data-testid="section-commitments-table">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs font-medium text-muted-foreground">Title</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">Category</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">Priority</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">Status</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">Owner</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">Entity</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">Due Date</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedItems.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  No commitments found
                </TableCell>
              </TableRow>
            )}
            {paginatedItems.map(c => {
              const isOverdue = c.dueDate && new Date(c.dueDate) < new Date() && c.status !== "Completed" && c.status !== "Closed";
              return (
                <TableRow
                  key={c.id}
                  className="group"
                  data-testid={`row-commitment-${c.id}`}
                >
                  <TableCell>
                    <span className="font-medium">{c.title}</span>
                  </TableCell>
                  <TableCell><Badge variant="outline">{c.category}</Badge></TableCell>
                  <TableCell><Badge variant={getPriorityVariant(c.priority)}>{c.priority}</Badge></TableCell>
                  <TableCell>
                    <Badge variant={isOverdue ? "destructive" : getStatusVariant(c.status)}>
                      {isOverdue ? "Overdue" : c.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{c.owner}</TableCell>
                  <TableCell>{c.businessUnitId ? buMap[c.businessUnitId] || "-" : "All"}</TableCell>
                  <TableCell>{c.dueDate ? format(new Date(c.dueDate), "dd MMM yyyy") : "-"}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="opacity-0 group-hover:opacity-100"
                          onClick={(e) => e.stopPropagation()}
                          data-testid={`button-actions-commitment-${c.id}`}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(c)} data-testid={`button-edit-commitment-${c.id}`}>
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => { setDeletingCommitment(c); setDeleteConfirmOpen(true); }}
                          className="text-destructive"
                          data-testid={`button-delete-commitment-${c.id}`}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground" data-testid="section-pagination">
        <span data-testid="text-pagination-info">
          {totalResults === 0 ? "0 results" : `${startItem} to ${endItem} of ${totalResults} results`}
        </span>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
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
          </div>
          <div className="flex items-center gap-1">
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
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCommitment ? "Edit Commitment" : "Add Commitment"}</DialogTitle>
            <DialogDescription>
              {editingCommitment ? "Update the commitment details." : "Create a new regulatory commitment or undertaking."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl><Input {...field} data-testid="input-commitment-title" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="source" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Source</FormLabel>
                    <FormControl><Input {...field} placeholder="e.g. FCA, GFSC" data-testid="input-commitment-source" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="sourceReference" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reference</FormLabel>
                    <FormControl><Input {...field} value={field.value || ""} placeholder="e.g. Condition 4.2" data-testid="input-commitment-reference" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="category" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-commitment-category">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="priority" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-commitment-priority">
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-commitment-status">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="owner" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Owner</FormLabel>
                    <FormControl><Input {...field} data-testid="input-commitment-owner" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="businessUnitId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Unit</FormLabel>
                    <Select onValueChange={(v) => field.onChange(v === "none" ? null : Number(v))} value={field.value ? String(field.value) : "none"}>
                      <FormControl>
                        <SelectTrigger data-testid="select-commitment-bu">
                          <SelectValue placeholder="All entities" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">All Entities</SelectItem>
                        {(businessUnits || []).map(bu => <SelectItem key={bu.id} value={String(bu.id)}>{bu.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="dueDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date</FormLabel>
                    <FormControl><Input type="date" {...field} value={field.value || ""} data-testid="input-commitment-due-date" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl><Textarea {...field} value={field.value || ""} data-testid="input-commitment-description" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="evidenceNotes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Evidence Notes</FormLabel>
                  <FormControl><Textarea {...field} value={field.value || ""} data-testid="input-commitment-evidence" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-submit-commitment">
                  {editingCommitment ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Commitment</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingCommitment?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)} data-testid="button-cancel-delete">Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deletingCommitment && deleteMutation.mutate(deletingCommitment.id)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
