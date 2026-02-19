import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
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
import { Plus, Search, MoreHorizontal, ChevronLeft, ChevronRight, ChevronDown, CheckCircle2, FileText, Settings2 } from "lucide-react";
import { useLocation } from "wouter";
import type { Requirement, RegulatorySource, RequirementMapping, Document as PolicyDocument } from "@shared/schema";
import { insertRequirementSchema } from "@shared/schema";

const reqFormSchema = insertRequirementSchema.extend({
  sourceId: z.coerce.number().min(1, "Source is required"),
  code: z.string().min(1, "Code is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  category: z.string().min(1, "Category is required"),
  article: z.string().nullable().default(null),
});

type ReqFormValues = z.infer<typeof reqFormSchema>;

function DonutChart({ segments, size = 120, strokeWidth = 20, centerLabel, centerSub }: {
  segments: { value: number; className: string }[];
  size?: number;
  strokeWidth?: number;
  centerLabel: string;
  centerSub: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  let accumulated = 0;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted"
        />
        {total > 0 && segments.map((seg, i) => {
          const pct = seg.value / total;
          const dashLen = pct * circumference;
          const offset = (accumulated / total) * circumference;
          accumulated += seg.value;
          return (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              strokeDasharray={`${dashLen} ${circumference - dashLen}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
              className={seg.className}
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold">{centerLabel}</span>
        <span className="text-xs text-muted-foreground">{centerSub}</span>
      </div>
    </div>
  );
}

export { DonutChart };

function ProgressBar({ value, max, className }: { value: number; max: number; className?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all ${className}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-muted-foreground whitespace-nowrap">{pct}%</span>
    </div>
  );
}

export default function Requirements() {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [frameworkFilter, setFrameworkFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReq, setEditingReq] = useState<Requirement | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingReq, setDeletingReq] = useState<Requirement | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const { toast } = useToast();

  const form = useForm<ReqFormValues>({
    resolver: zodResolver(reqFormSchema),
    defaultValues: {
      sourceId: 0,
      code: "",
      title: "",
      description: "",
      category: "",
      article: null,
    },
  });

  const { data: requirements, isLoading: reqLoading } = useQuery<Requirement[]>({
    queryKey: ["requirements"],
    queryFn: async () => {
      const { data, error } = await supabase.from("requirements").select("*");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: sources, isLoading: srcLoading } = useQuery<RegulatorySource[]>({
    queryKey: ["regulatory-sources"],
    queryFn: async () => {
      const { data, error } = await supabase.from("regulatory_sources").select("*");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: allMappings } = useQuery<RequirementMapping[]>({
    queryKey: ["requirement-mappings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("requirement_mappings").select("*");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: allDocuments } = useQuery<PolicyDocument[]>({
    queryKey: ["documents"],
    queryFn: async () => {
      const { data, error } = await supabase.from("documents").select("*");
      if (error) throw error;
      return data ?? [];
    },
  });

  const isLoading = reqLoading || srcLoading;

  const sourceMap = useMemo(
    () => new Map((sources ?? []).map((s) => [s.id, s])),
    [sources]
  );

  const docMap = useMemo(
    () => new Map((allDocuments ?? []).map((d) => [d.id, d])),
    [allDocuments]
  );

  const categories = useMemo(
    () => Array.from(new Set((requirements ?? []).map((r) => r.category))).sort(),
    [requirements]
  );

  const mappingsByReq = useMemo(() => {
    const lookup = new Map<number, RequirementMapping[]>();
    for (const m of allMappings ?? []) {
      const list = lookup.get(m.requirementId) || [];
      list.push(m);
      lookup.set(m.requirementId, list);
    }
    return lookup;
  }, [allMappings]);

  function getBestStatus(reqId: number): string {
    const maps = mappingsByReq.get(reqId);
    if (!maps || maps.length === 0) return "Not Covered";
    if (maps.some((m) => m.coverageStatus === "Covered")) return "Covered";
    if (maps.some((m) => m.coverageStatus === "Partially Covered")) return "Partially Covered";
    return "Not Covered";
  }

  const stats = useMemo(() => {
    const reqs = requirements ?? [];
    const total = reqs.length;
    let coveredCount = 0;
    let partialCount = 0;
    let notCoveredCount = 0;
    let withDocsCount = 0;
    const uniqueDocIds = new Set<number>();

    for (const req of reqs) {
      const status = getBestStatus(req.id);
      if (status === "Covered") coveredCount++;
      else if (status === "Partially Covered") partialCount++;
      else notCoveredCount++;

      const maps = mappingsByReq.get(req.id) || [];
      if (maps.length > 0) withDocsCount++;
      for (const m of maps) {
        if (m.documentId) uniqueDocIds.add(m.documentId);
      }
    }

    const passingCount = coveredCount + partialCount;
    const passingPct = total > 0 ? Math.round((passingCount / total) * 100) : 0;
    const docsCovering = uniqueDocIds.size;
    const totalDocs = (allDocuments ?? []).length;

    return {
      total,
      coveredCount,
      partialCount,
      notCoveredCount,
      passingCount,
      passingPct,
      withDocsCount,
      docsCovering,
      totalDocs,
    };
  }, [requirements, allMappings, allDocuments, mappingsByReq]);

  const owners = useMemo(() => {
    const ownerSet = new Set<string>();
    for (const req of requirements ?? []) {
      const maps = mappingsByReq.get(req.id) || [];
      for (const m of maps) {
        if (m.documentId) {
          const doc = docMap.get(m.documentId);
          if (doc?.owner) ownerSet.add(doc.owner);
        }
      }
    }
    return Array.from(ownerSet).sort();
  }, [requirements, mappingsByReq, docMap]);

  const hasActiveFilters = frameworkFilter !== "all" || categoryFilter !== "all" || statusFilter !== "all" || ownerFilter !== "all" || searchQuery.length > 0;

  function resetFilters() {
    setFrameworkFilter("all");
    setCategoryFilter("all");
    setStatusFilter("all");
    setOwnerFilter("all");
    setSearchQuery("");
    setCurrentPage(1);
  }

  const filtered = useMemo(() => {
    return (requirements ?? []).filter((req) => {
      if (frameworkFilter !== "all" && String(req.sourceId) !== frameworkFilter) return false;
      if (categoryFilter !== "all" && req.category !== categoryFilter) return false;
      if (statusFilter !== "all") {
        const status = getBestStatus(req.id);
        if (statusFilter === "covered" && status !== "Covered") return false;
        if (statusFilter === "partial" && status !== "Partially Covered") return false;
        if (statusFilter === "not_covered" && status !== "Not Covered") return false;
      }
      if (ownerFilter !== "all") {
        const maps = mappingsByReq.get(req.id) || [];
        const hasOwner = maps.some((m) => {
          if (!m.documentId) return false;
          const doc = docMap.get(m.documentId);
          return doc?.owner === ownerFilter;
        });
        if (!hasOwner) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!req.title.toLowerCase().includes(q) && !req.code.toLowerCase().includes(q) && !(req.description && req.description.toLowerCase().includes(q))) return false;
      }
      return true;
    });
  }, [requirements, frameworkFilter, categoryFilter, statusFilter, ownerFilter, searchQuery, mappingsByReq, docMap]);

  const totalResults = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / pageSize));
  const paginatedControls = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const startItem = totalResults === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalResults);

  const createMutation = useMutation({
    mutationFn: async (data: ReqFormValues) => {
      const res = await apiRequest("POST", "/api/requirements", {
        sourceId: data.sourceId,
        code: data.code,
        title: data.title,
        description: data.description,
        category: data.category,
        article: data.article || null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requirements"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      toast({ title: "Control created" });
      closeDialog();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: ReqFormValues }) => {
      const res = await apiRequest("PUT", `/api/requirements/${id}`, {
        sourceId: data.sourceId,
        code: data.code,
        title: data.title,
        description: data.description,
        category: data.category,
        article: data.article || null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requirements"] });
      toast({ title: "Control updated" });
      closeDialog();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/requirements/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requirements"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      toast({ title: "Control deleted" });
      setDeleteConfirmOpen(false);
      setDeletingReq(null);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  function openCreateDialog() {
    setEditingReq(null);
    form.reset({
      sourceId: 0,
      code: "",
      title: "",
      description: "",
      category: "",
      article: null,
    });
    setDialogOpen(true);
  }

  function openEditDialog(req: Requirement) {
    setEditingReq(req);
    form.reset({
      sourceId: req.sourceId,
      code: req.code,
      title: req.title,
      description: req.description,
      category: req.category,
      article: req.article ?? null,
    });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingReq(null);
  }

  function onSubmit(values: ReqFormValues) {
    if (editingReq) {
      updateMutation.mutate({ id: editingReq.id, data: values });
    } else {
      createMutation.mutate(values);
    }
  }

  return (
    <div className="space-y-4" data-testid="controls-page">
      <div className="flex flex-wrap items-center justify-between gap-3" data-testid="controls-header">
        <h1 className="text-xl font-semibold tracking-tight" data-testid="text-page-title">Controls</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={openCreateDialog} data-testid="button-add-control">
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add control
          </Button>
        </div>
      </div>

      {!isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="summary-cards">
          <Card data-testid="card-assignment">
            <CardContent className="pt-6">
              <h3 className="text-sm font-semibold mb-4" data-testid="text-assignment-title">Assignment</h3>
              <div className="flex items-center gap-6">
                <DonutChart
                  size={120}
                  strokeWidth={20}
                  centerLabel={`${stats.total > 0 ? Math.round(((stats.coveredCount + stats.partialCount) / stats.total) * 100) : 0}%`}
                  centerSub="Assigned"
                  segments={[
                    { value: stats.coveredCount, className: "text-purple-500 dark:text-purple-400" },
                    { value: stats.partialCount, className: "text-amber-500 dark:text-amber-400" },
                    { value: stats.notCoveredCount, className: "text-muted" },
                  ]}
                />
                <div className="space-y-2 text-sm" data-testid="assignment-legend">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-sm bg-muted" />
                    <span className="text-muted-foreground">Not Covered</span>
                    <span className="ml-auto font-medium">{stats.notCoveredCount}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-sm bg-purple-500 dark:bg-purple-400" />
                    <span className="text-muted-foreground">Covered</span>
                    <span className="ml-auto font-medium">{stats.coveredCount}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-sm bg-amber-500 dark:bg-amber-400" />
                    <span className="text-muted-foreground">Partial</span>
                    <span className="ml-auto font-medium">{stats.partialCount}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-controls-summary">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-sm font-semibold" data-testid="text-controls-title">Controls</h3>
              </div>
              <div className="flex items-start gap-6">
                <div className="space-y-2 min-w-[140px]">
                  <p className="text-3xl font-bold" data-testid="text-passing-pct">{stats.passingPct}%</p>
                  <p className="text-xs text-muted-foreground">Of controls have coverage</p>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-green-500 dark:bg-green-400 transition-all"
                      style={{ width: `${stats.passingPct}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{stats.passingCount} controls</span>
                    <span>{stats.total} total</span>
                  </div>
                </div>
                <div className="flex-1 space-y-4 pt-1">
                  <div data-testid="metric-mappings">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Settings2 className="h-3 w-3" />
                        <span>Mappings</span>
                      </div>
                      <span className="text-xs font-medium">{stats.withDocsCount}/{stats.total}</span>
                    </div>
                    <ProgressBar
                      value={stats.withDocsCount}
                      max={stats.total}
                      className="bg-green-500 dark:bg-green-400"
                    />
                  </div>
                  <div data-testid="metric-documents">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <FileText className="h-3 w-3" />
                        <span>Documents</span>
                      </div>
                      <span className="text-xs font-medium">{stats.docsCovering}/{stats.totalDocs}</span>
                    </div>
                    <ProgressBar
                      value={stats.docsCovering}
                      max={stats.totalDocs}
                      className="bg-purple-500 dark:bg-purple-400"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2" data-testid="controls-filter-bar">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search controls"
            className="pl-9 w-[180px]"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            data-testid="input-search-controls"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="text-sm" data-testid="filter-framework">
              Framework <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => { setFrameworkFilter("all"); setCurrentPage(1); }}>All Frameworks</DropdownMenuItem>
            {(sources ?? []).map((s) => (
              <DropdownMenuItem key={s.id} onClick={() => { setFrameworkFilter(String(s.id)); setCurrentPage(1); }}>{s.shortName}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="text-sm" data-testid="filter-owner">
              Owner <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => { setOwnerFilter("all"); setCurrentPage(1); }}>All Owners</DropdownMenuItem>
            {owners.map((o) => (
              <DropdownMenuItem key={o} onClick={() => { setOwnerFilter(o); setCurrentPage(1); }}>{o}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="text-sm" data-testid="filter-category">
              Domain <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => { setCategoryFilter("all"); setCurrentPage(1); }}>All Domains</DropdownMenuItem>
            {categories.map((c) => (
              <DropdownMenuItem key={c} onClick={() => { setCategoryFilter(c); setCurrentPage(1); }}>{c}</DropdownMenuItem>
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
            <DropdownMenuItem onClick={() => { setStatusFilter("covered"); setCurrentPage(1); }}>Covered</DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setStatusFilter("partial"); setCurrentPage(1); }}>Partially Covered</DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setStatusFilter("not_covered"); setCurrentPage(1); }}>Not Covered</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" className="text-sm text-muted-foreground" onClick={resetFilters} data-testid="button-reset-view">
            Reset view
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3" data-testid="loading-skeleton">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : (
        <>
          <div className="border rounded-md" data-testid="section-controls-table">
            <Table data-testid="controls-table">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-medium text-muted-foreground w-[120px]" data-testid="th-id">ID</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground" data-testid="th-control">Control</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground w-[180px]" data-testid="th-owner">Owner</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground w-[180px]" data-testid="th-frameworks">Frameworks</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground w-[100px]" data-testid="th-docs">Docs</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground w-[50px]" data-testid="th-actions"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedControls.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground" data-testid="text-no-controls">
                      No controls found.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedControls.map((req) => {
                    const source = sourceMap.get(req.sourceId);
                    const maps = mappingsByReq.get(req.id) || [];
                    const bestStatus = getBestStatus(req.id);
                    const ownerDoc = maps.length > 0 && maps[0].documentId
                      ? docMap.get(maps[0].documentId)
                      : null;
                    const ownerName = ownerDoc?.owner ?? "--";
                    const ownerInitials = ownerName !== "--"
                      ? ownerName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
                      : "";
                    const frameworkLabel = source
                      ? `${source.shortName} · ${req.code}`
                      : req.code;
                    const docsLinked = new Set(maps.filter((m) => m.documentId).map((m) => m.documentId)).size;
                    const coveredDocs = maps.filter((m) => m.coverageStatus === "Covered" || m.coverageStatus === "Partially Covered").length;
                    return (
                      <TableRow
                        key={req.id}
                        className="group cursor-pointer hover-elevate"
                        onClick={() => navigate(`/controls/${req.id}`)}
                        data-testid={`row-control-${req.id}`}
                      >
                        <TableCell className="font-mono text-xs text-muted-foreground align-top pt-4" data-testid={`text-id-${req.id}`}>
                          {req.code}
                        </TableCell>
                        <TableCell className="align-top pt-4" data-testid={`text-control-${req.id}`}>
                          <div>
                            <span className="text-sm font-medium">{req.title}</span>
                            {req.description && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 max-w-lg">{req.description}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="align-top pt-4" data-testid={`text-owner-${req.id}`}>
                          {ownerName !== "--" ? (
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                                <span className="text-[10px] font-medium text-muted-foreground">{ownerInitials}</span>
                              </div>
                              <span className="text-sm truncate">{ownerName}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">--</span>
                          )}
                        </TableCell>
                        <TableCell className="align-top pt-4" data-testid={`text-framework-${req.id}`}>
                          <span className="text-xs text-muted-foreground">{frameworkLabel}</span>
                        </TableCell>
                        <TableCell className="align-top pt-4" data-testid={`text-docs-${req.id}`}>
                          {docsLinked > 0 ? (
                            <div className="flex items-center gap-1.5">
                              <CheckCircle2 className={`h-4 w-4 ${bestStatus === "Covered" ? "text-green-500 dark:text-green-400" : bestStatus === "Partially Covered" ? "text-amber-500 dark:text-amber-400" : "text-muted-foreground"}`} />
                              <span className="text-sm font-medium">{coveredDocs}/{docsLinked}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">--</span>
                          )}
                        </TableCell>
                        <TableCell className="align-top pt-4" data-testid={`text-actions-${req.id}`}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => e.stopPropagation()}
                                data-testid={`button-actions-${req.id}`}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/controls/${req.id}`); }}>
                                View details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEditDialog(req); }}>
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={(e) => { e.stopPropagation(); setDeletingReq(req); setDeleteConfirmOpen(true); }}
                              >
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
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
                variant="outline"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                data-testid="button-prev-page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="outline"
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
        <DialogContent className="sm:max-w-[500px]" data-testid="dialog-control">
          <DialogHeader>
            <DialogTitle data-testid="text-dialog-title">
              {editingReq ? "Edit Control" : "Add Control"}
            </DialogTitle>
            <DialogDescription>
              {editingReq ? "Update control details." : "Create a new control."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
              <FormField
                control={form.control}
                name="sourceId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Framework</FormLabel>
                    <Select
                      value={field.value ? String(field.value) : ""}
                      onValueChange={(val) => field.onChange(Number(val))}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-trigger-sourceId">
                          <SelectValue placeholder="Select a framework" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(sources ?? []).map((s) => (
                          <SelectItem key={s.id} value={String(s.id)} data-testid={`select-item-sourceId-${s.id}`}>
                            {s.shortName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Code</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. FCA-1.1" {...field} data-testid="input-code" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Domain</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Governance" {...field} data-testid="input-category" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Control title" {...field} data-testid="input-title" />
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
                      <Textarea placeholder="Control description" {...field} data-testid="input-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="article"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Article (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Article 5" {...field} value={field.value ?? ""} data-testid="input-article" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={closeDialog} data-testid="button-cancel">
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-submit">
                  {editingReq
                    ? updateMutation.isPending ? "Saving..." : "Save changes"
                    : createMutation.isPending ? "Creating..." : "Create control"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-[400px]" data-testid="dialog-delete-confirm">
          <DialogHeader>
            <DialogTitle>Delete Control</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingReq?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setDeleteConfirmOpen(false)} data-testid="button-cancel-delete">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingReq && deleteMutation.mutate(deletingReq.id)}
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
