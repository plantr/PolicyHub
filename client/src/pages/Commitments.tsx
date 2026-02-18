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
import { Plus, Pencil, Trash2, Target, Clock, CheckCircle, ChevronDown, ChevronUp } from "lucide-react";
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
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);
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
      queryClient.invalidateQueries({ queryKey: ["/api/audit-log"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/audit-log"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/audit-log"] });
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

  const filtered = (commitmentsList || []).filter(c => {
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (categoryFilter !== "all" && c.category !== categoryFilter) return false;
    if (priorityFilter !== "all" && c.priority !== priorityFilter) return false;
    return true;
  });

  const buMap = Object.fromEntries((businessUnits || []).map(bu => [bu.id, bu.name]));

  if (commitmentsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Commitments</h1>
            <p className="text-muted-foreground mt-1">Regulatory conditions and undertakings</p>
          </div>
        </div>
        <Card><CardContent className="pt-6"><Skeleton className="h-64" /></CardContent></Card>
      </div>
    );
  }

  const openCount = (commitmentsList || []).filter(c => c.status === "Open" || c.status === "In Progress").length;
  const overdueCount = (commitmentsList || []).filter(c => c.dueDate && new Date(c.dueDate) < new Date() && c.status !== "Completed" && c.status !== "Closed").length;
  const completedCount = (commitmentsList || []).filter(c => c.status === "Completed" || c.status === "Closed").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Commitments</h1>
          <p className="text-muted-foreground mt-1">Track regulatory conditions, undertakings, and remediation actions</p>
        </div>
        <Button onClick={openCreateDialog} data-testid="button-add-commitment">
          <Plus className="mr-2 h-4 w-4" /> Add Commitment
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Target className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="text-2xl font-bold" data-testid="text-stat-open">{openCount}</div>
              <p className="text-xs text-muted-foreground">Open</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Clock className="h-5 w-5 text-orange-500 dark:text-orange-400" />
            <div>
              <div className="text-2xl font-bold" data-testid="text-stat-overdue">{overdueCount}</div>
              <p className="text-xs text-muted-foreground">Overdue</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            <div>
              <div className="text-2xl font-bold" data-testid="text-stat-completed">{completedCount}</div>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
          </CardContent>
        </Card>
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
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-category-filter">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[140px]" data-testid="select-priority-filter">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            {PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="pt-6 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No commitments found
                  </TableCell>
                </TableRow>
              )}
              {filtered.map(c => {
                const isOverdue = c.dueDate && new Date(c.dueDate) < new Date() && c.status !== "Completed" && c.status !== "Closed";
                const expanded = expandedId === c.id;
                return (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer"
                    onClick={() => setExpandedId(expanded ? null : c.id)}
                    data-testid={`row-commitment-${c.id}`}
                  >
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {expanded ? <ChevronUp className="h-3 w-3 shrink-0" /> : <ChevronDown className="h-3 w-3 shrink-0" />}
                        <span className="font-medium">{c.title}</span>
                      </div>
                      {expanded && (
                        <div className="mt-2 space-y-2 text-sm text-muted-foreground">
                          {c.description && <p>{c.description}</p>}
                          <p><span className="font-medium">Source:</span> {c.source} {c.sourceReference && `(${c.sourceReference})`}</p>
                          {c.evidenceNotes && <p><span className="font-medium">Evidence:</span> {c.evidenceNotes}</p>}
                          {c.completedDate && <p><span className="font-medium">Completed:</span> {format(new Date(c.completedDate), "dd MMM yyyy")}</p>}
                        </div>
                      )}
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
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => { e.stopPropagation(); openEditDialog(c); }}
                          data-testid={`button-edit-commitment-${c.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => { e.stopPropagation(); setDeletingCommitment(c); setDeleteConfirmOpen(true); }}
                          data-testid={`button-delete-commitment-${c.id}`}
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
