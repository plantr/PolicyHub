import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { X, CheckCircle2, XCircle, Plus, Trash2, Sparkles, Loader2, StopCircle } from "lucide-react";
import type { Control, RegulatorySource, ControlMapping, Document as PolicyDocument } from "@shared/schema";
import { useAiJob, useCancelAiJob, persistJobId, getPersistedJobId, clearPersistedJobId } from "@/hooks/use-ai-job";

const linkDocFormSchema = z.object({
  documentId: z.coerce.number().min(1, "Document is required"),
  coverageStatus: z.enum(["Covered", "Partially Covered", "Not Covered"]),
  rationale: z.string().optional(),
});

type LinkDocFormValues = z.infer<typeof linkDocFormSchema>;

export default function ControlDetail() {
  const [, params] = useRoute("/controls/:id");
  const [, navigate] = useLocation();
  const controlId = Number(params?.id);
  const { toast } = useToast();
  const [linkDocOpen, setLinkDocOpen] = useState(false);

  const linkDocForm = useForm<LinkDocFormValues>({
    resolver: zodResolver(linkDocFormSchema),
    defaultValues: { documentId: 0, coverageStatus: "Covered", rationale: "" },
  });

  const { data: control, isLoading: controlLoading } = useQuery<Control>({
    queryKey: ["/api/controls", controlId],
    enabled: !!controlId,
    queryFn: async () => {
      const res = await fetch(`/api/controls?id=${controlId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
  });

  const { data: sources } = useQuery<RegulatorySource[]>({
    queryKey: ["/api/regulatory-sources"],
  });

  const { data: allMappings } = useQuery<ControlMapping[]>({
    queryKey: ["/api/control-mappings"],
  });

  const { data: allDocuments } = useQuery<PolicyDocument[]>({
    queryKey: ["/api/documents"],
  });

  const source = useMemo(() => {
    if (!control || !sources) return null;
    return sources.find((s) => s.id === control.sourceId) ?? null;
  }, [control, sources]);

  const mappings = useMemo(() => {
    if (!allMappings) return [];
    return allMappings.filter((m) => m.controlId === controlId);
  }, [allMappings, controlId]);

  const documentMap = useMemo(
    () => new Map((allDocuments ?? []).map((d) => [d.id, d])),
    [allDocuments]
  );

  const mappedDocIds = useMemo(
    () => new Set(mappings.map((m) => m.documentId)),
    [mappings]
  );

  const unmappedDocuments = useMemo(
    () => (allDocuments ?? []).filter((d) => !mappedDocIds.has(d.id)),
    [allDocuments, mappedDocIds]
  );

  const mappedDocuments = useMemo(() => {
    return mappings
      .map((m) => ({ mapping: m, document: m.documentId ? documentMap.get(m.documentId) : undefined }))
      .filter((entry) => entry.document);
  }, [mappings, documentMap]);

  const bestStatus = useMemo(() => {
    if (mappings.length === 0) return "Not Covered";
    if (mappings.some((m) => m.coverageStatus === "Covered")) return "Covered";
    if (mappings.some((m) => m.coverageStatus === "Partially Covered")) return "Partially Covered";
    return "Not Covered";
  }, [mappings]);

  const coveredCount = mappings.filter((m) => m.coverageStatus === "Covered" || m.coverageStatus === "Partially Covered").length;

  const bestAiPct = useMemo(() => {
    let best = -1;
    for (const m of mappings) {
      if (m.aiMatchScore != null && m.aiMatchScore > best) best = m.aiMatchScore;
    }
    return best >= 0 ? best : null;
  }, [mappings]);

  const createMappingMutation = useMutation({
    mutationFn: async (data: { documentId: number; coverageStatus: string; rationale?: string }) => {
      const res = await apiRequest("POST", "/api/control-mappings", {
        controlId: controlId,
        documentId: data.documentId,
        coverageStatus: data.coverageStatus,
        rationale: data.rationale || null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/control-mappings"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMappingMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/control-mappings/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/control-mappings"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const [aiAnalysingId, setAiAnalysingId] = useState<number | null>(null);
  const [aiCoverageRunning, setAiCoverageRunning] = useState(false);
  const [coverageJobId, setCoverageJobId] = useState<string | null>(null);
  const [matchJobId, setMatchJobId] = useState<string | null>(null);

  const coverageJob = useAiJob(coverageJobId);
  const matchJob = useAiJob(matchJobId);
  const cancelJob = useCancelAiJob();

  const coverageStorageKey = `coverage:${controlId}`;
  const matchStorageKey = `match:${controlId}`;

  // Restore jobs on mount from localStorage
  useEffect(() => {
    const savedCoverage = getPersistedJobId(coverageStorageKey);
    if (savedCoverage) { setCoverageJobId(savedCoverage); setAiCoverageRunning(true); }
    const savedMatch = getPersistedJobId(matchStorageKey);
    if (savedMatch) setMatchJobId(savedMatch);
  }, [coverageStorageKey, matchStorageKey]);

  // Track which statuses we've already handled to avoid duplicate toasts
  const handledCoverageJobRef = useRef<string | null>(null);
  const handledMatchJobRef = useRef<string | null>(null);

  useEffect(() => {
    if (!coverageJob.data || !coverageJobId || handledCoverageJobRef.current === coverageJobId) return;
    if (coverageJob.data.status === "completed") {
      handledCoverageJobRef.current = coverageJobId;
      clearPersistedJobId(coverageStorageKey);
      setAiCoverageRunning(false);
      setCoverageJobId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/controls", controlId] });
      queryClient.invalidateQueries({ queryKey: ["/api/controls"] });
      const result = coverageJob.data.result;
      toast({ title: "AI Coverage Analysis Complete", description: `Combined score: ${result?.combinedAiScore ?? "?"}%` });
    } else if (coverageJob.data.status === "failed") {
      handledCoverageJobRef.current = coverageJobId;
      clearPersistedJobId(coverageStorageKey);
      setAiCoverageRunning(false);
      setCoverageJobId(null);
      toast({ title: "AI Coverage Failed", description: coverageJob.data.errorMessage || "Unknown error", variant: "destructive" });
    } else if (coverageJob.data.status === "cancelled") {
      handledCoverageJobRef.current = coverageJobId;
      clearPersistedJobId(coverageStorageKey);
      setAiCoverageRunning(false);
      setCoverageJobId(null);
      toast({ title: "AI Coverage Cancelled" });
    }
  }, [coverageJob.data, coverageJobId]);

  useEffect(() => {
    if (!matchJob.data || !matchJobId || handledMatchJobRef.current === matchJobId) return;
    if (matchJob.data.status === "completed") {
      handledMatchJobRef.current = matchJobId;
      clearPersistedJobId(matchStorageKey);
      setAiAnalysingId(null);
      setMatchJobId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/control-mappings"] });
      const result = matchJob.data.result;
      toast({ title: "AI Analysis Complete", description: `Match score: ${result?.aiMatchScore ?? "?"}%` });
    } else if (matchJob.data.status === "failed") {
      handledMatchJobRef.current = matchJobId;
      clearPersistedJobId(matchStorageKey);
      setAiAnalysingId(null);
      setMatchJobId(null);
      toast({ title: "AI Analysis Failed", description: matchJob.data.errorMessage || "Unknown error", variant: "destructive" });
    } else if (matchJob.data.status === "cancelled") {
      handledMatchJobRef.current = matchJobId;
      clearPersistedJobId(matchStorageKey);
      setAiAnalysingId(null);
      setMatchJobId(null);
      toast({ title: "AI Analysis Cancelled" });
    }
  }, [matchJob.data, matchJobId]);

  const aiCoverageMutation = useMutation({
    mutationFn: async () => {
      setAiCoverageRunning(true);
      const res = await apiRequest("POST", `/api/ai-jobs?action=coverage&controlId=${controlId}`);
      return res.json() as Promise<{ jobId: string }>;
    },
    onSuccess: (data) => {
      persistJobId(coverageStorageKey, data.jobId);
      setCoverageJobId(data.jobId);
    },
    onError: (err: Error) => {
      setAiCoverageRunning(false);
      toast({ title: "AI Coverage Failed", description: err.message, variant: "destructive" });
    },
  });

  const aiMatchMutation = useMutation({
    mutationFn: async (mappingId: number) => {
      setAiAnalysingId(mappingId);
      const res = await apiRequest("POST", `/api/gap-analysis?action=ai-match&mappingId=${mappingId}`);
      return res.json() as Promise<{ jobId: string }>;
    },
    onSuccess: (data) => {
      persistJobId(matchStorageKey, data.jobId);
      setMatchJobId(data.jobId);
    },
    onError: (err: Error) => {
      setAiAnalysingId(null);
      toast({ title: "AI Analysis Failed", description: err.message, variant: "destructive" });
    },
  });

  function onLinkDoc(values: LinkDocFormValues) {
    createMappingMutation.mutate(
      { documentId: values.documentId, coverageStatus: values.coverageStatus, rationale: values.rationale },
      {
        onSuccess: () => {
          toast({ title: "Document linked" });
          setLinkDocOpen(false);
          linkDocForm.reset({ documentId: 0, coverageStatus: "Covered", rationale: "" });
        },
      }
    );
  }

  if (controlLoading) {
    return (
      <div className="space-y-6" data-testid="control-detail-loading">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!control) {
    return (
      <div className="space-y-4" data-testid="control-detail-not-found">
        <div className="flex justify-end">
          <Button size="icon" variant="ghost" onClick={() => window.history.length > 1 ? window.history.back() : navigate("/controls")} data-testid="button-close">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-muted-foreground">Control not found.</p>
      </div>
    );
  }

  const statusVariant = bestStatus === "Covered" ? "default" as const
    : bestStatus === "Partially Covered" ? "secondary" as const
    : "destructive" as const;

  return (
    <div className="space-y-6" data-testid="control-detail-page">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-control-title">
            {control.title}
          </h1>
          {control.description && (
            <p className="text-muted-foreground mt-2 max-w-2xl" data-testid="text-control-description">
              {control.description}
            </p>
          )}
        </div>
        <Button size="icon" variant="ghost" onClick={() => window.history.length > 1 ? window.history.back() : navigate("/controls")} data-testid="button-close">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-[auto_1fr] gap-x-8 gap-y-3 text-sm max-w-lg" data-testid="control-metadata">
        <span className="text-muted-foreground">ID</span>
        <span className="font-medium" data-testid="text-meta-id">{control.code}</span>

        <span className="text-muted-foreground">Source</span>
        <span className="font-medium" data-testid="text-meta-source">
          {source ? (
            <Link href={`/sources/${source.id}`} className="hover:underline">
              {source.shortName}
            </Link>
          ) : (
            "--"
          )}
        </span>

        <span className="text-muted-foreground">Domain</span>
        <span className="font-medium" data-testid="text-meta-domain">{control.category}</span>

        <span className="text-muted-foreground">Owner</span>
        <span className="font-medium" data-testid="text-meta-owner">{control.owner || "--"}</span>

        <span className="text-muted-foreground">Evidence Status</span>
        <span data-testid="badge-meta-evidence-status">
          {control.evidenceStatus ? (
            <Badge variant={control.evidenceStatus === "Complete" ? "default" : control.evidenceStatus === "In Progress" ? "secondary" : "outline"}>
              {control.evidenceStatus}
            </Badge>
          ) : "--"}
        </span>

        <span className="text-muted-foreground">Status</span>
        <span data-testid="badge-meta-status">
          <Badge variant={statusVariant}>{bestStatus}</Badge>
        </span>
      </div>

      <Tabs defaultValue="mapped" className="w-full" data-testid="control-tabs">
        <TabsList data-testid="control-tabs-list">
          <TabsTrigger value="mapped" data-testid="tab-mapped-elements">Mapped elements</TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="mapped" className="mt-6 space-y-6">
          {mappedDocuments.length > 0 && (
            <Card data-testid="card-coverage-summary">
              <CardContent className="pt-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-4">
                    {(() => {
                      const score = control?.combinedAiScore;
                      const hasScore = score !== null && score !== undefined;
                      const displayPct = hasScore ? score : (bestAiPct ?? 0);
                      const strokeColor = displayPct >= 80 ? "stroke-green-500 dark:stroke-green-400" : displayPct >= 60 ? "stroke-amber-500 dark:stroke-amber-400" : "stroke-gray-400 dark:stroke-gray-500";
                      return (
                        <svg width="56" height="56" viewBox="0 0 36 36" data-testid="coverage-circle">
                          <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" strokeWidth="3" className="text-muted" />
                          <circle
                            cx="18" cy="18" r="14" fill="none" strokeWidth="3" strokeLinecap="round"
                            strokeDasharray={`${(displayPct / 100) * 87.96} ${87.96}`}
                            transform="rotate(-90 18 18)"
                            className={strokeColor}
                          />
                          <text x="18" y="19" textAnchor="middle" dominantBaseline="central" className="fill-current text-[7px] font-semibold">{displayPct}%</text>
                        </svg>
                      );
                    })()}
                    <div>
                      <p className="text-sm font-semibold" data-testid="text-coverage-label">
                        {control?.combinedAiScore !== null && control?.combinedAiScore !== undefined ? "AI Coverage Score" : "Best AI Match"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {control?.combinedAiScore !== null && control?.combinedAiScore !== undefined
                          ? `Combined AI assessment across ${mappedDocuments.length} linked document${mappedDocuments.length !== 1 ? "s" : ""}`
                          : `Best individual AI score across ${mappedDocuments.length} linked document${mappedDocuments.length !== 1 ? "s" : ""}`}
                      </p>
                    </div>
                  </div>
                  {aiCoverageRunning ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => coverageJobId && cancelJob.mutate(coverageJobId)}
                      data-testid="button-ai-coverage"
                    >
                      <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                      {coverageJob.data?.progressMessage || "Analysing..."}
                      <X className="h-3.5 w-3.5 ml-1.5" />
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => aiCoverageMutation.mutate()}
                      data-testid="button-ai-coverage"
                    >
                      <Sparkles className="h-4 w-4 mr-1.5 text-purple-500" />
                      AI Assess Coverage
                    </Button>
                  )}
                </div>
                {control?.combinedAiRationale && (
                  <div className="mt-4 border-l-2 border-purple-300 dark:border-purple-600 pl-3 space-y-2">
                    <p className="text-xs text-muted-foreground">{control.combinedAiRationale}</p>
                    {control.combinedAiRecommendations && (
                      <div className="border border-purple-200 dark:border-purple-700 rounded-md p-2 bg-purple-50/50 dark:bg-purple-950/30">
                        <p className="text-xs font-medium text-purple-700 dark:text-purple-300 mb-0.5">Recommendations</p>
                        <p className="text-xs text-muted-foreground">{control.combinedAiRecommendations}</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card data-testid="card-documents-section">
            <CardContent className="pt-6">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-base font-semibold">Linked Documents</h3>
                  <Badge variant="outline" className="text-xs" data-testid="badge-doc-count">
                    {mappedDocuments.length}
                  </Badge>
                </div>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => setLinkDocOpen(true)}
                  data-testid="button-link-document"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {mappedDocuments.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4" data-testid="text-no-documents">
                  No documents linked to this control yet.
                </p>
              ) : (
                <div className="divide-y">
                  {mappedDocuments.map(({ mapping, document: doc }) => {
                    const coverageColor = mapping.coverageStatus === "Covered"
                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                      : mapping.coverageStatus === "Partially Covered"
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                        : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
                    const aiPct = mapping.aiMatchScore;
                    const aiStrokeColor = aiPct != null
                      ? (aiPct >= 60 ? "stroke-purple-500 dark:stroke-purple-400" : aiPct >= 40 ? "stroke-amber-500 dark:stroke-amber-400" : "stroke-gray-400 dark:stroke-gray-500")
                      : "";
                    return (
                      <div
                        key={mapping.id}
                        className="py-4 space-y-3"
                        data-testid={`row-mapped-doc-${mapping.id}`}
                      >
                        <div className="flex flex-wrap items-center gap-3">
                          {aiPct != null ? (
                            <div className="flex items-center gap-1.5 shrink-0" data-testid={`ai-match-pct-${mapping.id}`}>
                              <svg width="28" height="28" viewBox="0 0 36 36">
                                <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" strokeWidth="4" className="text-muted" />
                                <circle
                                  cx="18" cy="18" r="14" fill="none" strokeWidth="4" strokeLinecap="round"
                                  strokeDasharray={`${(aiPct / 100) * 87.96} ${87.96}`}
                                  transform="rotate(-90 18 18)"
                                  className={aiStrokeColor}
                                />
                              </svg>
                              <span className="text-sm font-semibold">{aiPct}%</span>
                            </div>
                          ) : (
                            mapping.coverageStatus === "Covered" ? (
                              <CheckCircle2 className="h-5 w-5 text-emerald-500 dark:text-emerald-400 shrink-0" />
                            ) : (
                              <XCircle className="h-5 w-5 text-destructive shrink-0" />
                            )
                          )}
                          <div className="flex-1 min-w-0">
                            <Link
                              href={`/documents/${doc!.id}`}
                              className="text-sm font-medium hover:underline"
                              data-testid={`link-doc-${doc!.id}`}
                            >
                              {doc!.title}
                            </Link>
                            <div className="flex flex-wrap items-center gap-2 mt-0.5">
                              <Badge variant="secondary" className={`border-0 text-xs ${coverageColor}`} data-testid={`badge-coverage-${mapping.id}`}>
                                {mapping.coverageStatus}
                              </Badge>
                              {doc!.owner && (
                                <span className="text-xs text-muted-foreground">Owner: {doc!.owner}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {aiAnalysingId === mapping.id && matchJobId ? (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="text-muted-foreground"
                                onClick={(e) => { e.stopPropagation(); cancelJob.mutate(matchJobId); }}
                                data-testid={`button-ai-match-${mapping.id}`}
                                title="Cancel AI analysis"
                              >
                                <Loader2 className="h-4 w-4 animate-spin" />
                              </Button>
                            ) : (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="text-muted-foreground"
                                disabled={aiAnalysingId != null}
                                onClick={(e) => { e.stopPropagation(); aiMatchMutation.mutate(mapping.id); }}
                                data-testid={`button-ai-match-${mapping.id}`}
                                title="Run AI analysis"
                              >
                                <Sparkles className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-muted-foreground"
                              onClick={() => deleteMappingMutation.mutate(mapping.id)}
                              data-testid={`button-unlink-doc-${mapping.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        {mapping.aiMatchScore !== null && mapping.aiMatchScore !== undefined && (
                          <div className="ml-11 space-y-1.5" data-testid={`ai-analysis-${mapping.id}`}>
                            <div className="flex items-center gap-2">
                              <Sparkles className="h-3.5 w-3.5 text-purple-500 dark:text-purple-400" />
                              <span className="text-xs font-medium text-purple-700 dark:text-purple-300">AI Analysis</span>
                              <div className="flex items-center gap-1">
                                <svg width="20" height="20" viewBox="0 0 36 36">
                                  <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" strokeWidth="4" className="text-muted" />
                                  <circle
                                    cx="18" cy="18" r="14" fill="none" strokeWidth="4" strokeLinecap="round"
                                    strokeDasharray={`${(mapping.aiMatchScore / 100) * 87.96} ${87.96}`}
                                    transform="rotate(-90 18 18)"
                                    className={mapping.aiMatchScore >= 60 ? "stroke-green-500 dark:stroke-green-400" : mapping.aiMatchScore >= 40 ? "stroke-amber-500 dark:stroke-amber-400" : "stroke-gray-400 dark:stroke-gray-500"}
                                  />
                                </svg>
                                <span className="text-xs font-semibold">{mapping.aiMatchScore}%</span>
                              </div>
                            </div>
                            {mapping.aiMatchRationale && (
                              <p className="text-xs text-muted-foreground ml-5">{mapping.aiMatchRationale}</p>
                            )}
                            {(mapping as any).aiMatchRecommendations && (
                              <div className="ml-5 mt-1.5 rounded-md border border-purple-200 dark:border-purple-800/40 bg-purple-50/50 dark:bg-purple-950/20 p-2.5" data-testid={`ai-recommendations-${mapping.id}`}>
                                <span className="text-xs font-medium text-purple-700 dark:text-purple-300">To reach 100%:</span>
                                <p className="text-xs text-muted-foreground mt-0.5">{(mapping as any).aiMatchRecommendations}</p>
                              </div>
                            )}
                          </div>
                        )}
                        {mapping.rationale && !mapping.aiMatchRationale && (
                          <div className="ml-11" data-testid={`manual-rationale-${mapping.id}`}>
                            <span className="text-xs font-medium text-muted-foreground">Rationale: </span>
                            <span className="text-xs text-muted-foreground">{mapping.rationale}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <Card data-testid="card-history-section">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground py-4" data-testid="text-no-history">
                No history available for this control.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={linkDocOpen} onOpenChange={setLinkDocOpen}>
        <DialogContent className="sm:max-w-[480px]" data-testid="dialog-link-document">
          <DialogHeader>
            <DialogTitle>Link Document</DialogTitle>
          </DialogHeader>
          <Form {...linkDocForm}>
            <form onSubmit={linkDocForm.handleSubmit(onLinkDoc)} className="space-y-4">
              <FormField
                control={linkDocForm.control}
                name="documentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Document</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ? String(field.value) : ""}>
                      <FormControl>
                        <SelectTrigger data-testid="select-link-document">
                          <SelectValue placeholder="Select a document" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {unmappedDocuments.length === 0 ? (
                          <div className="py-2 px-3 text-sm text-muted-foreground">All documents are already linked</div>
                        ) : (
                          unmappedDocuments.map((d) => (
                            <SelectItem key={d.id} value={String(d.id)} data-testid={`select-item-link-doc-${d.id}`}>
                              {d.title}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={linkDocForm.control}
                name="coverageStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Coverage Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-link-coverage">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Covered" data-testid="select-item-link-covered">Covered</SelectItem>
                        <SelectItem value="Partially Covered" data-testid="select-item-link-partial">Partially Covered</SelectItem>
                        <SelectItem value="Not Covered" data-testid="select-item-link-not-covered">Not Covered</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={linkDocForm.control}
                name="rationale"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rationale (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Why does this document cover this control?" {...field} data-testid="input-link-rationale" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setLinkDocOpen(false)} data-testid="button-cancel-link">
                  Cancel
                </Button>
                <Button type="submit" disabled={createMappingMutation.isPending} data-testid="button-submit-link">
                  {createMappingMutation.isPending ? "Linking..." : "Link document"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
