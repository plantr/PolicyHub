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
import { Plus, Search, ChevronDown, ChevronLeft, ChevronRight, ListChecks, MoreHorizontal } from "lucide-react";
import type { RiskAction, Risk } from "@shared/schema";
import { insertRiskActionSchema } from "@shared/schema";

const actionFormSchema = insertRiskActionSchema.extend({
  title: z.string().min(1, "Title is required"),
  riskId: z.coerce.number().min(1, "Risk is required"),
  assignee: z.string().min(1, "Assignee is required"),
  status: z.string().min(1, "Status is required"),
  priority: z.string().min(1, "Priority is required"),
  description: z.string().nullable().default(null),
  dueDate: z.string().nullable().default(null),
  notes: z.string().nullable().default(null),
});

type ActionFormValues = z.infer<typeof actionFormSchema>;

const STATUSES = ["Open", "In Progress", "Completed", "Closed"];
const PRIORITIES = ["Critical", "High", "Medium", "Low"];

function getStatusVariant(status: string) {
  switch (status) {
    case "Open": return "default" as const;
    case "In Progress": return "default" as const;
    case "Completed": return "secondary" as const;
    case "Closed": return "secondary" as const;
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

export default function RiskActions() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAction, setEditingAction] = useState<RiskAction | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingAction, setDeletingAction] = useState<RiskAction | null>(null);
  const { toast } = useToast();

  const form = useForm<ActionFormValues>({
    resolver: zodResolver(actionFormSchema),
    defaultValues: {
      title: "",
      riskId: 0,
      assignee: "",
      status: "Open",
      priority: "Medium",
      description: null,
      dueDate: null,
      notes: null,
    },
  });

  const { data: actions, isLoading } = useQuery<RiskAction[]>({
    queryKey: ["/api/risk-actions"],
  });

  const { data: risks } = useQuery<Risk[]>({
    queryKey: ["/api/risks"],
  });

  const riskMap = Object.fromEntries((risks || []).map(r => [r.id, r.title]));

  const createMutation = useMutation({
    mutationFn: async (data: ActionFormValues) => {
      const payload = {
        ...data,
        dueDate: data.dueDate || null,
      };
      return apiRequest("POST", "/api/risk-actions", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/risk-actions"] });
      queryClient.invalidateQueries({ queryKey: ["audit-log"] });
      toast({ title: "Action created" });
      setDialogOpen(false);
      form.reset();
    },
    onError: () => toast({ title: "Error creating action", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: ActionFormValues }) => {
      const payload = {
        ...data,
        dueDate: data.dueDate || null,
      };
      return apiRequest("PUT", `/api/risk-actions/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/risk-actions"] });
      queryClient.invalidateQueries({ queryKey: ["audit-log"] });
      toast({ title: "Action updated" });
      setDialogOpen(false);
      setEditingAction(null);
      form.reset();
    },
    onError: () => toast({ title: "Error updating action", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/risk-actions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/risk-actions"] });
      queryClient.invalidateQueries({ queryKey: ["audit-log"] });
      toast({ title: "Action deleted" });
      setDeleteConfirmOpen(false);
      setDeletingAction(null);
    },
    onError: () => toast({ title: "Error deleting action", variant: "destructive" }),
  });

  function openCreateDialog() {
    setEditingAction(null);
    form.reset({
      title: "",
      riskId: 0,
      assignee: "",
      status: "Open",
      priority: "Medium",
      description: null,
      dueDate: null,
      notes: null,
    });
    setDialogOpen(true);
  }

  function openEditDialog(a: RiskAction) {
    setEditingAction(a);
    form.reset({
      title: a.title,
      riskId: a.riskId,
      assignee: a.assignee,
      status: a.status,
      priority: a.priority,
      description: a.description || null,
      dueDate: formatDateForInput(a.dueDate),
      notes: a.notes || null,
    });
    setDialogOpen(true);
  }

  function onSubmit(data: ActionFormValues) {
    if (editingAction) {
      updateMutation.mutate({ id: editingAction.id, data });
    } else {
      createMutation.mutate(data);
    }
  }

  const hasActiveFilters = statusFilter !== "all" || priorityFilter !== "all" || riskFilter !== "all" || searchQuery.length > 0;

  function resetFilters() {
    setStatusFilter("all");
    setPriorityFilter("all");
    setRiskFilter("all");
    setSearchQuery("");
    setCurrentPage(1);
  }

  const filtered = (actions || []).filter(a => {
    if (statusFilter !== "all" && a.status !== statusFilter) return false;
    if (priorityFilter !== "all" && a.priority !== priorityFilter) return false;
    if (riskFilter !== "all" && String(a.riskId) !== riskFilter) return false;
    if (searchQuery) {
      const term = searchQuery.toLowerCase();
      if (
        !a.title.toLowerCase().includes(term) &&
        !a.assignee.toLowerCase().includes(term) &&
        !(riskMap[a.riskId] || "").toLowerCase().includes(term)
      ) return false;
    }
    return true;
  });

  const totalResults = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / pageSize));
  const paginatedActions = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const startItem = totalResults === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalResults);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight" data-testid="text-page-title">Action Tracker</h1>
        </div>
        <div className="space-y-3" data-testid="loading-skeleton">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="page-risk-actions">
      <div className="flex flex-wrap items-center gap-2" data-testid="section-filters">
        <h1 className="text-xl font-semibold tracking-tight" data-testid="text-page-title">Action Tracker</h1>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search"
            className="pl-9 w-[160px]"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            data-testid="input-search-actions"
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

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="text-sm" data-testid="filter-risk">
              Risk <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => { setRiskFilter("all"); setCurrentPage(1); }}>All Risks</DropdownMenuItem>
            {(risks || []).map(r => (
              <DropdownMenuItem key={r.id} onClick={() => { setRiskFilter(String(r.id)); setCurrentPage(1); }}>{r.title}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" className="text-sm text-muted-foreground" onClick={resetFilters} data-testid="button-reset-view">
            Reset view
          </Button>
        )}

        <div className="ml-auto">
          <Button variant="outline" size="sm" onClick={openCreateDialog} data-testid="button-add-action">
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Action
          </Button>
        </div>
      </div>

      <div className="border rounded-md" data-testid="section-actions-table">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs font-medium text-muted-foreground" data-testid="col-title">Title</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground" data-testid="col-risk">Risk</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground" data-testid="col-assignee">Assignee</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground" data-testid="col-status">Status</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground" data-testid="col-priority">Priority</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground" data-testid="col-due-date">Due Date</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground w-[50px]" data-testid="col-actions"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedActions.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  <div className="flex flex-col items-center gap-2">
                    <ListChecks className="h-8 w-8" />
                    <span>No actions found</span>
                  </div>
                </TableCell>
              </TableRow>
            )}
            {paginatedActions.map(action => {
              const isOverdue = action.dueDate && new Date(action.dueDate) < new Date() && action.status !== "Completed" && action.status !== "Closed";
              return (
                <TableRow
                  key={action.id}
                  className={`group ${isOverdue ? "text-red-500 dark:text-red-400" : ""}`}
                  data-testid={`row-action-${action.id}`}
                >
                  <TableCell>
                    <span className="font-medium">{action.title}</span>
                  </TableCell>
                  <TableCell>{riskMap[action.riskId] || `Risk #${action.riskId}`}</TableCell>
                  <TableCell>{action.assignee}</TableCell>
                  <TableCell>
                    <Badge variant={isOverdue ? "destructive" : getStatusVariant(action.status)}>
                      {isOverdue ? "Overdue" : action.status}
                    </Badge>
                  </TableCell>
                  <TableCell><Badge variant={getPriorityVariant(action.priority)}>{action.priority}</Badge></TableCell>
                  <TableCell>{action.dueDate ? format(new Date(action.dueDate), "dd MMM yyyy") : "-"}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          data-testid={`button-row-actions-${action.id}`}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => openEditDialog(action)}
                          data-testid={`button-edit-action-${action.id}`}
                        >
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => { setDeletingAction(action); setDeleteConfirmOpen(true); }}
                          className="text-destructive"
                          data-testid={`button-delete-action-${action.id}`}
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
          {startItem} to {endItem} of {totalResults} results
        </span>
        <div className="flex items-center gap-2">
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
          <Button variant="outline" size="icon" disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)} data-testid="button-prev-page">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)} data-testid="button-next-page">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAction ? "Edit Action" : "Add Action"}</DialogTitle>
            <DialogDescription>
              {editingAction ? "Update the action details." : "Create a new risk mitigation action."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl><Input {...field} data-testid="input-action-title" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="riskId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Risk</FormLabel>
                    <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value ? String(field.value) : ""}>
                      <FormControl>
                        <SelectTrigger data-testid="select-action-risk">
                          <SelectValue placeholder="Select risk" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(risks || []).map(r => <SelectItem key={r.id} value={String(r.id)}>{r.title}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="assignee" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assignee</FormLabel>
                    <FormControl><Input {...field} data-testid="input-action-assignee" /></FormControl>
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
                        <SelectTrigger data-testid="select-action-status">
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
                <FormField control={form.control} name="priority" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-action-priority">
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
              <FormField control={form.control} name="dueDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Due Date</FormLabel>
                  <FormControl><Input type="date" {...field} value={field.value || ""} data-testid="input-action-due-date" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl><Textarea {...field} value={field.value || ""} data-testid="input-action-description" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl><Textarea {...field} value={field.value || ""} data-testid="input-action-notes" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-submit-action">
                  {editingAction ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Action</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingAction?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)} data-testid="button-cancel-delete">Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deletingAction && deleteMutation.mutate(deletingAction.id)}
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
