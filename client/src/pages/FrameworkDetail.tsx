import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ExternalLink, CheckCircle2, AlertCircle, CircleDot } from "lucide-react";
import type { RegulatorySource, Requirement, RequirementMapping, Document as PolicyDocument } from "@shared/schema";

function CoverageBar({ percent, color }: { percent: number; color: string }) {
  return (
    <div className="flex items-center gap-3 w-full">
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
          <span className="w-2.5 h-2.5 rounded-full bg-primary inline-block" />
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

export default function FrameworkDetail({ params }: { params: { id: string } }) {
  const sourceId = Number(params.id);

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
    <div className="space-y-6" data-testid="framework-detail-page">
      <div>
        <Link href="/sources" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-back-frameworks">
          Frameworks
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight mt-1" data-testid="text-framework-title">{source.name}</h1>
      </div>

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
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">Fully Covered</span>
                  </div>
                  <CoverageBar
                    percent={metrics.total > 0 ? Math.round((metrics.covered / metrics.total) * 100) : 0}
                    color="bg-emerald-500 dark:bg-emerald-400"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
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
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
                    <span className="text-sm">Covered</span>
                  </div>
                  <span className="text-sm font-medium" data-testid="text-covered-count">{metrics.covered}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CircleDot className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                    <span className="text-sm">Partial</span>
                  </div>
                  <span className="text-sm font-medium" data-testid="text-partial-count">{metrics.partial}</span>
                </div>
                <div className="flex items-center justify-between">
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
                <Collapsible defaultOpen>
                  <CollapsibleTrigger className="flex items-center gap-2 w-full py-3 border-t text-left group" data-testid="trigger-requirements-list">
                    <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-data-[state=closed]:-rotate-90" />
                    <span className="font-medium text-sm">Requirements ({requirements.length})</span>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    {requirements.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-3 pl-6">No requirements defined for this framework.</p>
                    ) : (
                      <div className="border rounded-md overflow-hidden mb-4">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[100px]">Code</TableHead>
                              <TableHead>Title</TableHead>
                              <TableHead className="w-[120px]">Category</TableHead>
                              <TableHead className="w-[130px]">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {requirements.map((req) => {
                              const reqMaps = reqMappingLookup.get(req.id) || [];
                              const bestStatus = reqMaps.length === 0
                                ? "Not Covered"
                                : reqMaps.some((m) => m.coverageStatus === "Covered")
                                  ? "Covered"
                                  : reqMaps.some((m) => m.coverageStatus === "Partially Covered")
                                    ? "Partially Covered"
                                    : "Not Covered";
                              return (
                                <TableRow key={req.id} data-testid={`row-requirement-${req.id}`}>
                                  <TableCell className="font-mono text-xs">{req.code}</TableCell>
                                  <TableCell>
                                    <span className="text-sm">{req.title}</span>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="text-xs">{req.category}</Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={getCoverageVariant(bestStatus)} className="text-xs">{bestStatus}</Badge>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>

                <Collapsible>
                  <CollapsibleTrigger className="flex items-center gap-2 w-full py-3 border-t text-left group" data-testid="trigger-linked-documents">
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

                <Collapsible>
                  <CollapsibleTrigger className="flex items-center gap-2 w-full py-3 border-t text-left group" data-testid="trigger-requirement-categories">
                    <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-data-[state=closed]:-rotate-90" />
                    <span className="font-medium text-sm">Requirement Categories ({reqCategories.length})</span>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    {reqCategories.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-3 pl-6">No requirement categories.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2 py-3 pl-6">
                        {reqCategories.map((cat) => {
                          const count = requirements.filter((r) => r.category === cat).length;
                          return (
                            <Badge key={cat} variant="outline" data-testid={`badge-req-category-${cat}`}>
                              {cat} ({count})
                            </Badge>
                          );
                        })}
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>

                {source.jurisdiction && (
                  <Collapsible>
                    <CollapsibleTrigger className="flex items-center gap-2 w-full py-3 border-t text-left group" data-testid="trigger-jurisdiction-info">
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
    </div>
  );
}
