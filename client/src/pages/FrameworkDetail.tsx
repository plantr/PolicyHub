import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ArrowUpDown, ArrowUp, ArrowDown, ExternalLink, CheckCircle2, AlertCircle, CircleDot, Search, PanelLeftClose, PanelLeft, Pencil, Loader2, X, Ban, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { RegulatorySource, Control, ControlMapping, Document as PolicyDocument } from "@shared/schema";
import { useAiJob, useCancelAiJob, persistJobId, getPersistedJobId, clearPersistedJobId } from "@/hooks/use-ai-job";

const editFrameworkSchema = z.object({
  name: z.string().min(1, "Name is required"),
  shortName: z.string().min(1, "Short name is required"),
  jurisdiction: z.string().min(1, "Jurisdiction is required"),
  category: z.string().min(1, "Category is required"),
  url: z.string().nullable().default(null),
  description: z.string().nullable().default(null),
});

type EditFrameworkValues = z.infer<typeof editFrameworkSchema>;

function CoverageBar({ percent, color }: { percent: number; color: string }) {
  return (
    <div className="flex flex-wrap items-center gap-3 w-full">
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${percent}%` }} />
      </div>
      <span className="text-sm font-medium w-10 text-right">{percent}%</span>
    </div>
  );
}

function DonutChart({ covered, total, label }: { covered: number; total: number; label: string }) {
  const percent = total > 0 ? Math.round((covered / total) * 100) : 0;
  const size = 100;
  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="flex items-center gap-4">
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
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="text-foreground"
        />
      </svg>
      <div className="flex flex-col text-xs gap-1">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-foreground inline-block" />
          <span>{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-muted inline-block" />
          <span>Unmapped</span>
        </div>
      </div>
    </div>
  );
}

function formatCategory(raw: string): string {
  return raw
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function getCoverageVariant(status: string) {
  switch (status) {
    case "Covered": return "default" as const;
    case "Partially Covered": return "secondary" as const;
    case "Not Covered": return "destructive" as const;
    default: return "outline" as const;
  }
}

function getBestStatus(reqMaps: ControlMapping[]): string {
  if (reqMaps.length === 0) return "Not Covered";
  if (reqMaps.some((m) => m.coverageStatus === "Covered")) return "Covered";
  if (reqMaps.some((m) => m.coverageStatus === "Partially Covered")) return "Partially Covered";
  return "Not Covered";
}

export default function FrameworkDetail({ params }: { params: { id: string } }) {
  const sourceId = Number(params.id);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showCategorySidebar, setShowCategorySidebar] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [sortField, setSortField] = useState<"code" | "title" | "owner" | "coverage" | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [ownerFilter, setOwnerFilter] = useState<string | null>(null);
  const [coverageFilter, setCoverageFilter] = useState<string | null>(null);
  const [showNotApplicable, setShowNotApplicable] = useState(false);
  const { toast } = useToast();

  // AI Map job state
  const [aiMapJobId, setAiMapJobId] = useState<string | null>(null);
  const aiMapJob = useAiJob(aiMapJobId);
  const cancelJob = useCancelAiJob();
  const aiMapRunning = aiMapJobId !== null;

  const aiMapEta = useMemo(() => {
    const result = aiMapJob.data?.result as { progress?: number; total?: number; startedAt?: number } | null;
    if (!result?.startedAt || !result.total || !result.progress || result.progress <= 0) return null;
    const elapsed = Date.now() - result.startedAt;
    const rate = result.progress / elapsed;
    const remainingMs = (result.total - result.progress) / rate;
    if (remainingMs < 1000) return null;
    const totalSecs = Math.round(remainingMs / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return mins > 0 ? `~${mins}m ${secs}s remaining` : `~${secs}s remaining`;
  }, [aiMapJob.data?.result]);

  const storageKey = `ai-map-framework:${sourceId}`;

  // Restore persisted job on mount
  useEffect(() => {
    const saved = getPersistedJobId(storageKey);
    if (saved) setAiMapJobId(saved);
  }, [storageKey]);

  const { data: source, isLoading: sourceLoading } = useQuery<RegulatorySource>({
    queryKey: ["/api/regulatory-sources", sourceId],
    queryFn: async () => {
      const res = await fetch(`/api/regulatory-sources?id=${sourceId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
  });

  const editForm = useForm<EditFrameworkValues>({
    resolver: zodResolver(editFrameworkSchema),
    defaultValues: {
      name: "",
      shortName: "",
      jurisdiction: "",
      category: "",
      url: null,
      description: null,
    },
  });

  function openEditDialog() {
    if (!source) return;
    editForm.reset({
      name: source.name,
      shortName: source.shortName,
      jurisdiction: source.jurisdiction,
      category: source.category ?? "",
      url: source.url ?? null,
      description: source.description ?? null,
    });
    setEditOpen(true);
  }

  const updateMutation = useMutation({
    mutationFn: async (data: EditFrameworkValues) => {
      await apiRequest("PUT", `/api/regulatory-sources?id=${sourceId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/regulatory-sources", sourceId] });
      queryClient.invalidateQueries({ queryKey: ["/api/regulatory-sources"] });
      toast({ title: "Framework updated" });
      setEditOpen(false);
    },
    onError: (err: Error) => {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    },
  });

  const aiMapMutation = useMutation({
    mutationFn: async () => {
      const params = new URLSearchParams({ action: "map-all-documents", mode: "unmapped", sourceId: String(sourceId) });
      const res = await apiRequest("POST", `/api/ai-jobs?${params}`);
      return res.json();
    },
    onSuccess: (data: { jobId?: string; message?: string }) => {
      if (data.jobId) {
        persistJobId(storageKey, data.jobId);
        setAiMapJobId(data.jobId);
        toast({ title: "AI Map Started", description: "Mapping documents against framework controls..." });
      } else {
        toast({ title: "AI Map", description: data.message || "Nothing to process" });
      }
    },
    onError: (err: Error) => {
      toast({ title: "AI Map Failed", description: err.message, variant: "destructive" });
    },
  });

  // Handle AI Map job completion
  useEffect(() => {
    if (!aiMapJob.data || !aiMapJobId) return;
    if (aiMapJob.data.status === "completed") {
      clearPersistedJobId(storageKey);
      queryClient.invalidateQueries({ queryKey: ["/api/control-mappings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      const result = aiMapJob.data.result as { documentsProcessed?: number; totalMapped?: number } | null;
      toast({
        title: "AI Map Complete",
        description: `Processed ${result?.documentsProcessed ?? 0} documents, mapped ${result?.totalMapped ?? 0} controls`,
      });
      setAiMapJobId(null);
    } else if (aiMapJob.data.status === "failed") {
      clearPersistedJobId(storageKey);
      toast({ title: "AI Map Failed", description: aiMapJob.data.errorMessage || "Unknown error", variant: "destructive" });
      setAiMapJobId(null);
    } else if (aiMapJob.data.status === "cancelled") {
      clearPersistedJobId(storageKey);
      toast({ title: "AI Map Cancelled" });
      setAiMapJobId(null);
    }
  }, [aiMapJob.data?.status]);

  const { data: allRequirements } = useQuery<Control[]>({
    queryKey: ["/api/controls"],
  });

  const { data: allMappings } = useQuery<ControlMapping[]>({
    queryKey: ["/api/control-mappings"],
  });

  const { data: allDocuments } = useQuery<PolicyDocument[]>({
    queryKey: ["/api/documents"],
  });

  const allFrameworkControls = useMemo(() => {
    if (!allRequirements) return [];
    return allRequirements.filter((r) => r.sourceId === sourceId);
  }, [allRequirements, sourceId]);

  const requirements = useMemo(() => {
    if (showNotApplicable) return allFrameworkControls;
    return allFrameworkControls.filter((r) => r.applicable !== false);
  }, [allFrameworkControls, showNotApplicable]);

  const applicableControls = useMemo(() => {
    return allFrameworkControls.filter((r) => r.applicable !== false);
  }, [allFrameworkControls]);

  const reqIds = useMemo(() => new Set(requirements.map((r) => r.id)), [requirements]);

  const mappings = useMemo(() => {
    if (!allMappings) return [];
    return allMappings.filter((m) => reqIds.has(m.controlId));
  }, [allMappings, reqIds]);

  const metrics = useMemo(() => {
    const applicableIds = new Set(applicableControls.map((r) => r.id));
    const total = applicableControls.length;
    if (total === 0) return { total: 0, covered: 0, partial: 0, notCovered: 0, coveragePercent: 0, mappedPercent: 0 };

    const coveredIds = new Set<number>();
    const partialIds = new Set<number>();
    const mappedReqIds = new Set<number>();

    for (const m of mappings) {
      if (!applicableIds.has(m.controlId)) continue;
      mappedReqIds.add(m.controlId);
      if (m.coverageStatus === "Covered") coveredIds.add(m.controlId);
      else if (m.coverageStatus === "Partially Covered") partialIds.add(m.controlId);
    }

    const covered = coveredIds.size;
    const partial = Array.from(partialIds).filter((id) => !coveredIds.has(id)).length;
    const notCovered = total - covered - partial;
    const coveragePercent = Math.round(((covered + partial * 0.5) / total) * 100);
    const mappedPercent = Math.round((mappedReqIds.size / total) * 100);

    return { total, covered, partial, notCovered, coveragePercent, mappedPercent };
  }, [applicableControls, mappings]);

  const reqMappingLookup = useMemo(() => {
    const lookup = new Map<number, ControlMapping[]>();
    for (const m of mappings) {
      const list = lookup.get(m.controlId) || [];
      list.push(m);
      lookup.set(m.controlId, list);
    }
    return lookup;
  }, [mappings]);

  const linkedDocIds = useMemo(() => {
    const ids = new Set<number>();
    for (const m of mappings) if (m.documentId != null) ids.add(m.documentId);
    return ids;
  }, [mappings]);

  const linkedDocuments = useMemo(() => {
    if (!allDocuments) return [];
    return allDocuments.filter((d) => linkedDocIds.has(d.id));
  }, [allDocuments, linkedDocIds]);

  const reqCategories = useMemo(() => {
    return Array.from(new Set(requirements.map((r) => r.category))).sort();
  }, [requirements]);

  const uniqueOwners = useMemo(() => {
    return Array.from(new Set(requirements.map((r) => r.owner).filter(Boolean))).sort() as string[];
  }, [requirements]);

  const getControlCoverage = (controlId: number) => getBestStatus(reqMappingLookup.get(controlId) || []);

  const gapRows = useMemo(() => {
    const rows: { control: Control; mapping: ControlMapping | null; bestStatus: string }[] = [];
    for (const ctrl of applicableControls) {
      const ctrlMappings = reqMappingLookup.get(ctrl.id) || [];
      const bestStatus = getBestStatus(ctrlMappings);
      if (bestStatus === "Covered") continue;
      if (ctrlMappings.length === 0) {
        rows.push({ control: ctrl, mapping: null, bestStatus });
      } else {
        for (const m of ctrlMappings) {
          if (m.coverageStatus !== "Covered") {
            rows.push({ control: ctrl, mapping: m, bestStatus: m.coverageStatus });
          }
        }
      }
    }
    return rows;
  }, [applicableControls, reqMappingLookup]);

  const filteredRequirements = useMemo(() => {
    let filtered = requirements;
    if (selectedCategory) {
      filtered = filtered.filter((r) => r.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.code.toLowerCase().includes(q) ||
          (r.description && r.description.toLowerCase().includes(q))
      );
    }
    if (ownerFilter) {
      filtered = filtered.filter((r) => r.owner === ownerFilter);
    }
    if (coverageFilter) {
      filtered = filtered.filter((r) => getControlCoverage(r.id) === coverageFilter);
    }
    return filtered;
  }, [requirements, selectedCategory, searchQuery, ownerFilter, coverageFilter, reqMappingLookup]);

  const groupedRequirements = useMemo(() => {
    const coverageOrder: Record<string, number> = { "Covered": 0, "Partially Covered": 1, "Not Covered": 2 };
    const sortControls = (list: Control[]) => {
      if (!sortField) return list;
      return [...list].sort((a, b) => {
        let cmp = 0;
        switch (sortField) {
          case "code": cmp = a.code.localeCompare(b.code); break;
          case "title": cmp = a.title.localeCompare(b.title); break;
          case "owner": cmp = (a.owner || "").localeCompare(b.owner || ""); break;
          case "coverage": {
            const sa = coverageOrder[getControlCoverage(a.id)] ?? 3;
            const sb = coverageOrder[getControlCoverage(b.id)] ?? 3;
            cmp = sa - sb;
            break;
          }
        }
        return sortDir === "desc" ? -cmp : cmp;
      });
    };

    const groups = new Map<string, Control[]>();
    for (const req of filteredRequirements) {
      const cat = req.category;
      const list = groups.get(cat) || [];
      list.push(req);
      groups.set(cat, list);
    }
    return Array.from(groups.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([cat, reqs]) => [cat, sortControls(reqs)] as [string, Control[]]);
  }, [filteredRequirements, sortField, sortDir, reqMappingLookup]);

  if (sourceLoading) {
    return (
      <div className="space-y-6" data-testid="framework-detail-skeleton">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-10 w-80" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64 lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (!source) {
    return (
      <div className="text-center py-12" data-testid="framework-not-found">
        <p className="text-muted-foreground">Framework not found.</p>
        <Link href="/sources" className="text-sm text-muted-foreground hover:text-foreground mt-2 inline-block">Back to Frameworks</Link>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="framework-detail-page">
      <div>
        <Link href="/sources" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-back-frameworks">
          Frameworks
        </Link>
        <div className="flex flex-wrap items-center gap-3 mt-1">
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-framework-title">{source.name}</h1>
          <Button variant="outline" size="sm" onClick={openEditDialog} data-testid="button-edit-framework">
            <Pencil className="h-3.5 w-3.5 mr-1.5" />
            Edit
          </Button>
          {aiMapRunning ? (
            <Button
              variant="outline"
              size="sm"
              className="max-w-xs truncate"
              onClick={() => aiMapJobId && cancelJob.mutate(aiMapJobId)}
              data-testid="button-ai-map-framework"
            >
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              {aiMapJob.data?.progressMessage || "Mapping..."}{aiMapEta ? ` (${aiMapEta})` : ""}
              <X className="h-3.5 w-3.5 ml-1.5" />
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              disabled={aiMapMutation.isPending}
              onClick={() => aiMapMutation.mutate()}
              data-testid="button-ai-map-framework"
            >
              <Sparkles className="h-3.5 w-3.5 mr-1.5 text-purple-500 dark:text-purple-400" />
              AI Map
            </Button>
          )}
        </div>
      </div>

      {aiMapRunning && (
        <div className="flex items-center gap-3 rounded-md border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/30 px-4 py-3">
          <Loader2 className="h-4 w-4 animate-spin text-purple-600 dark:text-purple-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-purple-900 dark:text-purple-200">
              AI Mapping in progress
            </p>
            <p className="text-xs text-purple-700 dark:text-purple-400 truncate">
              {aiMapJob.data?.progressMessage || "Starting..."}
            </p>
            {aiMapEta && (
              <p className="text-xs text-purple-600 dark:text-purple-500">{aiMapEta}</p>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-purple-700 dark:text-purple-300 hover:text-purple-900 dark:hover:text-purple-100 shrink-0"
            onClick={() => aiMapJobId && cancelJob.mutate(aiMapJobId)}
          >
            <X className="h-3.5 w-3.5 mr-1" />
            Cancel
          </Button>
        </div>
      )}

      <Tabs defaultValue="overview" data-testid="framework-tabs">
        <TabsList className="bg-transparent border-b rounded-none h-auto p-0 w-full justify-start flex-wrap gap-2">
          <TabsTrigger
            value="overview"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-2"
            data-testid="tab-overview"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="controls"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-2"
            data-testid="tab-controls"
          >
            Controls
            <Badge variant="secondary" className="ml-2 text-xs">{requirements.length}</Badge>
          </TabsTrigger>
          <TabsTrigger
            value="gaps"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-2"
            data-testid="tab-gaps"
          >
            Gaps
            <Badge variant="secondary" className="ml-2 text-xs">{metrics.partial + metrics.notCovered}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" data-testid="tab-content-overview">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-4 lg:col-span-1">
              <Card data-testid="card-coverage-metrics">
                <CardContent className="pt-6 space-y-5">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Coverage</h3>
                    <p className="text-3xl font-bold" data-testid="text-coverage-percent">{metrics.coveragePercent}%</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      of {source.shortName} controls have policy coverage
                    </p>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-xs text-muted-foreground">Fully Covered</span>
                      </div>
                      <CoverageBar
                        percent={metrics.total > 0 ? Math.round((metrics.covered / metrics.total) * 100) : 0}
                        color="bg-emerald-500 dark:bg-emerald-400"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-xs text-muted-foreground">Partially Covered</span>
                      </div>
                      <CoverageBar
                        percent={metrics.total > 0 ? Math.round((metrics.partial / metrics.total) * 100) : 0}
                        color="bg-amber-500 dark:bg-amber-400"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="card-control-status">
                <CardContent className="pt-6 space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Controls</h3>
                    <p className="text-3xl font-bold" data-testid="text-mapped-percent">{metrics.mappedPercent}%</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      of controls have document mappings
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
                        <span className="text-sm">Covered</span>
                      </div>
                      <span className="text-sm font-medium" data-testid="text-covered-count">{metrics.covered}</span>
                    </div>
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-2">
                        <CircleDot className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                        <span className="text-sm">Partial</span>
                      </div>
                      <span className="text-sm font-medium" data-testid="text-partial-count">{metrics.partial}</span>
                    </div>
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Not Covered</span>
                      </div>
                      <span className="text-sm font-medium" data-testid="text-not-covered-count">{metrics.notCovered}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="card-document-overlap">
                <CardContent className="pt-6 space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Document overlap</h3>
                    <p className="text-3xl font-bold" data-testid="text-overlap-percent">
                      {metrics.total > 0 ? Math.round((metrics.covered / metrics.total) * 100) : 0}%
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {metrics.covered} out of {metrics.total} controls in {source.shortName} are fully covered by mapped documents
                    </p>
                  </div>
                  <DonutChart covered={metrics.covered} total={metrics.total} label={source.shortName} />
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-2 space-y-4">
              <Card data-testid="card-framework-overview">
                <CardContent className="pt-6">
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                    <h2 className="text-lg font-semibold" data-testid="text-overview-heading">{source.name} overview</h2>
                    {source.url && (
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                        data-testid="link-learn-more"
                      >
                        Learn More <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                  {source.description && (
                    <p className="text-sm text-muted-foreground mb-4" data-testid="text-framework-description">{source.description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 mb-6">
                    <Badge variant="outline" data-testid="badge-jurisdiction">{source.jurisdiction}</Badge>
                    <Badge variant="secondary" data-testid="badge-category">{source.category}</Badge>
                    <Badge variant="secondary" data-testid="badge-short-name">{source.shortName}</Badge>
                  </div>

                  <div className="space-y-1">
                    <Collapsible>
                      <CollapsibleTrigger className="flex flex-wrap items-center gap-2 w-full py-3 border-t text-left group" data-testid="trigger-linked-documents">
                        <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-data-[state=closed]:-rotate-90" />
                        <span className="font-medium text-sm">Linked Documents ({linkedDocuments.length})</span>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        {linkedDocuments.length === 0 ? (
                          <p className="text-sm text-muted-foreground py-3 pl-6">No documents linked to this framework's controls.</p>
                        ) : (
                          <div className="border rounded-md overflow-hidden mb-4">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Document</TableHead>
                                  <TableHead className="w-[120px]">Type</TableHead>
                                  <TableHead className="w-[120px]">Taxonomy</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {linkedDocuments.map((doc) => (
                                  <TableRow key={doc.id} data-testid={`row-document-${doc.id}`}>
                                    <TableCell>
                                      <Link href={`/documents/${doc.id}`} className="text-sm hover:underline">
                                        {doc.title}
                                      </Link>
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant="outline" className="text-xs">{doc.docType}</Badge>
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant="secondary" className="text-xs">{doc.domain}</Badge>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </CollapsibleContent>
                    </Collapsible>

                    {source.jurisdiction && (
                      <Collapsible>
                        <CollapsibleTrigger className="flex flex-wrap items-center gap-2 w-full py-3 border-t text-left group" data-testid="trigger-jurisdiction-info">
                          <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-data-[state=closed]:-rotate-90" />
                          <span className="font-medium text-sm">Jurisdiction & Applicability</span>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="py-3 pl-6 space-y-2">
                            <p className="text-sm">
                              <span className="text-muted-foreground">Jurisdiction:</span>{" "}
                              <span className="font-medium">{source.jurisdiction}</span>
                            </p>
                            <p className="text-sm">
                              <span className="text-muted-foreground">Category:</span>{" "}
                              <span className="font-medium">{source.category}</span>
                            </p>
                            <p className="text-sm">
                              <span className="text-muted-foreground">Instrument Code:</span>{" "}
                              <span className="font-medium">{source.shortName}</span>
                            </p>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="controls" data-testid="tab-content-controls">
          <Card className="mb-6" data-testid="card-controls-summary">
            <CardContent className="pt-6">
              <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                <div className="flex-1">
                  <h2 className="text-lg font-semibold mb-1">Controls</h2>
                  <p className="text-3xl font-bold" data-testid="text-controls-coverage-percent">{metrics.coveragePercent}%</p>
                  <p className="text-xs text-muted-foreground mt-1 mb-3">Of controls have passing evidence</p>
                  <CoverageBar
                    percent={metrics.coveragePercent}
                    color="bg-emerald-500 dark:bg-emerald-400"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground mt-2">
                    <span>{metrics.covered + metrics.partial} controls</span>
                    <span>{metrics.total} total</span>
                  </div>
                </div>
                <div className="flex flex-col gap-3 lg:w-64 shrink-0">
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-xs text-muted-foreground">Controls mapped</span>
                      <span className="text-xs font-medium">{metrics.mappedPercent}%</span>
                    </div>
                    <CoverageBar
                      percent={metrics.mappedPercent}
                      color="bg-emerald-500 dark:bg-emerald-400"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-xs text-muted-foreground">Documents</span>
                      <span className="text-xs font-medium">{linkedDocuments.length}/{(allDocuments ?? []).length}</span>
                    </div>
                    <CoverageBar
                      percent={(allDocuments ?? []).length > 0 ? Math.round((linkedDocuments.length / (allDocuments ?? []).length) * 100) : 0}
                      color="bg-emerald-500 dark:bg-emerald-400"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-wrap items-center gap-3 mb-4" data-testid="controls-filters">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-controls-search"
              />
            </div>
            <Select value={ownerFilter ?? "__all__"} onValueChange={(v) => setOwnerFilter(v === "__all__" ? null : v)}>
              <SelectTrigger className="w-[180px]" data-testid="select-owner-filter">
                <SelectValue placeholder="All owners" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All owners</SelectItem>
                {uniqueOwners.map((owner) => (
                  <SelectItem key={owner} value={owner}>{owner}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={coverageFilter ?? "__all__"} onValueChange={(v) => setCoverageFilter(v === "__all__" ? null : v)}>
              <SelectTrigger className="w-[180px]" data-testid="select-coverage-filter">
                <SelectValue placeholder="All coverage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All coverage</SelectItem>
                <SelectItem value="Covered">Covered</SelectItem>
                <SelectItem value="Partially Covered">Partially Covered</SelectItem>
                <SelectItem value="Not Covered">Not Covered</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant={showNotApplicable ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setShowNotApplicable(!showNotApplicable)}
              data-testid="button-toggle-na"
            >
              <Ban className="h-3.5 w-3.5 mr-1" />
              {showNotApplicable ? "Hide N/A" : "Show N/A"}
              {allFrameworkControls.length - applicableControls.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 text-xs">{allFrameworkControls.length - applicableControls.length}</Badge>
              )}
            </Button>
            {(ownerFilter || coverageFilter) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setOwnerFilter(null); setCoverageFilter(null); }}
                data-testid="button-clear-filters"
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Clear
              </Button>
            )}
          </div>

          <div className="flex gap-6">
            {showCategorySidebar && reqCategories.length > 0 && (
              <div className="hidden lg:block w-56 shrink-0 px-2" data-testid="controls-category-sidebar">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Control Categories</h3>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setShowCategorySidebar(false)}
                    data-testid="button-collapse-categories"
                  >
                    <PanelLeftClose className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-0.5">
                  <Button
                    variant="ghost"
                    className={`w-full justify-start text-sm whitespace-normal text-left h-auto ${
                      selectedCategory === null ? "bg-accent font-medium" : "text-muted-foreground"
                    }`}
                    onClick={() => setSelectedCategory(null)}
                    data-testid="button-category-all"
                  >
                    All ({requirements.length})
                  </Button>
                  {reqCategories.map((cat) => {
                    const count = requirements.filter((r) => r.category === cat).length;
                    return (
                      <Button
                        key={cat}
                        variant="ghost"
                        className={`w-full justify-start text-sm whitespace-normal text-left h-auto ${
                          selectedCategory === cat ? "bg-accent font-medium" : "text-muted-foreground"
                        }`}
                        onClick={() => setSelectedCategory(cat)}
                        data-testid={`button-category-${cat}`}
                      >
                        {formatCategory(cat)}
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}

            {!showCategorySidebar && reqCategories.length > 0 && (
              <div className="hidden lg:block shrink-0">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setShowCategorySidebar(true)}
                  data-testid="button-expand-categories"
                >
                  <PanelLeft className="h-4 w-4" />
                </Button>
              </div>
            )}

            <div className="flex-1 min-w-0 overflow-hidden space-y-4">
              {groupedRequirements.length === 0 && (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  {searchQuery || selectedCategory ? "No controls match your filters." : "No controls defined for this framework."}
                </p>
              )}
              {groupedRequirements.map(([category, reqs]) => (
                <Collapsible key={category} defaultOpen>
                  <CollapsibleTrigger className="flex flex-wrap items-center gap-2 w-full py-3 border-b text-left group" data-testid={`trigger-category-${category}`}>
                    <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-data-[state=closed]:-rotate-90" />
                    <span className="font-semibold text-base">{formatCategory(category)}</span>
                    <Badge variant="secondary" className="text-xs">{reqs.length}</Badge>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="border rounded-md overflow-hidden mt-2 mb-4">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="w-[100px]">
                              <button className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => { if (sortField === "code") { setSortDir(sortDir === "asc" ? "desc" : "asc"); } else { setSortField("code"); setSortDir("asc"); } }}>
                                Code
                                {sortField === "code" ? (sortDir === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />) : <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />}
                              </button>
                            </TableHead>
                            <TableHead>
                              <button className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => { if (sortField === "title") { setSortDir(sortDir === "asc" ? "desc" : "asc"); } else { setSortField("title"); setSortDir("asc"); } }}>
                                Title
                                {sortField === "title" ? (sortDir === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />) : <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />}
                              </button>
                            </TableHead>
                            <TableHead className="hidden xl:table-cell">
                              <button className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => { if (sortField === "owner") { setSortDir(sortDir === "asc" ? "desc" : "asc"); } else { setSortField("owner"); setSortDir("asc"); } }}>
                                Owner
                                {sortField === "owner" ? (sortDir === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />) : <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />}
                              </button>
                            </TableHead>
                            <TableHead className="w-[120px] text-right">
                              <button className="inline-flex items-center gap-1 hover:text-foreground ml-auto" onClick={() => { if (sortField === "coverage") { setSortDir(sortDir === "asc" ? "desc" : "asc"); } else { setSortField("coverage"); setSortDir("asc"); } }}>
                                Coverage
                                {sortField === "coverage" ? (sortDir === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />) : <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />}
                              </button>
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {reqs.map((req) => {
                            const reqMaps = reqMappingLookup.get(req.id) || [];
                            const bestStatus = getBestStatus(reqMaps);
                            const isNA = req.applicable === false;
                            return (
                              <TableRow key={req.id} className={isNA ? "opacity-50" : ""} data-testid={`control-row-${req.id}`}>
                                <TableCell className="font-mono text-xs text-muted-foreground align-top">
                                  {req.code}
                                </TableCell>
                                <TableCell className="align-top">
                                  <div className="flex items-center gap-2">
                                    <Link href={`/controls/${req.id}`} className="text-sm font-medium hover:underline">
                                      {req.title}
                                    </Link>
                                    {isNA && <Badge variant="outline" className="text-xs shrink-0"><Ban className="h-3 w-3 mr-1" />N/A</Badge>}
                                  </div>
                                  {req.description && (
                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{req.description}</p>
                                  )}
                                </TableCell>
                                <TableCell className="hidden xl:table-cell text-sm text-muted-foreground align-top">
                                  {req.owner || "--"}
                                </TableCell>
                                <TableCell className="text-right align-top">
                                  {isNA ? (
                                    <Badge variant="outline" className="text-xs">N/A</Badge>
                                  ) : (
                                    <Badge variant={getCoverageVariant(bestStatus)} className="text-xs">{bestStatus}</Badge>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="gaps" data-testid="tab-content-gaps">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card data-testid="card-gap-not-covered">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-1">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <h3 className="text-sm font-medium text-muted-foreground">Not Covered</h3>
                </div>
                <p className="text-3xl font-bold">{metrics.notCovered}</p>
                <p className="text-xs text-muted-foreground mt-1">controls with no policy coverage</p>
              </CardContent>
            </Card>
            <Card data-testid="card-gap-partial">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-1">
                  <CircleDot className="h-4 w-4 text-amber-500" />
                  <h3 className="text-sm font-medium text-muted-foreground">Partially Covered</h3>
                </div>
                <p className="text-3xl font-bold">{metrics.partial}</p>
                <p className="text-xs text-muted-foreground mt-1">controls needing additional coverage</p>
              </CardContent>
            </Card>
            <Card data-testid="card-gap-total">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <h3 className="text-sm font-medium text-muted-foreground">Fully Covered</h3>
                </div>
                <p className="text-3xl font-bold">{metrics.covered}</p>
                <p className="text-xs text-muted-foreground mt-1">controls with full policy coverage</p>
              </CardContent>
            </Card>
          </div>

          {gapRows.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground" data-testid="text-no-gaps">
                All controls in {source.shortName} are fully covered. No gaps identified.
              </CardContent>
            </Card>
          ) : (
            <div className="border rounded-md" data-testid="gaps-table">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs font-medium text-muted-foreground">Control Code</TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground">Control Title</TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground">Document</TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground">Coverage</TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground">AI Match %</TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground">Recommendation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gapRows.map((row, idx) => {
                    const doc = row.mapping?.documentId != null
                      ? (allDocuments ?? []).find((d) => d.id === row.mapping!.documentId)
                      : undefined;
                    return (
                      <TableRow key={`${row.control.id}-${row.mapping?.id ?? "unmapped"}-${idx}`} data-testid={`gap-row-${row.control.id}`}>
                        <TableCell className="font-mono text-sm font-medium">
                          <Link href={`/controls/${row.control.id}`} className="hover:underline">
                            {row.control.code}
                          </Link>
                        </TableCell>
                        <TableCell className="font-medium text-sm">{row.control.title}</TableCell>
                        <TableCell className="text-sm">
                          {doc ? (
                            <Link href={`/documents/${doc.id}`} className="hover:underline">{doc.title}</Link>
                          ) : (
                            <span className="text-muted-foreground">No document mapped</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getCoverageVariant(row.bestStatus)} className="text-xs">
                            {row.bestStatus}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {row.mapping?.aiMatchScore != null ? (
                            <span className="text-sm font-medium">{row.mapping.aiMatchScore}%</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-normal">
                          {row.mapping?.aiMatchRecommendations ?? row.mapping?.aiMatchRationale ?? "--"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={editOpen} onOpenChange={(open) => { setEditOpen(open); if (!open) editForm.reset(); }}>
        <DialogContent className="sm:max-w-[500px]" data-testid="dialog-edit-framework">
          <DialogHeader>
            <DialogTitle data-testid="text-edit-dialog-title">Edit Framework</DialogTitle>
            <DialogDescription>Update the framework details below.</DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit((data) => updateMutation.mutate(data))} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-edit-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="shortName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Short Name</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-edit-short-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="jurisdiction"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jurisdiction</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-jurisdiction">
                            <SelectValue placeholder="Select jurisdiction" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="UK">UK</SelectItem>
                          <SelectItem value="Gibraltar">Gibraltar</SelectItem>
                          <SelectItem value="Estonia/EU">Estonia/EU</SelectItem>
                          <SelectItem value="International">International</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={editForm.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-edit-category" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://..."
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value || null)}
                        data-testid="input-edit-url"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Description of this framework"
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value || null)}
                        className="resize-none"
                        data-testid="input-edit-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditOpen(false)} data-testid="button-cancel-edit">
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMutation.isPending} data-testid="button-save-framework">
                  {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  Save changes
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
