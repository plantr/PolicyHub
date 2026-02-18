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
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, Search } from "lucide-react";
import type { Risk, BusinessUnit, RiskCategory } from "@shared/schema";
import { insertRiskSchema } from "@shared/schema";

const riskFormSchema = insertRiskSchema.extend({
  title: z.string().min(1, "Title is required"),
  category: z.string().min(1, "Category is required"),
  status: z.string().min(1, "Status is required"),
  owner: z.string().min(1, "Owner is required"),
  mitigationStrategy: z.string().min(1, "Risk response is required"),
  description: z.string().nullable().default(null),
  businessUnitId: z.coerce.number().nullable().default(null),
  requirementId: z.coerce.number().nullable().default(null),
  inherentLikelihood: z.coerce.number().min(1).max(5).default(3),
  inherentImpact: z.coerce.number().min(1).max(5).default(3),
  inherentScore: z.coerce.number().optional().default(9),
  inherentRating: z.string().optional().default("Medium"),
  residualLikelihood: z.coerce.number().min(1).max(5).default(3),
  residualImpact: z.coerce.number().min(1).max(5).default(3),
  residualScore: z.coerce.number().optional().default(9),
  residualRating: z.string().optional().default("Medium"),
  controlDescription: z.string().nullable().default(null),
  riskAppetite: z.string().nullable().default(null),
  reviewDate: z.string().nullable().default(null),
});

type RiskFormValues = z.infer<typeof riskFormSchema>;

