import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
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
import type { ControlMapping, Control, Document, BusinessUnit, RegulatorySource } from "@shared/schema";
import { Search, ChevronDown, ChevronLeft, ChevronRight, Wand2, ArrowUpDown, ArrowUp, ArrowDown, Sparkles } from "lucide-react";
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

export default function GapAnalysis() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [buFilter, setBuFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortColumn, setSortColumn] = useState<string | null>("aiMatch");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: mappings, isLoading: mappingsLoading } = useQuery<ControlMapping[]>({
    queryKey: ["/api/control-mappings"],
  });
  const { data: requirements, isLoading: reqLoading } = useQuery<Control[]>({
    queryKey: ["/api/controls"],
  });
  const { data: documents, isLoading: docLoading } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
  });
  const { data: businessUnits, isLoading: buLoading } = useQuery<BusinessUnit[]>({
    queryKey: ["/api/business-units"],
  });
  const { data: sources } = useQuery<RegulatorySource[]>({
    queryKey: ["/api/regulatory-sources"],
  });

  const autoMapMutation = useMutation({
    mutationFn: async (sourceId?: number) => {
      const res = await fetch("/api/gap-analysis/auto-map", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId }),
      });
      if (!res.ok) throw new Error("Auto-mapping failed");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/control-mappings"] });
      toast({
        title: "Auto-mapping complete",
        description: `${data.created} new mappings created from ${data.docsAnalysed} documents. ${data.matched} controls matched, ${data.unmatched} unmatched.`,
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
      if (m.documentId == null) return false;
      if (statusFilter !== "all" && m.coverageStatus !== statusFilter) return false;
      if (buFilter !== "all" && String(m.businessUnitId ?? "") !== buFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const req = reqMap.get(m.controlId);
        const doc = m.documentId != null ? docMap.get(m.documentId) : undefined;
        const code = (req?.code ?? "").toLowerCase();
        const title = (req?.title ?? "").toLowerCase();
        const docTitle = (doc?.title ?? "").toLowerCase();
        if (!code.includes(q) && !title.includes(q) && !docTitle.includes(q)) return false;
      }
      return true;
    });
  }, [allMappings, statusFilter, buFilter, searchQuery, reqMap, docMap]);

  function toggleSort(col: string) {
    if (sortColumn === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(col);
      setSortDir("asc");
    }
    setCurrentPage(1);
  }

  function SortIcon({ col }: { col: string }) {
    if (sortColumn !== col) return <ArrowUpDown className="inline ml-1 h-3 w-3 text-muted-foreground/50" />;
    return sortDir === "asc"
      ? <ArrowUp className="inline ml-1 h-3 w-3" />
      : <ArrowDown className="inline ml-1 h-3 w-3" />;
  }

  const sorted = useMemo(() => {
    if (!sortColumn) return filtered;
    const dir = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      let va: string | number = "";
      let vb: string | number = "";
      switch (sortColumn) {
        case "code": {
          va = (reqMap.get(a.controlId)?.code ?? "").toLowerCase();
          vb = (reqMap.get(b.controlId)?.code ?? "").toLowerCase();
          break;
        }
        case "title": {
          va = (reqMap.get(a.controlId)?.title ?? "").toLowerCase();
          vb = (reqMap.get(b.controlId)?.title ?? "").toLowerCase();
          break;
        }
        case "document": {
          va = (a.documentId != null ? docMap.get(a.documentId)?.title ?? "" : "").toLowerCase();
          vb = (b.documentId != null ? docMap.get(b.documentId)?.title ?? "" : "").toLowerCase();
          break;
        }
        case "bu": {
          va = (a.businessUnitId ? buMap.get(a.businessUnitId)?.name ?? "" : "Group").toLowerCase();
          vb = (b.businessUnitId ? buMap.get(b.businessUnitId)?.name ?? "" : "Group").toLowerCase();
          break;
        }
        case "coverage": {
          const order: Record<string, number> = { "Covered": 0, "Partially Covered": 1, "Not Covered": 2 };
          va = order[a.coverageStatus] ?? 3;
          vb = order[b.coverageStatus] ?? 3;
          break;
        }
        case "matchPct": {
          const extractPct = (r: string | null) => {
            const m = r?.match(/\((\d+)%\)/);
            return m ? parseInt(m[1], 10) : -1;
          };
          va = extractPct(a.rationale);
          vb = extractPct(b.rationale);
          break;
        }
        case "aiMatch": {
          va = a.aiMatchScore ?? -1;
          vb = b.aiMatchScore ?? -1;
          break;
        }
      }
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
  }, [filtered, sortColumn, sortDir, reqMap, docMap, buMap]);

  const totalResults = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / pageSize));
  const paginatedMappings = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);
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

        <div className="ml-auto flex items-center gap-2 flex-wrap">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                disabled={autoMapMutation.isPending}
                data-testid="button-auto-map"
              >
                <Wand2 className={`h-4 w-4 mr-1 ${autoMapMutation.isPending ? "animate-spin" : ""}`} />
                {autoMapMutation.isPending ? "Mapping..." : "Auto-Map Controls"}
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => autoMapMutation.mutate(undefined)} data-testid="menu-automap-all">
                All Frameworks
              </DropdownMenuItem>
              {(sources ?? []).map((s) => (
                <DropdownMenuItem key={s.id} onClick={() => autoMapMutation.mutate(s.id)} data-testid={`menu-automap-${s.id}`}>
                  {s.shortName}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
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
                Mappings ({allMappings.filter((m) => m.documentId != null).length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="mappings" className="space-y-4">
              <div className="border rounded-md" data-testid="gap-analysis-table">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-xs font-medium text-muted-foreground cursor-pointer select-none" onClick={() => toggleSort("code")} data-testid="th-req-code">Control Code<SortIcon col="code" /></TableHead>
                      <TableHead className="text-xs font-medium text-muted-foreground cursor-pointer select-none" onClick={() => toggleSort("title")} data-testid="th-req-title">Control Title<SortIcon col="title" /></TableHead>
                      <TableHead className="text-xs font-medium text-muted-foreground cursor-pointer select-none" onClick={() => toggleSort("document")} data-testid="th-document">Document<SortIcon col="document" /></TableHead>
                      <TableHead className="text-xs font-medium text-muted-foreground cursor-pointer select-none" onClick={() => toggleSort("bu")} data-testid="th-bu">Business Unit<SortIcon col="bu" /></TableHead>
                      <TableHead className="text-xs font-medium text-muted-foreground cursor-pointer select-none" onClick={() => toggleSort("coverage")} data-testid="th-coverage">Coverage<SortIcon col="coverage" /></TableHead>
                      <TableHead className="text-xs font-medium text-muted-foreground cursor-pointer select-none" onClick={() => toggleSort("matchPct")} data-testid="th-match-pct">Match %<SortIcon col="matchPct" /></TableHead>
                      <TableHead className="text-xs font-medium text-muted-foreground cursor-pointer select-none" onClick={() => toggleSort("aiMatch")} data-testid="th-ai-match"><Sparkles className="inline h-3 w-3 mr-0.5 text-purple-500 dark:text-purple-400" />AI %<SortIcon col="aiMatch" /></TableHead>
                      <TableHead className="text-xs font-medium text-muted-foreground" data-testid="th-rationale">Rationale</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedMappings.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="h-32 text-center text-muted-foreground" data-testid="text-no-mappings">
                          No mappings found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedMappings.map((m) => {
                        const req = reqMap.get(m.controlId);
                        const doc = m.documentId != null ? docMap.get(m.documentId) : undefined;
                        const bu = m.businessUnitId ? buMap.get(m.businessUnitId) : null;
                        const pctMatch = m.rationale?.match(/\((\d+)%\)/);
                        const pct = pctMatch ? parseInt(pctMatch[1], 10) : null;
                        return (
                          <TableRow key={m.id} className="cursor-pointer" onClick={() => navigate(`/controls/${m.controlId}`)} data-testid={`row-mapping-${m.id}`}>
                            <TableCell className="font-mono text-sm font-medium" data-testid={`text-req-code-${m.id}`}>
                              {req?.code ?? `CTRL-${m.controlId}`}
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
                            <TableCell data-testid={`text-match-pct-${m.id}`}>
                              {pct !== null ? (
                                <div className="flex items-center gap-1.5">
                                  <svg width="24" height="24" viewBox="0 0 36 36">
                                    <circle
                                      cx="18" cy="18" r="14"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="4"
                                      className="text-muted"
                                    />
                                    <circle
                                      cx="18" cy="18" r="14"
                                      fill="none"
                                      strokeWidth="4"
                                      strokeLinecap="round"
                                      strokeDasharray={`${(pct / 100) * 87.96} ${87.96}`}
                                      transform="rotate(-90 18 18)"
                                      className={pct >= 45 ? "stroke-green-500 dark:stroke-green-400" : pct >= 30 ? "stroke-amber-500 dark:stroke-amber-400" : "stroke-gray-400 dark:stroke-gray-500"}
                                    />
                                  </svg>
                                  <span className="text-xs font-medium">{pct}%</span>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell data-testid={`text-ai-match-${m.id}`}>
                              {m.aiMatchScore != null ? (
                                <div className="flex items-center gap-1.5">
                                  <svg width="24" height="24" viewBox="0 0 36 36">
                                    <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" strokeWidth="4" className="text-muted" />
                                    <circle
                                      cx="18" cy="18" r="14" fill="none" strokeWidth="4" strokeLinecap="round"
                                      strokeDasharray={`${(m.aiMatchScore / 100) * 87.96} ${87.96}`}
                                      transform="rotate(-90 18 18)"
                                      className={m.aiMatchScore >= 60 ? "stroke-purple-500 dark:stroke-purple-400" : m.aiMatchScore >= 40 ? "stroke-amber-500 dark:stroke-amber-400" : "stroke-gray-400 dark:stroke-gray-500"}
                                    />
                                  </svg>
                                  <span className="text-xs font-medium">{m.aiMatchScore}%</span>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
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
          </Tabs>
        </>
      )}
    </div>
  );
}
