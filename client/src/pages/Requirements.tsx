import { useState, useMemo, useEffect } from "react";
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
import { Plus, Search, MoreHorizontal, ChevronLeft, ChevronRight, ChevronDown, CheckCircle2, FileText, Settings2, ArrowUpDown, ArrowUp, ArrowDown, Sparkles, Loader2, X, Ban } from "lucide-react";
import { useLocation } from "wouter";
import type { Control, RegulatorySource, ControlMapping, Document as PolicyDocument } from "@shared/schema";
import { insertControlSchema } from "@shared/schema";
import { useAiJob, useCancelAiJob, persistJobId, getPersistedJobId, clearPersistedJobId } from "@/hooks/use-ai-job";

const reqFormSchema = insertControlSchema.extend({
  sourceId: z.coerce.number().min(1, "Source is required"),
  code: z.string().min(1, "Code is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  category: z.string().min(1, "Category is required"),
  evidenceStatus: z.string().nullable().default(null),
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
      <svg width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted"
        />
        {total > 0 && segments.filter((s) => s.value > 0).map((seg, i) => {
          const pct = seg.value / total;
          const dashLen = pct * circumference;
          const offset = accumulated;
          accumulated += seg.value;
          const startAngle = (offset / total) * 360 - 90;
          const cx = size / 2;
          const cy = size / 2;
          const rad1 = (startAngle * Math.PI) / 180;
          const rad2 = ((startAngle + (pct * 360)) * Math.PI) / 180;
          const x1 = cx + radius * Math.cos(rad1);
          const y1 = cy + radius * Math.sin(rad1);
          const x2 = cx + radius * Math.cos(rad2);
          const y2 = cy + radius * Math.sin(rad2);
          const largeArc = pct > 0.5 ? 1 : 0;
          return (
            <path
              key={i}
              d={`M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth}
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
  const [editingReq, setEditingReq] = useState<Control | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingReq, setDeletingReq] = useState<Control | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [sortColumn, setSortColumn] = useState<string>("match");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [coverageDialogOpen, setCoverageDialogOpen] = useState(false);
  const [bulkCoverageJobId, setBulkCoverageJobId] = useState<string | null>(null);
  const [showNotApplicable, setShowNotApplicable] = useState(false);
  const { toast } = useToast();

  const form = useForm<ReqFormValues>({
    resolver: zodResolver(reqFormSchema),
    defaultValues: {
      sourceId: 0,
      code: "",
      title: "",
      description: "",
      category: "",
      evidenceStatus: null,
    },
  });

  const { data: requirements, isLoading: reqLoading } = useQuery<Control[]>({
    queryKey: ["/api/controls"],
  });

  const { data: sources, isLoading: srcLoading } = useQuery<RegulatorySource[]>({
    queryKey: ["/api/regulatory-sources"],
  });

  const { data: allMappings } = useQuery<ControlMapping[]>({
    queryKey: ["/api/control-mappings"],
  });

  const { data: allDocuments } = useQuery<PolicyDocument[]>({
    queryKey: ["/api/documents"],
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
    const lookup = new Map<number, ControlMapping[]>();
    for (const m of allMappings ?? []) {
      const list = lookup.get(m.controlId) || [];
      list.push(m);
      lookup.set(m.controlId, list);
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

  const naCount = useMemo(() => {
    return (requirements ?? []).filter((r) => r.applicable === false).length;
  }, [requirements]);

  const stats = useMemo(() => {
    const reqs = (requirements ?? []).filter((r) => r.applicable !== false);
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

  const hasActiveFilters = frameworkFilter !== "all" || categoryFilter !== "all" || statusFilter !== "all" || ownerFilter !== "all" || searchQuery.length > 0 || showNotApplicable;

  function resetFilters() {
    setFrameworkFilter("all");
    setCategoryFilter("all");
    setStatusFilter("all");
    setOwnerFilter("all");
    setSearchQuery("");
    setShowNotApplicable(false);
    setCurrentPage(1);
  }

  function toggleSort(col: string) {
    if (sortColumn === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(col);
      setSortDir(col === "match" ? "desc" : "asc");
    }
    setCurrentPage(1);
  }

  function SortIcon({ col }: { col: string }) {
    if (sortColumn !== col) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-30" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
  }

  const filtered = useMemo(() => {
    const result = (requirements ?? []).filter((req) => {
      if (!showNotApplicable && req.applicable === false) return false;
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

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortColumn) {
        case "framework": {
          const sa = sourceMap.get(a.sourceId)?.shortName ?? "";
          const sb = sourceMap.get(b.sourceId)?.shortName ?? "";
          cmp = sa.localeCompare(sb);
          break;
        }
        case "title":
          cmp = a.title.localeCompare(b.title);
          break;
        case "id":
          cmp = a.code.localeCompare(b.code);
          break;
        case "match": {
          const ma = a.combinedAiScore ?? -1;
          const mb = b.combinedAiScore ?? -1;
          cmp = ma - mb;
          break;
        }
        case "evidenceStatus": {
          const order: Record<string, number> = { "Complete": 0, "In Progress": 1, "Not Started": 2 };
          const ea = order[a.evidenceStatus ?? ""] ?? 3;
          const eb = order[b.evidenceStatus ?? ""] ?? 3;
          cmp = ea - eb;
          break;
        }
        case "domain":
          cmp = a.category.localeCompare(b.category);
          break;
        case "owner":
          cmp = (a.owner ?? "").localeCompare(b.owner ?? "");
          break;
        default:
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [requirements, frameworkFilter, categoryFilter, statusFilter, ownerFilter, searchQuery, showNotApplicable, mappingsByReq, docMap, sortColumn, sortDir, sourceMap]);

  const totalResults = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / pageSize));
  const paginatedControls = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const startItem = totalResults === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalResults);

  const createMutation = useMutation({
    mutationFn: async (data: ReqFormValues) => {
      const res = await apiRequest("POST", "/api/controls", {
        sourceId: data.sourceId,
        code: data.code,
        title: data.title,
        description: data.description,
        category: data.category,
        evidenceStatus: data.evidenceStatus || null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/controls"] });
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
      const res = await apiRequest("PUT", `/api/controls/${id}`, {
        sourceId: data.sourceId,
        code: data.code,
        title: data.title,
        description: data.description,
        category: data.category,
        evidenceStatus: data.evidenceStatus || null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/controls"] });
      toast({ title: "Control updated" });
      closeDialog();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/controls/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/controls"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      toast({ title: "Control deleted" });
      setDeleteConfirmOpen(false);
      setDeletingReq(null);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const toggleApplicableMutation = useMutation({
    mutationFn: async ({ id, applicable }: { id: number; applicable: boolean }) => {
      const res = await apiRequest("PUT", `/api/controls?id=${id}`, { applicable });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/controls"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      toast({ title: data.applicable ? "Control marked as applicable" : "Control marked as not applicable" });
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
      evidenceStatus: null,
    });
    setDialogOpen(true);
  }

  function openEditDialog(req: Control) {
    setEditingReq(req);
    form.reset({
      sourceId: req.sourceId,
      code: req.code,
      title: req.title,
      description: req.description,
      category: req.category,
      evidenceStatus: req.evidenceStatus ?? null,
    });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingReq(null);
  }

  const bulkCoverageJob = useAiJob(bulkCoverageJobId);
  const cancelJob = useCancelAiJob();

  // Restore job on mount from localStorage
  useEffect(() => {
    const saved = getPersistedJobId("bulk-coverage");
    if (saved) setBulkCoverageJobId(saved);
  }, []);

  // When bulk coverage job completes, refresh data and show toast
  const bulkJobStatus = bulkCoverageJob.data?.status;
  const bulkJobResult = bulkCoverageJob.data?.result;
  const bulkJobError = bulkCoverageJob.data?.errorMessage;

  useEffect(() => {
    if (bulkJobStatus === "completed" && bulkCoverageJobId) {
      clearPersistedJobId("bulk-coverage");
      queryClient.invalidateQueries({ queryKey: ["/api/controls"] });
      queryClient.invalidateQueries({ queryKey: ["/api/control-mappings"] });
      toast({
        title: "AI Coverage Complete",
        description: `${bulkJobResult?.completed ?? 0} controls analysed, ${bulkJobResult?.failed ?? 0} skipped`,
      });
      setBulkCoverageJobId(null);
    } else if (bulkJobStatus === "failed" && bulkCoverageJobId) {
      clearPersistedJobId("bulk-coverage");
      toast({
        title: "AI Coverage Failed",
        description: bulkJobError || "An error occurred",
        variant: "destructive",
      });
      setBulkCoverageJobId(null);
    } else if (bulkJobStatus === "cancelled" && bulkCoverageJobId) {
      clearPersistedJobId("bulk-coverage");
      toast({ title: "AI Coverage Cancelled" });
      setBulkCoverageJobId(null);
    }
  }, [bulkJobStatus, bulkCoverageJobId]);

  const bulkCoverageMutation = useMutation({
    mutationFn: async (mode: "all" | "gaps") => {
      const res = await apiRequest("POST", `/api/ai-jobs?action=bulk-coverage&mode=${mode}`);
      return res.json();
    },
    onSuccess: (data) => {
      if (data.jobId) {
        persistJobId("bulk-coverage", data.jobId);
        setBulkCoverageJobId(data.jobId);
        toast({
          title: "AI Coverage Started",
          description: `Analysing ${data.total} controls...`,
        });
      } else {
        toast({
          title: "Nothing to analyse",
          description: data.message || "No eligible controls found",
        });
      }
      setCoverageDialogOpen(false);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const isBulkRunning = bulkCoverageJobId != null && (bulkJobStatus === "pending" || bulkJobStatus === "processing");

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
          {isBulkRunning ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => bulkCoverageJobId && cancelJob.mutate(bulkCoverageJobId)}
              data-testid="button-run-ai-coverage"
            >
              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
              {bulkCoverageJob.data?.progressMessage || "Analysing..."}
              <X className="h-3.5 w-3.5 ml-1.5" />
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCoverageDialogOpen(true)}
              disabled={bulkCoverageMutation.isPending}
              data-testid="button-run-ai-coverage"
            >
              <Sparkles className="h-3.5 w-3.5 mr-1" />
              Run AI Coverage
            </Button>
          )}
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

        <Button
          variant={showNotApplicable ? "secondary" : "ghost"}
          size="sm"
          className="text-sm"
          onClick={() => { setShowNotApplicable(!showNotApplicable); setCurrentPage(1); }}
          data-testid="button-toggle-na"
        >
          <Ban className="h-3 w-3 mr-1" />
          {showNotApplicable ? "Hide N/A" : "Show N/A"}
          {naCount > 0 && <Badge variant="secondary" className="ml-1.5 text-xs">{naCount}</Badge>}
        </Button>

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
                  <TableHead className="text-xs font-medium text-muted-foreground w-[120px] cursor-pointer select-none" data-testid="th-framework" onClick={() => toggleSort("framework")}>
                    <span className="flex items-center">Framework<SortIcon col="framework" /></span>
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground cursor-pointer select-none" data-testid="th-title" onClick={() => toggleSort("title")}>
                    <span className="flex items-center">Title<SortIcon col="title" /></span>
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground w-[100px] cursor-pointer select-none" data-testid="th-id" onClick={() => toggleSort("id")}>
                    <span className="flex items-center">ID<SortIcon col="id" /></span>
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground w-[250px]" data-testid="th-description">Description</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground w-[90px] cursor-pointer select-none" data-testid="th-match" onClick={() => toggleSort("match")}>
                    <span className="flex items-center">Match %<SortIcon col="match" /></span>
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground w-[120px] cursor-pointer select-none" data-testid="th-evidence-status" onClick={() => toggleSort("evidenceStatus")}>
                    <span className="flex items-center">Evidence Status<SortIcon col="evidenceStatus" /></span>
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground w-[140px] cursor-pointer select-none" data-testid="th-domain" onClick={() => toggleSort("domain")}>
                    <span className="flex items-center">Domain<SortIcon col="domain" /></span>
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground w-[140px] cursor-pointer select-none" data-testid="th-owner" onClick={() => toggleSort("owner")}>
                    <span className="flex items-center">Owner<SortIcon col="owner" /></span>
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground w-[50px]" data-testid="th-actions"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedControls.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-32 text-center text-muted-foreground" data-testid="text-no-controls">
                      No controls found.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedControls.map((req) => {
                    const source = sourceMap.get(req.sourceId);
                    const ownerName = req.owner ?? "--";
                    const isNA = req.applicable === false;
                    const evidenceStatusColor = req.evidenceStatus === "Complete"
                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                      : req.evidenceStatus === "In Progress"
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                        : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
                    return (
                      <TableRow
                        key={req.id}
                        className={`group cursor-pointer hover-elevate ${isNA ? "opacity-50" : ""}`}
                        onClick={() => navigate(`/controls/${req.id}`)}
                        data-testid={`row-control-${req.id}`}
                      >
                        <TableCell className="text-xs text-muted-foreground align-top pt-4" data-testid={`text-framework-${req.id}`}>
                          {source?.shortName ?? "--"}
                        </TableCell>
                        <TableCell className="align-top pt-4" data-testid={`text-title-${req.id}`}>
                          <span className="text-sm font-medium">{req.title}</span>
                          {isNA && <Badge variant="outline" className="ml-2 text-xs"><Ban className="h-3 w-3 mr-1" />N/A</Badge>}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground align-top pt-4" data-testid={`text-id-${req.id}`}>
                          {req.code}
                        </TableCell>
                        <TableCell className="align-top pt-4" data-testid={`text-description-${req.id}`}>
                          <p className="text-xs text-muted-foreground line-clamp-2 max-w-[250px]">{req.description || "--"}</p>
                        </TableCell>
                        <TableCell className="align-top pt-4" data-testid={`text-match-${req.id}`}>
                          {req.combinedAiScore != null ? (
                            <div className="flex items-center gap-1.5">
                              <svg width="24" height="24" viewBox="0 0 36 36">
                                <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" strokeWidth="4" className="text-muted" />
                                <circle
                                  cx="18" cy="18" r="14" fill="none" strokeWidth="4" strokeLinecap="round"
                                  strokeDasharray={`${(req.combinedAiScore / 100) * 87.96} ${87.96}`}
                                  transform="rotate(-90 18 18)"
                                  className={req.combinedAiScore >= 80 ? "stroke-green-500 dark:stroke-green-400" : req.combinedAiScore >= 60 ? "stroke-amber-500 dark:stroke-amber-400" : "stroke-gray-400 dark:stroke-gray-500"}
                                />
                              </svg>
                              <span className="text-xs font-semibold">{req.combinedAiScore}%</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">--</span>
                          )}
                        </TableCell>
                        <TableCell className="align-top pt-4" data-testid={`text-evidence-status-${req.id}`}>
                          {req.evidenceStatus ? (
                            <Badge variant="secondary" className={`border-0 text-xs ${evidenceStatusColor}`}>
                              {req.evidenceStatus}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">--</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm align-top pt-4" data-testid={`text-domain-${req.id}`}>
                          {req.category}
                        </TableCell>
                        <TableCell className="text-sm align-top pt-4" data-testid={`text-owner-${req.id}`}>
                          {ownerName}
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
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                toggleApplicableMutation.mutate({ id: req.id, applicable: req.applicable === false });
                              }}>
                                {req.applicable === false ? "Mark Applicable" : "Mark Not Applicable"}
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
                  <SelectItem value="200">200</SelectItem>
                  <SelectItem value="500">500</SelectItem>
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
                name="evidenceStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Evidence Status</FormLabel>
                    <Select
                      value={field.value ?? ""}
                      onValueChange={(val) => field.onChange(val || null)}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-evidence-status">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Not Started">Not Started</SelectItem>
                        <SelectItem value="In Progress">In Progress</SelectItem>
                        <SelectItem value="Complete">Complete</SelectItem>
                      </SelectContent>
                    </Select>
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

      <Dialog open={coverageDialogOpen} onOpenChange={setCoverageDialogOpen}>
        <DialogContent className="sm:max-w-[440px]" data-testid="dialog-coverage-choice">
          <DialogHeader>
            <DialogTitle>Run AI Coverage Analysis</DialogTitle>
            <DialogDescription>
              Analyse how well linked documents cover each control. This will use AI to score every control that has mapped documents.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <Button
              variant="outline"
              className="justify-start h-auto py-3 px-4"
              disabled={bulkCoverageMutation.isPending}
              onClick={() => bulkCoverageMutation.mutate("gaps")}
              data-testid="button-coverage-gaps"
            >
              <div className="text-left">
                <p className="font-medium text-sm">Gaps only</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Only analyse controls that don't yet have 100% coverage
                </p>
              </div>
            </Button>
            <Button
              variant="outline"
              className="justify-start h-auto py-3 px-4"
              disabled={bulkCoverageMutation.isPending}
              onClick={() => bulkCoverageMutation.mutate("all")}
              data-testid="button-coverage-all"
            >
              <div className="text-left">
                <p className="font-medium text-sm">Full refresh</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Re-analyse all controls, including those already at 100%
                </p>
              </div>
            </Button>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setCoverageDialogOpen(false)} data-testid="button-cancel-coverage">
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
