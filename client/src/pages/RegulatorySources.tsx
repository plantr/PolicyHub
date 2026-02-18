import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Pencil, Trash2, ExternalLink, LayoutGrid, List, Search, MoreHorizontal, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import type { RegulatorySource, Requirement, RequirementMapping } from "@shared/schema";
import { insertRegulatorySourceSchema } from "@shared/schema";

const sourceFormSchema = insertRegulatorySourceSchema.extend({
  name: z.string().min(1, "Name is required"),
  shortName: z.string().min(1, "Short name is required"),
  jurisdiction: z.string().min(1, "Jurisdiction is required"),
  category: z.string().min(1, "Category is required"),
  url: z.string().nullable().default(null),
  description: z.string().nullable().default(null),
});

type SourceFormValues = z.infer<typeof sourceFormSchema>;

type ViewMode = "table" | "cards";

const JURISDICTION_ORDER = ["UK", "Gibraltar", "Estonia/EU", "International"];

function groupByJurisdiction(sources: RegulatorySource[]) {
  const groups: Record<string, RegulatorySource[]> = {};
  for (const s of sources) {
    const key = s.jurisdiction;
    if (!groups[key]) groups[key] = [];
    groups[key].push(s);
  }
  const ordered: [string, RegulatorySource[]][] = [];
  for (const j of JURISDICTION_ORDER) {
    if (groups[j]) {
      ordered.push([j, groups[j]]);
      delete groups[j];
    }
  }
  for (const [j, list] of Object.entries(groups)) {
    ordered.push([j, list]);
  }
  return ordered;
}

