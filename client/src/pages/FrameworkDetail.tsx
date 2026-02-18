import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ExternalLink, CheckCircle2, AlertCircle, CircleDot, Search, PanelLeftClose, PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RegulatorySource, Requirement, RequirementMapping, Document as PolicyDocument } from "@shared/schema";

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

function getCoverageVariant(status: string) {
  switch (status) {
    case "Covered": return "default" as const;
    case "Partially Covered": return "secondary" as const;
    case "Not Covered": return "destructive" as const;
    default: return "outline" as const;
  }
}

function getBestStatus(reqMaps: RequirementMapping[]): string {
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

  const { data: source, isLoading: sourceLoading } = useQuery<RegulatorySource>({
    queryKey: [`/api/regulatory-sources/${sourceId}`],
  });

  const { data: allRequirements } = useQuery<Requirement[]>({
    queryKey: ["/api/requirements"],
  });

  const { data: allMappings } = useQuery<RequirementMapping[]>({
    queryKey: ["/api/requirement-mappings"],
  });

  const { data: allDocuments } = useQuery<PolicyDocument[]>({
    queryKey: ["/api/documents"],
  });

  const requirements = useMemo(() => {
    if (!allRequirements) return [];
    return allRequirements.filter((r) => r.sourceId === sourceId);
  }, [allRequirements, sourceId]);

  const reqIds = useMemo(() => new Set(requirements.map((r) => r.id)), [requirements]);

  const mappings = useMemo(() => {
    if (!allMappings) return [];
    return allMappings.filter((m) => reqIds.has(m.requirementId));
  }, [allMappings, reqIds]);

  const metrics = useMemo(() => {
    const total = requirements.length;
    if (total === 0) return { total: 0, covered: 0, partial: 0, notCovered: 0, coveragePercent: 0, mappedPercent: 0 };

    const coveredIds = new Set<number>();
    const partialIds = new Set<number>();
    const mappedReqIds = new Set<number>();

    for (const m of mappings) {
      mappedReqIds.add(m.requirementId);
      if (m.coverageStatus === "Covered") coveredIds.add(m.requirementId);
      else if (m.coverageStatus === "Partially Covered") partialIds.add(m.requirementId);
    }

    const covered = coveredIds.size;
    const partial = Array.from(partialIds).filter((id) => !coveredIds.has(id)).length;
    const notCovered = total - covered - partial;
    const coveragePercent = Math.round(((covered + partial * 0.5) / total) * 100);
    const mappedPercent = Math.round((mappedReqIds.size / total) * 100);

    return { total, covered, partial, notCovered, coveragePercent, mappedPercent };
  }, [requirements, mappings]);

  const reqMappingLookup = useMemo(() => {
    const lookup = new Map<number, RequirementMapping[]>();
    for (const m of mappings) {
      const list = lookup.get(m.requirementId) || [];
      list.push(m);
      lookup.set(m.requirementId, list);
    }
    return lookup;
  }, [mappings]);

  const linkedDocIds = useMemo(() => {
    const ids = new Set<number>();
    for (const m of mappings) ids.add(m.documentId);
    return ids;
  }, [mappings]);

  const linkedDocuments = useMemo(() => {
    if (!allDocuments) return [];
    return allDocuments.filter((d) => linkedDocIds.has(d.id));
  }, [allDocuments, linkedDocIds]);

  const reqCategories = useMemo(() => {
    return Array.from(new Set(requirements.map((r) => r.category))).sort();
  }, [requirements]);

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
    return filtered;
  }, [requirements, selectedCategory, searchQuery]);

  const groupedRequirements = useMemo(() => {
    const groups = new Map<string, Requirement[]>();
    for (const req of filteredRequirements) {
      const cat = req.category;
      const list = groups.get(cat) || [];
      list.push(req);
      groups.set(cat, list);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredRequirements]);

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
        <h1 className="text-2xl font-semibold tracking-tight mt-1" data-testid="text-framework-title">{source.name}</h1>
      </div>

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
                      of {source.shortName} requirements have policy coverage
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

              <Card data-testid="card-requirement-status">
                <CardContent className="pt-6 space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Requirements</h3>
                    <p className="text-3xl font-bold" data-testid="text-mapped-percent">{metrics.mappedPercent}%</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      of requirements have document mappings
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
                      {metrics.covered} out of {metrics.total} requirements in {source.shortName} are fully covered by mapped documents
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
                          <p className="text-sm text-muted-foreground py-3 pl-6">No documents linked to this framework's requirements.</p>
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
                                      <Badge variant="secondary" className="text-xs">{doc.taxonomy}</Badge>
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
                      <span className="text-xs text-muted-foreground">Requirements mapped</span>
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
                      <span className="text-xs font-medium">{linkedDocuments.length}/{metrics.total}</span>
                    </div>
                    <CoverageBar
                      percent={metrics.total > 0 ? Math.round((linkedDocuments.length / metrics.total) * 100) : 0}
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
          </div>

          <div className="flex gap-6">
            {showCategorySidebar && reqCategories.length > 0 && (
              <div className="hidden lg:block w-56 shrink-0 px-2" data-testid="controls-category-sidebar">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Requirement Categories</h3>
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
                    className={`w-full justify-start text-sm ${
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
                        className={`w-full justify-start text-sm ${
                          selectedCategory === cat ? "bg-accent font-medium" : "text-muted-foreground"
                        }`}
                        onClick={() => setSelectedCategory(cat)}
                        data-testid={`button-category-${cat}`}
                      >
                        {cat}
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

            <div className="flex-1 min-w-0 space-y-4">
              {groupedRequirements.length === 0 && (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  {searchQuery || selectedCategory ? "No controls match your filters." : "No requirements defined for this framework."}
                </p>
              )}
              {groupedRequirements.map(([category, reqs]) => (
                <Collapsible key={category} defaultOpen>
                  <CollapsibleTrigger className="flex flex-wrap items-center gap-2 w-full py-3 border-b text-left group" data-testid={`trigger-category-${category}`}>
                    <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-data-[state=closed]:-rotate-90" />
                    <span className="font-semibold text-base">{category}</span>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    {reqs.map((req) => {
                      const reqMaps = reqMappingLookup.get(req.id) || [];
                      const bestStatus = getBestStatus(reqMaps);
                      return (
                        <div key={req.id} className="border-b last:border-b-0" data-testid={`control-row-${req.id}`}>
                          <div className="py-3 px-2">
                            <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-mono text-xs text-muted-foreground">{req.code}</span>
                                <span className="text-sm font-medium">{req.title}</span>
                              </div>
                              <Badge variant={getCoverageVariant(bestStatus)} className="text-xs shrink-0">{bestStatus}</Badge>
                            </div>
                            {req.description && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{req.description}</p>
                            )}
                            {reqMaps.length > 0 && (
                              <div className="flex flex-wrap items-center gap-2 mt-2">
                                <span className="text-xs text-muted-foreground">Mapped documents:</span>
                                <span className="text-xs">{reqMaps.length}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