function getRatingVariant(rating: string) {
  switch (rating) {
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

const STATUSES = ["Identified", "Assessing", "Mitigating", "Accepted", "Closed"];
const RISK_RESPONSES = ["Accept", "Avoid", "Mitigate", "Transfer"];
const RATINGS = ["Critical", "High", "Medium", "Low"];

export default function RiskRegister() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRisk, setEditingRisk] = useState<Risk | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingRisk, setDeletingRisk] = useState<Risk | null>(null);
  const { toast } = useToast();

  const form = useForm<RiskFormValues>({
    resolver: zodResolver(riskFormSchema),
    defaultValues: {
      title: "",
      description: null,
      category: "",
      status: "Identified",
      owner: "",
      businessUnitId: null,
      requirementId: null,
      inherentLikelihood: 3,
      inherentImpact: 3,
      inherentScore: 9,
      inherentRating: "Medium",
      residualLikelihood: 3,
      residualImpact: 3,
      residualScore: 9,
      residualRating: "Medium",
      mitigationStrategy: "",
      controlDescription: null,
      riskAppetite: null,
      reviewDate: null,
    },
  });

  const { data: risksList, isLoading: risksLoading } = useQuery<Risk[]>({
    queryKey: ["/api/risks"],
  });
  const { data: businessUnits } = useQuery<BusinessUnit[]>({
    queryKey: ["/api/business-units"],
  });
  const { data: riskCategories } = useQuery<RiskCategory[]>({
    queryKey: ["/api/risk-categories"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: RiskFormValues) => {
      const payload = {
        ...data,
        businessUnitId: data.businessUnitId || null,
        requirementId: data.requirementId || null,
        reviewDate: data.reviewDate || null,
      };
      return apiRequest("POST", "/api/risks", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/risks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/audit-log"] });
      toast({ title: "Risk created" });
      setDialogOpen(false);
      form.reset();
    },
    onError: () => toast({ title: "Error creating risk", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: RiskFormValues }) => {
      const payload = {
        ...data,
        businessUnitId: data.businessUnitId || null,
        requirementId: data.requirementId || null,
        reviewDate: data.reviewDate || null,
      };
      return apiRequest("PUT", `/api/risks/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/risks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/audit-log"] });
      toast({ title: "Risk updated" });
      setDialogOpen(false);
      setEditingRisk(null);
      form.reset();
    },
    onError: () => toast({ title: "Error updating risk", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/risks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/risks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/audit-log"] });
      toast({ title: "Risk deleted" });
      setDeleteConfirmOpen(false);
      setDeletingRisk(null);
    },
    onError: () => toast({ title: "Error deleting risk", variant: "destructive" }),
  });

  function openCreateDialog() {
    setEditingRisk(null);
    form.reset({
      title: "",
      description: null,
      category: "",
      status: "Identified",
      owner: "",
      businessUnitId: null,
      requirementId: null,
      inherentLikelihood: 3,
      inherentImpact: 3,
      inherentScore: 9,
      inherentRating: "Medium",
      residualLikelihood: 3,
      residualImpact: 3,
      residualScore: 9,
      residualRating: "Medium",
      mitigationStrategy: "",
      controlDescription: null,
      riskAppetite: null,
      reviewDate: null,
    });
    setDialogOpen(true);
  }

  function openEditDialog(r: Risk) {
    setEditingRisk(r);
    form.reset({
      title: r.title,
      description: r.description || null,
      category: r.category,
      status: r.status,
      owner: r.owner,
      businessUnitId: r.businessUnitId || null,
      requirementId: r.requirementId || null,
      inherentLikelihood: r.inherentLikelihood,
      inherentImpact: r.inherentImpact,
      inherentScore: r.inherentScore,
      inherentRating: r.inherentRating,
      residualLikelihood: r.residualLikelihood,
      residualImpact: r.residualImpact,
      residualScore: r.residualScore,
      residualRating: r.residualRating,
      mitigationStrategy: r.mitigationStrategy || "",
      controlDescription: r.controlDescription || null,
      riskAppetite: r.riskAppetite || null,
      reviewDate: formatDateForInput(r.reviewDate),
    });
    setDialogOpen(true);
  }

  function onSubmit(data: RiskFormValues) {
    if (editingRisk) {
      updateMutation.mutate({ id: editingRisk.id, data });
    } else {
      createMutation.mutate(data);
    }
  }

  const categoryOptions = (riskCategories || []).map(rc => rc.label);

  const filtered = (risksList || []).filter(r => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (categoryFilter !== "all" && r.category !== categoryFilter) return false;
    if (ratingFilter !== "all" && r.residualRating !== ratingFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!r.title.toLowerCase().includes(q) && !r.owner.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const buMap = Object.fromEntries((businessUnits || []).map(bu => [bu.id, bu.name]));

  if (risksLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Risk Register</h1>
            <p className="text-muted-foreground mt-1">Identify, assess, and manage organisational risks</p>
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
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Risk Register</h1>
          <p className="text-muted-foreground mt-1">Identify, assess, and manage organisational risks</p>
        </div>
        <Button onClick={openCreateDialog} data-testid="button-add-risk">
          <Plus className="mr-2 h-4 w-4" /> Add Risk
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
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-category-filter">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categoryOptions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={ratingFilter} onValueChange={setRatingFilter}>
          <SelectTrigger className="w-[150px]" data-testid="select-rating-filter">
            <SelectValue placeholder="Rating" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Ratings</SelectItem>
            {RATINGS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search risks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 w-[200px]"
            data-testid="input-search-risks"
          />
        </div>
      </div>

      <Card>
        <CardContent className="pt-6 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Inherent</TableHead>
                <TableHead>Residual</TableHead>
                <TableHead>Response</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    No risks found
                  </TableCell>
                </TableRow>
              )}
              {filtered.map(r => {
                const expanded = expandedId === r.id;
                return (
                  <TableRow
                    key={r.id}
                    className="cursor-pointer"
                    onClick={() => setExpandedId(expanded ? null : r.id)}
                    data-testid={`row-risk-${r.id}`}
                  >
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {expanded ? <ChevronUp className="h-3 w-3 shrink-0" /> : <ChevronDown className="h-3 w-3 shrink-0" />}
                        <span className="font-medium">{r.title}</span>
                      </div>
                      {expanded && (
                        <div className="mt-2 space-y-2 text-sm text-muted-foreground">
                          {r.description && <p>{r.description}</p>}
                          {r.businessUnitId && <p><span className="font-medium">Business Unit:</span> {buMap[r.businessUnitId] || "-"}</p>}
                          {r.controlDescription && <p><span className="font-medium">Controls:</span> {r.controlDescription}</p>}
                          {r.reviewDate && <p><span className="font-medium">Review Date:</span> {format(new Date(r.reviewDate), "dd MMM yyyy")}</p>}
                          {r.riskAppetite && <p><span className="font-medium">Notes:</span> {r.riskAppetite}</p>}
                        </div>
                      )}
                    </TableCell>
                    <TableCell><Badge variant="outline">{r.category}</Badge></TableCell>
                    <TableCell><Badge variant="secondary">{r.status}</Badge></TableCell>
                    <TableCell>{r.owner}</TableCell>
                    <TableCell>
                      <Badge variant={getRatingVariant(r.inherentRating)}>
                        {r.inherentRating} ({r.inherentScore})
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getRatingVariant(r.residualRating)}>
                        {r.residualRating} ({r.residualScore})
                      </Badge>
                    </TableCell>
                    <TableCell>{r.mitigationStrategy || "-"}</TableCell>
                    <TableCell>{r.createdAt ? format(new Date(r.createdAt), "dd MMM yyyy") : "-"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => { e.stopPropagation(); openEditDialog(r); }}
                          data-testid={`button-edit-risk-${r.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => { e.stopPropagation(); setDeletingRisk(r); setDeleteConfirmOpen(true); }}
                          data-testid={`button-delete-risk-${r.id}`}
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
            <DialogTitle>{editingRisk ? "Edit Risk" : "Add Risk"}</DialogTitle>
            <DialogDescription>
              {editingRisk ? "Update the risk details." : "Create a new risk entry."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl><Input {...field} data-testid="input-risk-title" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="category" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-risk-category">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categoryOptions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-risk-status">
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
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="owner" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Owner</FormLabel>
                    <FormControl><Input {...field} data-testid="input-risk-owner" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="mitigationStrategy" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Risk Response</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger data-testid="select-risk-response">
                          <SelectValue placeholder="Select response" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {RISK_RESPONSES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
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
                        <SelectTrigger data-testid="select-risk-bu">
                          <SelectValue placeholder="Select business unit" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {(businessUnits || []).map(bu => <SelectItem key={bu.id} value={String(bu.id)}>{bu.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="requirementId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Requirement ID</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                        data-testid="input-risk-requirement-id"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Inherent Risk</p>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="inherentLikelihood" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Likelihood (1-5)</FormLabel>
                      <Select onValueChange={(v) => field.onChange(Number(v))} value={String(field.value)}>
                        <FormControl>
                          <SelectTrigger data-testid="select-risk-inherent-likelihood">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {[1, 2, 3, 4, 5].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="inherentImpact" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Impact (1-5)</FormLabel>
                      <Select onValueChange={(v) => field.onChange(Number(v))} value={String(field.value)}>
                        <FormControl>
                          <SelectTrigger data-testid="select-risk-inherent-impact">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {[1, 2, 3, 4, 5].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Residual Risk</p>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="residualLikelihood" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Likelihood (1-5)</FormLabel>
                      <Select onValueChange={(v) => field.onChange(Number(v))} value={String(field.value)}>
                        <FormControl>
                          <SelectTrigger data-testid="select-risk-residual-likelihood">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {[1, 2, 3, 4, 5].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="residualImpact" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Impact (1-5)</FormLabel>
                      <Select onValueChange={(v) => field.onChange(Number(v))} value={String(field.value)}>
                        <FormControl>
                          <SelectTrigger data-testid="select-risk-residual-impact">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {[1, 2, 3, 4, 5].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>
              <FormField control={form.control} name="reviewDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Review Date</FormLabel>
                  <FormControl><Input type="date" {...field} value={field.value || ""} data-testid="input-risk-review-date" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl><Textarea {...field} value={field.value || ""} data-testid="input-risk-description" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="controlDescription" render={({ field }) => (
                <FormItem>
                  <FormLabel>Controls</FormLabel>
                  <FormControl><Textarea {...field} value={field.value || ""} data-testid="input-risk-controls" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="riskAppetite" render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl><Textarea {...field} value={field.value || ""} data-testid="input-risk-notes" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-submit-risk">
                  {editingRisk ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Risk</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingRisk?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)} data-testid="button-cancel-delete">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingRisk && deleteMutation.mutate(deletingRisk.id)}
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