function CompletionRing({ percent, size = 28, strokeWidth = 3 }: { percent: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  const color = percent >= 80 ? "text-emerald-500 dark:text-emerald-400" : percent >= 50 ? "text-amber-500 dark:text-amber-400" : "text-muted-foreground";

  return (
    <div className="flex items-center gap-2">
      <svg width={size} height={size} className={`-rotate-90 ${color}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="opacity-20"
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
        />
      </svg>
      <span className="text-sm font-medium">{percent}%</span>
    </div>
  );
}

interface FrameworkMetrics {
  totalRequirements: number;
  coveredCount: number;
  partiallyCoveredCount: number;
  notCoveredCount: number;
  coveragePercent: number;
  mappedPercent: number;
}

function computeMetrics(
  sourceId: number,
  requirements: Requirement[],
  mappings: RequirementMapping[]
): FrameworkMetrics {
  const sourceReqs = requirements.filter((r) => r.sourceId === sourceId);
  const totalRequirements = sourceReqs.length;
  if (totalRequirements === 0) {
    return { totalRequirements: 0, coveredCount: 0, partiallyCoveredCount: 0, notCoveredCount: 0, coveragePercent: 0, mappedPercent: 0 };
  }
  const reqIds = new Set(sourceReqs.map((r) => r.id));
  const relevantMappings = mappings.filter((m) => reqIds.has(m.requirementId));

  const coveredReqIds = new Set<number>();
  const partialReqIds = new Set<number>();
  for (const m of relevantMappings) {
    if (m.coverageStatus === "Covered") {
      coveredReqIds.add(m.requirementId);
    } else if (m.coverageStatus === "Partially Covered") {
      partialReqIds.add(m.requirementId);
    }
  }
  const coveredCount = coveredReqIds.size;
  const partiallyCoveredCount = Array.from(partialReqIds).filter((id) => !coveredReqIds.has(id)).length;
  const notCoveredCount = totalRequirements - coveredCount - partiallyCoveredCount;
  const coveragePercent = Math.round(((coveredCount + partiallyCoveredCount * 0.5) / totalRequirements) * 100);
  const mappedPercent = Math.round(((coveredCount + partiallyCoveredCount) / totalRequirements) * 100);

  return { totalRequirements, coveredCount, partiallyCoveredCount, notCoveredCount, coveragePercent, mappedPercent };
}

export default function RegulatorySources() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<RegulatorySource | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingSource, setDeletingSource] = useState<RegulatorySource | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterJurisdiction, setFilterJurisdiction] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;
  const { toast } = useToast();

  const form = useForm<SourceFormValues>({
    resolver: zodResolver(sourceFormSchema),
    defaultValues: {
      name: "",
      shortName: "",
      jurisdiction: "",
      category: "",
      url: null,
      description: null,
    },
  });

  const { data: sources, isLoading } = useQuery<RegulatorySource[]>({
    queryKey: ["/api/regulatory-sources"],
  });

  const { data: requirements } = useQuery<Requirement[]>({
    queryKey: ["/api/requirements"],
  });

  const { data: mappings } = useQuery<RequirementMapping[]>({
    queryKey: ["/api/requirement-mappings"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: SourceFormValues) => {
      const res = await apiRequest("POST", "/api/regulatory-sources", {
        name: data.name,
        shortName: data.shortName,
        jurisdiction: data.jurisdiction,
        category: data.category,
        url: data.url || null,
        description: data.description || null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/regulatory-sources"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Framework created" });
      closeDialog();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: SourceFormValues }) => {
      const res = await apiRequest("PUT", `/api/regulatory-sources/${id}`, {
        name: data.name,
        shortName: data.shortName,
        jurisdiction: data.jurisdiction,
        category: data.category,
        url: data.url || null,
        description: data.description || null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/regulatory-sources"] });
      toast({ title: "Framework updated" });
      closeDialog();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/regulatory-sources/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/regulatory-sources"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Framework deleted" });
      setDeleteConfirmOpen(false);
      setDeletingSource(null);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  function openCreateDialog() {
    setEditingSource(null);
    form.reset({
      name: "",
      shortName: "",
      jurisdiction: "",
      category: "",
      url: null,
      description: null,
    });
    setDialogOpen(true);
  }

  function openEditDialog(source: RegulatorySource) {
    setEditingSource(source);
    form.reset({
      name: source.name,
      shortName: source.shortName,
      jurisdiction: source.jurisdiction,
      category: source.category,
      url: source.url ?? null,
      description: source.description ?? null,
    });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingSource(null);
  }

  function onSubmit(values: SourceFormValues) {
    if (editingSource) {
      updateMutation.mutate({ id: editingSource.id, data: values });
    } else {
      createMutation.mutate(values);
    }
  }

  const jurisdictions = useMemo(() => {
    if (!sources) return [];
    return Array.from(new Set(sources.map((s) => s.jurisdiction))).sort();
  }, [sources]);

  const categories = useMemo(() => {
    if (!sources) return [];
    return Array.from(new Set(sources.map((s) => s.category))).sort();
  }, [sources]);

  const filteredSources = useMemo(() => {
    if (!sources) return [];
    return sources.filter((s) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!s.name.toLowerCase().includes(q) && !s.shortName.toLowerCase().includes(q)) return false;
      }
      if (filterJurisdiction !== "all" && s.jurisdiction !== filterJurisdiction) return false;
      if (filterCategory !== "all" && s.category !== filterCategory) return false;
      return true;
    });
  }, [sources, searchQuery, filterJurisdiction, filterCategory]);

  const paginatedSources = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSources.slice(start, start + pageSize);
  }, [filteredSources, currentPage]);

  const totalPages = Math.max(1, Math.ceil(filteredSources.length / pageSize));

  const metricsMap = useMemo(() => {
    if (!sources || !requirements || !mappings) return new Map<number, FrameworkMetrics>();
    const map = new Map<number, FrameworkMetrics>();
    for (const s of sources) {
      map.set(s.id, computeMetrics(s.id, requirements, mappings));
    }
    return map;
  }, [sources, requirements, mappings]);

  const groups = groupByJurisdiction(filteredSources);

  return (
    <div className="space-y-6" data-testid="frameworks-page">
      <div className="flex flex-wrap items-start justify-between gap-3" data-testid="frameworks-header">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">Frameworks</h1>
          <p className="text-sm text-muted-foreground mt-1" data-testid="text-page-subtitle">Applicable legislation and regulatory instruments</p>
        </div>
        <Button onClick={openCreateDialog} data-testid="button-add-framework">
          <Plus className="h-4 w-4 mr-1" />
          Add Framework
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3" data-testid="frameworks-toolbar">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search frameworks..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="pl-9"
            data-testid="input-search-frameworks"
          />
        </div>
        <Select value={filterJurisdiction} onValueChange={(v) => { setFilterJurisdiction(v); setCurrentPage(1); }}>
          <SelectTrigger className="w-[160px]" data-testid="select-filter-jurisdiction">
            <SelectValue placeholder="Jurisdiction" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Jurisdictions</SelectItem>
            {jurisdictions.map((j) => (
              <SelectItem key={j} value={j}>{j}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={(v) => { setFilterCategory(v); setCurrentPage(1); }}>
          <SelectTrigger className="w-[160px]" data-testid="select-filter-category">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center border rounded-md" data-testid="toggle-view-mode">
          <Button
            size="icon"
            variant={viewMode === "table" ? "default" : "ghost"}
            onClick={() => setViewMode("table")}
            data-testid="button-view-table"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant={viewMode === "cards" ? "default" : "ghost"}
            onClick={() => setViewMode("cards")}
            data-testid="button-view-cards"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3" data-testid="frameworks-skeleton">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : filteredSources.length === 0 ? (
        <p className="text-muted-foreground text-center py-12" data-testid="text-no-frameworks">No frameworks found.</p>
      ) : viewMode === "table" ? (
        <div data-testid="frameworks-table-view">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[250px]">Framework name</TableHead>
                    <TableHead>Requirements</TableHead>
                    <TableHead>Coverage</TableHead>
                    <TableHead>Mapped</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Jurisdiction</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedSources.map((source) => {
                    const metrics = metricsMap.get(source.id);
                    return (
                      <TableRow key={source.id} data-testid={`row-framework-${source.id}`}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                              <span className="text-xs font-bold">
                                {source.shortName.substring(0, 3)}
                              </span>
                            </div>
                            <div>
                              <Link href={`/sources/${source.id}`} className="font-medium hover:underline text-foreground" data-testid={`text-framework-name-${source.id}`}>{source.name}</Link>
                              <div className="text-xs text-muted-foreground">{source.shortName}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell data-testid={`text-framework-reqs-${source.id}`}>
                          <span className="text-sm">{metrics?.totalRequirements ?? 0}</span>
                        </TableCell>
                        <TableCell data-testid={`text-framework-coverage-${source.id}`}>
                          {metrics && metrics.totalRequirements > 0 ? (
                            <CompletionRing percent={metrics.coveragePercent} />
                          ) : (
                            <span className="text-sm text-muted-foreground">&mdash;</span>
                          )}
                        </TableCell>
                        <TableCell data-testid={`text-framework-mapped-${source.id}`}>
                          {metrics && metrics.totalRequirements > 0 ? (
                            <CompletionRing percent={metrics.mappedPercent} />
                          ) : (
                            <span className="text-sm text-muted-foreground">&mdash;</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" data-testid={`badge-framework-category-${source.id}`}>{source.category}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" data-testid={`badge-framework-jurisdiction-${source.id}`}>{source.jurisdiction}</Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="icon" variant="ghost" data-testid={`button-framework-menu-${source.id}`}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditDialog(source)} data-testid={`menu-edit-framework-${source.id}`}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              {source.url && (
                                <DropdownMenuItem onClick={() => window.open(source.url!, "_blank")} data-testid={`menu-view-url-${source.id}`}>
                                  <ExternalLink className="h-4 w-4 mr-2" />
                                  View source
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => { setDeletingSource(source); setDeleteConfirmOpen(true); }}
                                className="text-destructive"
                                data-testid={`menu-delete-framework-${source.id}`}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
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
            </CardContent>
          </Card>
          <div className="flex flex-wrap items-center justify-between gap-2 mt-3">
            <p className="text-sm text-muted-foreground" data-testid="text-pagination-info">
              {filteredSources.length === 0
                ? "0 results"
                : `${(currentPage - 1) * pageSize + 1} to ${Math.min(currentPage * pageSize, filteredSources.length)} of ${filteredSources.length} results`}
            </p>
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="outline"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                data-testid="button-prev-page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                data-testid="button-next-page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div data-testid="frameworks-card-view">
          {groups.map(([jurisdiction, items]) => (
            <div key={jurisdiction} className="space-y-3 mb-6" data-testid={`section-jurisdiction-${jurisdiction}`}>
              <h2 className="text-lg font-semibold" data-testid={`text-jurisdiction-heading-${jurisdiction}`}>{jurisdiction}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {items.map((source) => {
                  const metrics = metricsMap.get(source.id);
                  return (
                    <Card key={source.id} data-testid={`card-framework-${source.id}`}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <Link href={`/sources/${source.id}`} className="hover:underline">
                            <CardTitle className="text-base" data-testid={`text-framework-name-${source.id}`}>
                              {source.name}
                            </CardTitle>
                          </Link>
                          <div className="flex items-center gap-1 flex-wrap">
                            <Badge variant="secondary" data-testid={`badge-short-name-${source.id}`}>{source.shortName}</Badge>
                            <Badge variant="outline" data-testid={`badge-category-${source.id}`}>{source.category}</Badge>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => openEditDialog(source)}
                              data-testid={`button-edit-framework-${source.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                setDeletingSource(source);
                                setDeleteConfirmOpen(true);
                              }}
                              data-testid={`button-delete-framework-${source.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {source.description && (
                          <p className="text-sm text-muted-foreground" data-testid={`text-framework-description-${source.id}`}>
                            {source.description}
                          </p>
                        )}
                        {metrics && metrics.totalRequirements > 0 && (
                          <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">Coverage:</span>
                              <CompletionRing percent={metrics.coveragePercent} />
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">Mapped:</span>
                              <CompletionRing percent={metrics.mappedPercent} />
                            </div>
                            <span className="text-muted-foreground">{metrics.totalRequirements} req.</span>
                          </div>
                        )}
                        {source.url && (
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                            data-testid={`link-framework-url-${source.id}`}
                          >
                            <ExternalLink className="w-3 h-3" />
                            View source
                          </a>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]" data-testid="dialog-framework">
          <DialogHeader>
            <DialogTitle data-testid="text-dialog-title">
              {editingSource ? "Edit Framework" : "Add Framework"}
            </DialogTitle>
            <DialogDescription>
              {editingSource ? "Update framework details." : "Add a new regulatory framework."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Electronic Money Regulations 2011" {...field} data-testid="input-framework-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="shortName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Short Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. EMRs" {...field} data-testid="input-framework-short-name" />
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
                      <FormLabel>Category</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Legislation" {...field} data-testid="input-framework-category" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="jurisdiction"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Jurisdiction</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. UK" {...field} data-testid="input-framework-jurisdiction" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://..." {...field} value={field.value ?? ""} data-testid="input-framework-url" />
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
                      <Textarea
                        placeholder="Brief description of the regulatory framework"
                        className="resize-none"
                        {...field}
                        value={field.value ?? ""}
                        data-testid="input-framework-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeDialog} data-testid="button-cancel-framework">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-framework"
                >
                  {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent data-testid="dialog-delete-framework">
          <DialogHeader>
            <DialogTitle>Delete Framework</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingSource?.name}"? This may affect linked requirements and regulatory profiles.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)} data-testid="button-cancel-delete-framework">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingSource && deleteMutation.mutate(deletingSource.id)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete-framework"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
