import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { RequirementMapping, Requirement, Document, BusinessUnit } from "@shared/schema";
import { RefreshCw, Search, ChevronDown, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

function getCoverageBadgeClass(status: string) {
  switch (status) {
    case "Covered":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    case "Partially Covered":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200";
    case "Not Covered":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    default:
      return "";
  }
}

interface ContentAnalysisItem {
  mappingId: number;
  requirementId: number;
  requirementCode: string;
  requirementTitle: string;
  documentId: number;
  documentTitle: string;
  previousStatus: string;
  newStatus: string;
  matchScore: number;
  matchedTerms: string[];
  totalTerms: number;
  hasMarkdown: boolean;
}

interface GapAnalysisResult {
  summary: {
    totalRequirements: number;
    applicableRequirements: number;
    totalMapped: number;
    unmappedCount: number;
    perBuGapCount: number;
    overStrictCount: number;
    coveredCount: number;
    partiallyCoveredCount: number;
    notCoveredCount: number;
    contentAnalysisCount?: number;
    contentUpdatedCount?: number;
  };
  unmappedRequirements: Array<{
    requirementId: number;
    code: string;
    title: string;
    category: string;
    sourceId: number;
    sourceName: string;
    article: string | null;
  }>;
  perBuGaps: Array<{
    businessUnitId: number;
    businessUnitName: string;
    requirementId: number;
    code: string;
    title: string;
    sourceName: string;
  }>;
  overStrictItems: Array<{
    documentId: number;
    documentTitle: string;
    requirementId: number;
    requirementCode: string;
    requirementTitle: string;
    sourceName: string;
    businessUnitId: number | null;
    businessUnitName: string;
    reason: string;
  }>;
  contentAnalysis?: ContentAnalysisItem[];
}

export default function GapAnalysis() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [buFilter, setBuFilter] = useState("all");
  const [analysisResult, setAnalysisResult] = useState<GapAnalysisResult | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const { toast } = useToast();

  const { data: mappings, isLoading: mappingsLoading } = useQuery<RequirementMapping[]>({
    queryKey: ["/api/requirement-mappings"],
  });
  const { data: requirements, isLoading: reqLoading } = useQuery<Requirement[]>({
    queryKey: ["/api/requirements"],
  });
  const { data: documents, isLoading: docLoading } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
  });
  const { data: businessUnits, isLoading: buLoading } = useQuery<BusinessUnit[]>({
    queryKey: ["/api/business-units"],
  });

  const refreshMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/gap-analysis/refresh");
      if (!res.ok) throw new Error("Failed to run gap analysis");
      return res.json() as Promise<GapAnalysisResult>;
    },
    onSuccess: (data) => {
      setAnalysisResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/requirement-mappings"] });
      const parts: string[] = [];
      if (data.summary.unmappedCount > 0) parts.push(`${data.summary.unmappedCount} unmapped`);
      if (data.summary.perBuGapCount > 0) parts.push(`${data.summary.perBuGapCount} per-entity gaps`);
      if (data.summary.overStrictCount > 0) parts.push(`${data.summary.overStrictCount} over-strict`);
      if (data.summary.contentUpdatedCount && data.summary.contentUpdatedCount > 0) parts.push(`${data.summary.contentUpdatedCount} statuses updated from content`);
      toast({
        title: "Gap analysis complete",
        description: parts.length > 0 ? `Found ${parts.join(", ")}.` : "No gaps or over-strict items detected.",
      });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const isLoading = mappingsLoading || reqLoading || docLoading || buLoading;

  const reqMap = new Map((requirements ?? []).map((r) => [r.id, r]));
  const docMap = new Map((documents ?? []).map((d) => [d.id, d]));
  const buMap = new Map((businessUnits ?? []).map((b) => [b.id, b]));

  const allMappings = mappings ?? [];

  const hasActiveFilters = statusFilter !== "all" || buFilter !== "all" || searchQuery !== "";

  const filtered = useMemo(() => {
    return allMappings.filter((m) => {
      if (statusFilter !== "all" && m.coverageStatus !== statusFilter) return false;
      if (buFilter !== "all" && String(m.businessUnitId ?? "") !== buFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const req = reqMap.get(m.requirementId);
        const doc = m.documentId != null ? docMap.get(m.documentId) : undefined;
        const code = (req?.code ?? "").toLowerCase();
        const title = (req?.title ?? "").toLowerCase();
        const docTitle = (doc?.title ?? "").toLowerCase();
        if (!code.includes(q) && !title.includes(q) && !docTitle.includes(q)) return false;
      }
      return true;
    });
  }, [allMappings, statusFilter, buFilter, searchQuery, reqMap, docMap]);

  const totalResults = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / pageSize));
  const paginatedMappings = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const startItem = totalResults === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalResults);

  function resetFilters() {
    setStatusFilter("all");
    setBuFilter("all");
    setSearchQuery("");
    setCurrentPage(1);
  }

  return (
    <div className="space-y-4" data-testid="gap-analysis-page">
      <div className="flex flex-wrap items-center gap-2" data-testid="gap-analysis-header">
        <h1 className="text-xl font-semibold tracking-tight" data-testid="text-page-title">Gap Analysis</h1>

        <div className="relative ml-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search"
            className="pl-9 w-[160px]"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            data-testid="input-search-gap-analysis"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="text-sm" data-testid="filter-coverage-status">
              Coverage status <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => { setStatusFilter("all"); setCurrentPage(1); }}>All</DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setStatusFilter("Covered"); setCurrentPage(1); }}>Covered</DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setStatusFilter("Partially Covered"); setCurrentPage(1); }}>Partially Covered</DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setStatusFilter("Not Covered"); setCurrentPage(1); }}>Not Covered</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="text-sm" data-testid="filter-business-unit">
              Business unit <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => { setBuFilter("all"); setCurrentPage(1); }}>All</DropdownMenuItem>
            {(businessUnits ?? []).map((bu) => (
              <DropdownMenuItem key={bu.id} onClick={() => { setBuFilter(String(bu.id)); setCurrentPage(1); }}>{bu.name}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" className="text-sm text-muted-foreground" onClick={resetFilters} data-testid="button-reset-view">
            Reset view
          </Button>
        )}

        <div className="ml-auto">
          <Button
            onClick={() => refreshMutation.mutate()}
            disabled={refreshMutation.isPending}
            data-testid="button-refresh-gap-analysis"
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${refreshMutation.isPending ? "animate-spin" : ""}`} />
            {refreshMutation.isPending ? "Analysing..." : "Refresh Analysis"}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3" data-testid="gap-analysis-skeleton">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : (
        <>
          <Tabs defaultValue="mappings" data-testid="gap-analysis-tabs">
            <TabsList data-testid="tabs-list">
              <TabsTrigger value="mappings" data-testid="tab-mappings">
                Mappings ({allMappings.length})
              </TabsTrigger>
              {analysisResult && (
                <>
                  <TabsTrigger value="unmapped" data-testid="tab-unmapped">
                    Unmapped ({analysisResult.summary.unmappedCount})
                  </TabsTrigger>
                  <TabsTrigger value="bu-gaps" data-testid="tab-bu-gaps">
                    Per-Entity Gaps ({analysisResult.summary.perBuGapCount})
                  </TabsTrigger>
                  <TabsTrigger value="over-strict" data-testid="tab-over-strict">
                    Over-Strict ({analysisResult.summary.overStrictCount})
                  </TabsTrigger>
                  {analysisResult.contentAnalysis && (
                    <TabsTrigger value="content-match" data-testid="tab-content-match">
                      Content Match ({analysisResult.contentAnalysis.length})
                    </TabsTrigger>
                  )}
                </>
              )}
            </TabsList>

            <TabsContent value="mappings" className="space-y-4">
              <div className="border rounded-md" data-testid="gap-analysis-table">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-xs font-medium text-muted-foreground" data-testid="th-req-code">Requirement Code</TableHead>
                      <TableHead className="text-xs font-medium text-muted-foreground" data-testid="th-req-title">Requirement Title</TableHead>
                      <TableHead className="text-xs font-medium text-muted-foreground" data-testid="th-document">Document</TableHead>
                      <TableHead className="text-xs font-medium text-muted-foreground" data-testid="th-bu">Business Unit</TableHead>
                      <TableHead className="text-xs font-medium text-muted-foreground" data-testid="th-coverage">Coverage Status</TableHead>
                      <TableHead className="text-xs font-medium text-muted-foreground" data-testid="th-rationale">Rationale</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedMappings.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-32 text-center text-muted-foreground" data-testid="text-no-mappings">
                          No mappings found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedMappings.map((m) => {
                        const req = reqMap.get(m.requirementId);
                        const doc = m.documentId != null ? docMap.get(m.documentId) : undefined;
                        const bu = m.businessUnitId ? buMap.get(m.businessUnitId) : null;
                        return (
                          <TableRow key={m.id} data-testid={`row-mapping-${m.id}`}>
                            <TableCell className="font-mono text-sm font-medium" data-testid={`text-req-code-${m.id}`}>
                              {req?.code ?? `REQ-${m.requirementId}`}
                            </TableCell>
                            <TableCell className="font-medium" data-testid={`text-req-title-${m.id}`}>
                              {req?.title ?? "--"}
                            </TableCell>
                            <TableCell className="text-sm" data-testid={`text-document-${m.id}`}>
                              {doc?.title ?? `Doc #${m.documentId}`}
                            </TableCell>
                            <TableCell className="text-sm" data-testid={`text-bu-${m.id}`}>
                              {bu?.name ?? "Group"}
                            </TableCell>
                            <TableCell data-testid={`badge-coverage-${m.id}`}>
                              <Badge variant="secondary" className={`border-0 ${getCoverageBadgeClass(m.coverageStatus)}`}>
                                {m.coverageStatus}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground max-w-[250px] truncate" data-testid={`text-rationale-${m.id}`}>
                              {m.rationale ?? "--"}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground" data-testid="pagination-mappings">
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
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    data-testid="button-prev-page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    data-testid="button-next-page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </TabsContent>

            {analysisResult && (
              <>
                <TabsContent value="unmapped" className="space-y-4">
                  <div className="border rounded-md" data-testid="unmapped-table">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="text-xs font-medium text-muted-foreground" data-testid="th-unmapped-code">Code</TableHead>
                          <TableHead className="text-xs font-medium text-muted-foreground" data-testid="th-unmapped-title">Title</TableHead>
                          <TableHead className="text-xs font-medium text-muted-foreground" data-testid="th-unmapped-category">Category</TableHead>
                          <TableHead className="text-xs font-medium text-muted-foreground" data-testid="th-unmapped-source">Source</TableHead>
                          <TableHead className="text-xs font-medium text-muted-foreground" data-testid="th-unmapped-article">Article</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analysisResult.unmappedRequirements.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="h-32 text-center text-muted-foreground" data-testid="text-no-unmapped">
                              All applicable requirements are mapped. No gaps detected.
                            </TableCell>
                          </TableRow>
                        ) : (
                          analysisResult.unmappedRequirements.map((r) => (
                            <TableRow key={r.requirementId} data-testid={`row-unmapped-${r.requirementId}`}>
                              <TableCell className="font-mono text-sm font-medium" data-testid={`text-unmapped-code-${r.requirementId}`}>
                                {r.code}
                              </TableCell>
                              <TableCell className="font-medium" data-testid={`text-unmapped-title-${r.requirementId}`}>
                                {r.title}
                              </TableCell>
                              <TableCell data-testid={`badge-unmapped-category-${r.requirementId}`}>
                                <Badge variant="outline">{r.category}</Badge>
                              </TableCell>
                              <TableCell className="text-sm" data-testid={`text-unmapped-source-${r.requirementId}`}>
                                {r.sourceName}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground" data-testid={`text-unmapped-article-${r.requirementId}`}>
                                {r.article ?? "--"}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                <TabsContent value="bu-gaps" className="space-y-4">
                  <div className="border rounded-md" data-testid="bu-gaps-table">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="text-xs font-medium text-muted-foreground" data-testid="th-bugap-bu">Business Unit</TableHead>
                          <TableHead className="text-xs font-medium text-muted-foreground" data-testid="th-bugap-code">Requirement Code</TableHead>
                          <TableHead className="text-xs font-medium text-muted-foreground" data-testid="th-bugap-title">Requirement Title</TableHead>
                          <TableHead className="text-xs font-medium text-muted-foreground" data-testid="th-bugap-source">Source</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analysisResult.perBuGaps.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="h-32 text-center text-muted-foreground" data-testid="text-no-bu-gaps">
                              No per-entity gaps detected. All applicable requirements are covered.
                            </TableCell>
                          </TableRow>
                        ) : (
                          analysisResult.perBuGaps.map((g, idx) => (
                            <TableRow key={`${g.businessUnitId}-${g.requirementId}`} data-testid={`row-bugap-${idx}`}>
                              <TableCell className="text-sm font-medium" data-testid={`text-bugap-bu-${idx}`}>
                                {g.businessUnitName}
                              </TableCell>
                              <TableCell className="font-mono text-sm" data-testid={`text-bugap-code-${idx}`}>
                                {g.code}
                              </TableCell>
                              <TableCell className="font-medium" data-testid={`text-bugap-title-${idx}`}>
                                {g.title}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground" data-testid={`text-bugap-source-${idx}`}>
                                {g.sourceName}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                <TabsContent value="over-strict" className="space-y-4">
                  <div className="border rounded-md" data-testid="over-strict-table">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="text-xs font-medium text-muted-foreground" data-testid="th-strict-req-code">Requirement Code</TableHead>
                          <TableHead className="text-xs font-medium text-muted-foreground" data-testid="th-strict-req-title">Requirement Title</TableHead>
                          <TableHead className="text-xs font-medium text-muted-foreground" data-testid="th-strict-document">Document</TableHead>
                          <TableHead className="text-xs font-medium text-muted-foreground" data-testid="th-strict-bu">Business Unit</TableHead>
                          <TableHead className="text-xs font-medium text-muted-foreground" data-testid="th-strict-source">Source</TableHead>
                          <TableHead className="text-xs font-medium text-muted-foreground" data-testid="th-strict-reason">Reason</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analysisResult.overStrictItems.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="h-32 text-center text-muted-foreground" data-testid="text-no-over-strict">
                              No over-strict implementations detected.
                            </TableCell>
                          </TableRow>
                        ) : (
                          analysisResult.overStrictItems.map((item, idx) => (
                            <TableRow key={`${item.requirementId}-${item.documentId}-${idx}`} data-testid={`row-strict-${idx}`}>
                              <TableCell className="font-mono text-sm font-medium" data-testid={`text-strict-code-${idx}`}>
                                {item.requirementCode}
                              </TableCell>
                              <TableCell className="font-medium" data-testid={`text-strict-title-${idx}`}>
                                {item.requirementTitle}
                              </TableCell>
                              <TableCell className="text-sm" data-testid={`text-strict-document-${idx}`}>
                                {item.documentTitle}
                              </TableCell>
                              <TableCell className="text-sm" data-testid={`text-strict-bu-${idx}`}>
                                {item.businessUnitName}
                              </TableCell>
                              <TableCell className="text-sm" data-testid={`text-strict-source-${idx}`}>
                                {item.sourceName}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground max-w-[300px]" data-testid={`text-strict-reason-${idx}`}>
                                {item.reason}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                {analysisResult.contentAnalysis && (
                  <TabsContent value="content-match" className="space-y-4">
                    <p className="text-sm text-muted-foreground" data-testid="text-content-match-info">
                      Document markdown content was analysed against requirement keywords. Mappings with a score {"\u2265"}60% are marked Covered, {"\u2265"}30% Partially Covered, below 30% Not Covered.
                      {analysisResult.summary.contentUpdatedCount ? ` ${analysisResult.summary.contentUpdatedCount} mapping status(es) were updated.` : ""}
                    </p>
                    <div className="border rounded-md" data-testid="content-match-table">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="text-xs font-medium text-muted-foreground" data-testid="th-cm-code">Requirement</TableHead>
                            <TableHead className="text-xs font-medium text-muted-foreground" data-testid="th-cm-document">Document</TableHead>
                            <TableHead className="text-xs font-medium text-muted-foreground" data-testid="th-cm-score">Score</TableHead>
                            <TableHead className="text-xs font-medium text-muted-foreground" data-testid="th-cm-prev">Previous</TableHead>
                            <TableHead className="text-xs font-medium text-muted-foreground" data-testid="th-cm-new">New Status</TableHead>
                            <TableHead className="text-xs font-medium text-muted-foreground" data-testid="th-cm-terms">Matched Terms</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {analysisResult.contentAnalysis.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={6} className="h-32 text-center text-muted-foreground" data-testid="text-no-content-match">
                                No mappings to analyse.
                              </TableCell>
                            </TableRow>
                          ) : (
                            analysisResult.contentAnalysis.map((item, idx) => (
                              <TableRow key={`${item.mappingId}-${idx}`} data-testid={`row-cm-${idx}`}>
                                <TableCell data-testid={`text-cm-code-${idx}`}>
                                  <div className="font-mono text-sm font-medium">{item.requirementCode}</div>
                                  <div className="text-xs text-muted-foreground truncate max-w-[200px]">{item.requirementTitle}</div>
                                </TableCell>
                                <TableCell className="text-sm" data-testid={`text-cm-doc-${idx}`}>
                                  {item.hasMarkdown ? item.documentTitle : (
                                    <span className="text-muted-foreground italic">{item.documentTitle} (no markdown)</span>
                                  )}
                                </TableCell>
                                <TableCell data-testid={`text-cm-score-${idx}`}>
                                  <div className="flex items-center gap-2">
                                    <div className="w-16 h-2 rounded-full bg-muted overflow-hidden">
                                      <div
                                        className={`h-full rounded-full ${item.matchScore >= 60 ? "bg-green-500 dark:bg-green-400" : item.matchScore >= 30 ? "bg-amber-500 dark:bg-amber-400" : "bg-red-500 dark:bg-red-400"}`}
                                        style={{ width: `${item.matchScore}%` }}
                                      />
                                    </div>
                                    <span className="text-xs font-medium">{item.matchScore}%</span>
                                  </div>
                                </TableCell>
                                <TableCell data-testid={`text-cm-prev-${idx}`}>
                                  <Badge className={`${getCoverageBadgeClass(item.previousStatus)} no-default-hover-elevate no-default-active-elevate`}>
                                    {item.previousStatus}
                                  </Badge>
                                </TableCell>
                                <TableCell data-testid={`text-cm-new-${idx}`}>
                                  <Badge className={`${getCoverageBadgeClass(item.newStatus)} no-default-hover-elevate no-default-active-elevate`}>
                                    {item.newStatus}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground max-w-[250px]" data-testid={`text-cm-terms-${idx}`}>
                                  {item.matchedTerms.length > 0
                                    ? item.matchedTerms.slice(0, 10).join(", ") + (item.matchedTerms.length > 10 ? ` +${item.matchedTerms.length - 10} more` : "")
                                    : "—"
                                  }
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>
                )}
              </>
            )}
          </Tabs>
        </>
      )}
    </div>
  );
}
