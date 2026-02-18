import { useState } from "react";
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
import { Plus, Pencil, Trash2, Search, ChevronDown, ChevronUp, ListChecks } from "lucide-react";
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
  const [statusFilter, setStatusFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
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
      queryClient.invalidateQueries({ queryKey: ["/api/audit-log"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/audit-log"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/audit-log"] });
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

  const filtered = (actions || []).filter(a => {
    if (statusFilter !== "all" && a.status !== statusFilter) return false;
    if (riskFilter !== "all" && String(a.riskId) !== riskFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      if (
        !a.title.toLowerCase().includes(term) &&
        !a.assignee.toLowerCase().includes(term) &&
        !(riskMap[a.riskId] || "").toLowerCase().includes(term)
      ) return false;
    }
    return true;
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Action Tracker</h1>
            <p className="text-muted-foreground mt-1">Track risk mitigation actions</p>
          </div>
        </div>
        <Card><CardContent className="pt-6"><Skeleton className="h-64" /></CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Action Tracker</h1>
          <p className="text-muted-foreground mt-1">Track and manage risk mitigation actions</p>
        </div>
        <Button onClick={openCreateDialog} data-testid="button-add-action">
          <Plus className="mr-2 h-4 w-4" /> Add Action
        </Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]" data-testid="select-status-filter">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={riskFilter} onValueChange={setRiskFilter}>
          <SelectTrigger className="w-[200px]" data-testid="select-risk-filter">
            <SelectValue placeholder="Risk" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Risks</SelectItem>
            {(risks || []).map(r => <SelectItem key={r.id} value={String(r.id)}>{r.title}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search actions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-search-actions"
          />
        </div>
      </div>

      <Card>
        <CardContent className="pt-6 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead>Assignee</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    <div className="flex flex-col items-center gap-2">
                      <ListChecks className="h-8 w-8" />
                      <span>No actions found</span>
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {filtered.map(action => {
                const isOverdue = action.dueDate && new Date(action.dueDate) < new Date() && action.status !== "Completed" && action.status !== "Closed";
                const expanded = expandedId === action.id;
                return (
                  <TableRow
                    key={action.id}
                    className={`cursor-pointer ${isOverdue ? "text-red-500 dark:text-red-400" : ""}`}
                    onClick={() => setExpandedId(expanded ? null : action.id)}
                    data-testid={`row-action-${action.id}`}
                  >
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {expanded ? <ChevronUp className="h-3 w-3 shrink-0" /> : <ChevronDown className="h-3 w-3 shrink-0" />}
                        <span className="font-medium">{action.title}</span>
                      </div>
                      {expanded && (
                        <div className="mt-2 space-y-2 text-sm text-muted-foreground">
                          {action.description && <p>{action.description}</p>}
                          {action.completedDate && <p><span className="font-medium">Completed:</span> {format(new Date(action.completedDate), "dd MMM yyyy")}</p>}
                          {action.notes && <p><span className="font-medium">Notes:</span> {action.notes}</p>}
                        </div>
                      )}
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
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => { e.stopPropagation(); openEditDialog(action); }}
                          data-testid={`button-edit-action-${action.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => { e.stopPropagation(); setDeletingAction(action); setDeleteConfirmOpen(true); }}
                          data-testid={`button-delete-action-${action.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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