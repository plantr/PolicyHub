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
  controlId: z.coerce.number().nullable().default(null),
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
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
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
      controlId: null,
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
        controlId: data.controlId || null,
        reviewDate: data.reviewDate || null,
      };
      return apiRequest("POST", "/api/risks", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/risks"] });
      queryClient.invalidateQueries({ queryKey: ["audit-log"] });
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
        controlId: data.controlId || null,
        reviewDate: data.reviewDate || null,
      };
      return apiRequest("PUT", `/api/risks/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/risks"] });
      queryClient.invalidateQueries({ queryKey: ["audit-log"] });
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
      queryClient.invalidateQueries({ queryKey: ["audit-log"] });
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
      controlId: null,
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
      controlId: r.controlId || null,
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

  const hasActiveFilters = statusFilter !== "all" || categoryFilter !== "all" || ratingFilter !== "all" || searchQuery.length > 0;

  function resetFilters() {
    setStatusFilter("all");
    setCategoryFilter("all");
    setRatingFilter("all");
    setSearchQuery("");
    setCurrentPage(1);
  }

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

  const totalResults = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / pageSize));
  const paginatedRisks = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const startItem = totalResults === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalResults);

  const buMap = Object.fromEntries((businessUnits || []).map(bu => [bu.id, bu.name]));

  if (risksLoading) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight" data-testid="text-page-title">Risk Register</h1>
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
    <div className="space-y-4" data-testid="page-risk-register">
      <div className="flex flex-wrap items-center gap-2" data-testid="section-filters">
        <h1 className="text-xl font-semibold tracking-tight" data-testid="text-page-title">Risk Register</h1>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search"
            className="pl-9 w-[160px]"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            data-testid="input-search-risks"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="text-sm" data-testid="filter-status">
              Status <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => { setStatusFilter("all"); setCurrentPage(1); }}>All</DropdownMenuItem>
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
            <DropdownMenuItem onClick={() => { setCategoryFilter("all"); setCurrentPage(1); }}>All</DropdownMenuItem>
            {categoryOptions.map(c => (
              <DropdownMenuItem key={c} onClick={() => { setCategoryFilter(c); setCurrentPage(1); }}>{c}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="text-sm" data-testid="filter-rating">
              Rating <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => { setRatingFilter("all"); setCurrentPage(1); }}>All</DropdownMenuItem>
            {RATINGS.map(r => (
              <DropdownMenuItem key={r} onClick={() => { setRatingFilter(r); setCurrentPage(1); }}>{r}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" className="text-sm text-muted-foreground" onClick={resetFilters} data-testid="button-reset-view">
            Reset view
          </Button>
        )}

        <div className="ml-auto">
          <Button variant="outline" size="sm" onClick={openCreateDialog} data-testid="button-add-risk">
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add risk
          </Button>
        </div>
      </div>

      <div className="border rounded-md" data-testid="section-risks-table">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs font-medium text-muted-foreground" data-testid="col-title">Title</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground" data-testid="col-category">Category</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground" data-testid="col-status">Status</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground" data-testid="col-owner">Owner</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground" data-testid="col-inherent">Inherent</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground" data-testid="col-residual">Residual</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground" data-testid="col-response">Response</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground" data-testid="col-created">Created</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground w-[50px]" data-testid="col-actions"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedRisks.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  No risks found
                </TableCell>
              </TableRow>
            )}
            {paginatedRisks.map(r => (
              <TableRow
                key={r.id}
                className="group"
                data-testid={`row-risk-${r.id}`}
              >
                <TableCell>
                  <span className="font-medium">{r.title}</span>
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
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        data-testid={`button-actions-risk-${r.id}`}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEditDialog(r)} data-testid={`button-edit-risk-${r.id}`}>
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { setDeletingRisk(r); setDeleteConfirmOpen(true); }} data-testid={`button-delete-risk-${r.id}`}>
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
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
              <SelectItem value="100">100</SelectItem>
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
                <FormField control={form.control} name="controlId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Control ID</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                        data-testid="input-risk-control-id"
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
