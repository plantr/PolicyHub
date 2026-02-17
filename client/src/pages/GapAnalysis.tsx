import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { RequirementMapping, Requirement, Document, BusinessUnit } from "@shared/schema";
import { ShieldCheck, AlertTriangle, XCircle, ListChecks, RefreshCw, FileWarning, ShieldAlert, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
}

export default function GapAnalysis() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [buFilter, setBuFilter] = useState("all");
  const [analysisResult, setAnalysisResult] = useState<GapAnalysisResult | null>(null);
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
      const parts: string[] = [];
      if (data.summary.unmappedCount > 0) parts.push(`${data.summary.unmappedCount} unmapped`);
      if (data.summary.perBuGapCount > 0) parts.push(`${data.summary.perBuGapCount} per-entity gaps`);
      if (data.summary.overStrictCount > 0) parts.push(`${data.summary.overStrictCount} over-strict`);
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
  const coveredCount = allMappings.filter((m) => m.coverageStatus === "Covered").length;
  const partialCount = allMappings.filter((m) => m.coverageStatus === "Partially Covered").length;
  const notCoveredCount = allMappings.filter((m) => m.coverageStatus === "Not Covered").length;

  const filtered = allMappings.filter((m) => {
    if (statusFilter !== "all" && m.coverageStatus !== statusFilter) return false;
    if (buFilter !== "all" && String(m.businessUnitId ?? "") !== buFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6" data-testid="gap-analysis-page">
      <div className="flex flex-wrap items-start justify-between gap-3" data-testid="gap-analysis-header">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">Gap Analysis</h1>
          <p className="text-sm text-muted-foreground mt-1" data-testid="text-page-subtitle">Requirement coverage and compliance matrix</p>
        </div>
        <Button
          onClick={() => refreshMutation.mutate()}
          disabled={refreshMutation.isPending}
          data-testid="button-refresh-gap-analysis"
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${refreshMutation.isPending ? "animate-spin" : ""}`} />
          {refreshMutation.isPending ? "Analysing..." : "Refresh Analysis"}
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-6" data-testid="gap-analysis-skeleton">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}
          </div>
          <Skeleton className="h-10 w-full" />
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="summary-cards">
            <Card data-testid="stat-covered">
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm text-muted-foreground" data-testid="stat-covered-label">Covered</p>
                    <p className="text-2xl font-bold mt-1" data-testid="stat-covered-value">{analysisResult ? analysisResult.summary.coveredCount : coveredCount}</p>
                  </div>
                  <div className="p-2 rounded-md bg-green-100 dark:bg-green-900">
                    <ShieldCheck className="w-5 h-5 text-green-700 dark:text-green-300" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card data-testid="stat-partial">
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm text-muted-foreground" data-testid="stat-partial-label">Partially Covered</p>
                    <p className="text-2xl font-bold mt-1" data-testid="stat-partial-value">{analysisResult ? analysisResult.summary.partiallyCoveredCount : partialCount}</p>
                  </div>
                  <div className="p-2 rounded-md bg-amber-100 dark:bg-amber-900">
                    <AlertTriangle className="w-5 h-5 text-amber-700 dark:text-amber-300" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card data-testid="stat-not-covered">
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm text-muted-foreground" data-testid="stat-not-covered-label">Not Covered</p>
                    <p className="text-2xl font-bold mt-1" data-testid="stat-not-covered-value">{analysisResult ? analysisResult.summary.notCoveredCount : notCoveredCount}</p>
                  </div>
                  <div className="p-2 rounded-md bg-red-100 dark:bg-red-900">
                    <XCircle className="w-5 h-5 text-red-700 dark:text-red-300" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card data-testid="stat-total-mapped">
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm text-muted-foreground" data-testid="stat-total-mapped-label">Total Mapped</p>
                    <p className="text-2xl font-bold mt-1" data-testid="stat-total-mapped-value">{analysisResult ? analysisResult.summary.totalMapped : allMappings.length}</p>
                  </div>
                  <div className="p-2 rounded-md bg-muted">
                    <ListChecks className="w-5 h-5 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {analysisResult && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4" data-testid="analysis-extra-stats">
              <Card data-testid="stat-unmapped">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm text-muted-foreground" data-testid="stat-unmapped-label">Unmapped Requirements</p>
                      <p className="text-2xl font-bold mt-1" data-testid="stat-unmapped-value">{analysisResult.summary.unmappedCount}</p>
                      <p className="text-xs text-muted-foreground mt-1">of {analysisResult.summary.applicableRequirements} applicable</p>
                    </div>
                    <div className="p-2 rounded-md bg-red-100 dark:bg-red-900">
                      <FileWarning className="w-5 h-5 text-red-700 dark:text-red-300" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card data-testid="stat-bu-gaps">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm text-muted-foreground" data-testid="stat-bu-gaps-label">Per-Entity Gaps</p>
                      <p className="text-2xl font-bold mt-1" data-testid="stat-bu-gaps-value">{analysisResult.summary.perBuGapCount}</p>
                      <p className="text-xs text-muted-foreground mt-1">Applicable but unmapped per BU</p>
                    </div>
                    <div className="p-2 rounded-md bg-orange-100 dark:bg-orange-900">
                      <Building2 className="w-5 h-5 text-orange-700 dark:text-orange-300" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card data-testid="stat-over-strict">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm text-muted-foreground" data-testid="stat-over-strict-label">Over-Strict</p>
                      <p className="text-2xl font-bold mt-1" data-testid="stat-over-strict-value">{analysisResult.summary.overStrictCount}</p>
                      <p className="text-xs text-muted-foreground mt-1">Mapped to non-applicable sources</p>
                    </div>
                    <div className="p-2 rounded-md bg-blue-100 dark:bg-blue-900">
                      <ShieldAlert className="w-5 h-5 text-blue-700 dark:text-blue-300" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

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
                </>
              )}
            </TabsList>

            <TabsContent value="mappings" className="space-y-4">
              <div className="flex flex-wrap items-center gap-3" data-testid="filter-bar">
                <Select value={statusFilter} onValueChange={setStatusFilter} data-testid="select-coverage-status">
                  <SelectTrigger className="w-[200px]" data-testid="select-trigger-coverage-status">
                    <SelectValue placeholder="Coverage Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" data-testid="select-item-status-all">All Statuses</SelectItem>
                    <SelectItem value="Covered" data-testid="select-item-status-covered">Covered</SelectItem>
                    <SelectItem value="Partially Covered" data-testid="select-item-status-partial">Partially Covered</SelectItem>
                    <SelectItem value="Not Covered" data-testid="select-item-status-not-covered">Not Covered</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={buFilter} onValueChange={setBuFilter} data-testid="select-bu">
                  <SelectTrigger className="w-[200px]" data-testid="select-trigger-bu">
                    <SelectValue placeholder="Business Unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" data-testid="select-item-bu-all">All Business Units</SelectItem>
                    {(businessUnits ?? []).map((bu) => (
                      <SelectItem key={bu.id} value={String(bu.id)} data-testid={`select-item-bu-${bu.id}`}>{bu.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Card data-testid="gap-analysis-table-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead data-testid="th-req-code">Requirement Code</TableHead>
                      <TableHead data-testid="th-req-title">Requirement Title</TableHead>
                      <TableHead data-testid="th-document">Document</TableHead>
                      <TableHead data-testid="th-bu">Business Unit</TableHead>
                      <TableHead data-testid="th-coverage">Coverage Status</TableHead>
                      <TableHead data-testid="th-rationale">Rationale</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-32 text-center text-muted-foreground" data-testid="text-no-mappings">
                          No mappings found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filtered.map((m) => {
                        const req = reqMap.get(m.requirementId);
                        const doc = docMap.get(m.documentId);
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
              </Card>
            </TabsContent>

            {analysisResult && (
              <>
                <TabsContent value="unmapped" className="space-y-4">
                  <p className="text-sm text-muted-foreground" data-testid="text-unmapped-description">
                    Requirements from enabled regulatory sources that have no document mapping. These are compliance gaps requiring attention.
                  </p>
                  <Card data-testid="unmapped-table-card">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead data-testid="th-unmapped-code">Code</TableHead>
                          <TableHead data-testid="th-unmapped-title">Title</TableHead>
                          <TableHead data-testid="th-unmapped-category">Category</TableHead>
                          <TableHead data-testid="th-unmapped-source">Source</TableHead>
                          <TableHead data-testid="th-unmapped-article">Article</TableHead>
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
                  </Card>
                </TabsContent>

                <TabsContent value="bu-gaps" className="space-y-4">
                  <p className="text-sm text-muted-foreground" data-testid="text-bu-gaps-description">
                    Requirements applicable to a specific business unit (via its regulatory profile) that lack a mapping for that entity. Group-level mappings (no BU) are included.
                  </p>
                  <Card data-testid="bu-gaps-table-card">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead data-testid="th-bugap-bu">Business Unit</TableHead>
                          <TableHead data-testid="th-bugap-code">Requirement Code</TableHead>
                          <TableHead data-testid="th-bugap-title">Requirement Title</TableHead>
                          <TableHead data-testid="th-bugap-source">Source</TableHead>
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
                  </Card>
                </TabsContent>

                <TabsContent value="over-strict" className="space-y-4">
                  <p className="text-sm text-muted-foreground" data-testid="text-over-strict-description">
                    Mappings where the requirement comes from a source not enabled in the business unit's regulatory profile. This may indicate over-strict implementation beyond what is required.
                  </p>
                  <Card data-testid="over-strict-table-card">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead data-testid="th-strict-req-code">Requirement Code</TableHead>
                          <TableHead data-testid="th-strict-req-title">Requirement Title</TableHead>
                          <TableHead data-testid="th-strict-document">Document</TableHead>
                          <TableHead data-testid="th-strict-bu">Business Unit</TableHead>
                          <TableHead data-testid="th-strict-source">Source</TableHead>
                          <TableHead data-testid="th-strict-reason">Reason</TableHead>
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
                  </Card>
                </TabsContent>
              </>
            )}
          </Tabs>
        </>
      )}
    </div>
  );
}
