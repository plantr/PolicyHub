import { useState, useMemo } from "react";
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
import { X, CheckCircle2, XCircle, Plus, Trash2 } from "lucide-react";
import type { Requirement, RegulatorySource, RequirementMapping, Document as PolicyDocument } from "@shared/schema";

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

  const { data: control, isLoading: controlLoading } = useQuery<Requirement>({
    queryKey: [`/api/requirements/${controlId}`],
    enabled: !!controlId,
  });

  const { data: sources } = useQuery<RegulatorySource[]>({
    queryKey: ["/api/regulatory-sources"],
  });

  const { data: allMappings } = useQuery<RequirementMapping[]>({
    queryKey: ["/api/requirement-mappings"],
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
    return allMappings.filter((m) => m.requirementId === controlId);
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

  const createMappingMutation = useMutation({
    mutationFn: async (data: { documentId: number; coverageStatus: string; rationale?: string }) => {
      const res = await apiRequest("POST", "/api/requirement-mappings", {
        requirementId: controlId,
        documentId: data.documentId,
        coverageStatus: data.coverageStatus,
        rationale: data.rationale || null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/requirement-mappings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMappingMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/requirement-mappings/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/requirement-mappings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
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
          <Button size="icon" variant="ghost" onClick={() => window.history.length > 1 ? window.history.back() : navigate("/requirements")} data-testid="button-close">
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
        <Button size="icon" variant="ghost" onClick={() => window.history.length > 1 ? window.history.back() : navigate("/requirements")} data-testid="button-close">
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

        <span className="text-muted-foreground">Article</span>
        <span className="font-medium" data-testid="text-meta-article">{control.article || "--"}</span>

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
          <Card data-testid="card-tests-section">
            <CardContent className="pt-6">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-base font-semibold">Tests</h3>
                  <Badge variant="outline" className="text-xs" data-testid="badge-test-count">
                    {coveredCount} / {mappings.length} OK
                  </Badge>
                </div>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => navigate(`/tests/new?controlId=${controlId}`)}
                  data-testid="button-add-test"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {mappings.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4" data-testid="text-no-tests">
                  No tests mapped to this control yet.
                </p>
              ) : (
                <div className="divide-y">
                  {mappings.map((mapping) => {
                    const doc = mapping.documentId ? documentMap.get(mapping.documentId) : undefined;
                    const passed = mapping.coverageStatus === "Covered" || mapping.coverageStatus === "Partially Covered";
                    return (
                      <div
                        key={mapping.id}
                        className="flex flex-wrap items-center gap-3 py-3 cursor-pointer hover-elevate"
                        onClick={() => navigate(`/tests/${mapping.id}`)}
                        data-testid={`row-test-${mapping.id}`}
                      >
                        {passed ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-500 dark:text-emerald-400 shrink-0" />
                        ) : (
                          <XCircle className="h-5 w-5 text-destructive shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium">
                            {mapping.rationale || (doc ? `${doc.title} is mapped` : `Mapping #${mapping.id}`)}
                          </span>
                        </div>
                        {doc && (
                          <span className="text-xs text-muted-foreground shrink-0">{doc.owner}</span>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="shrink-0 text-muted-foreground"
                          onClick={(e) => { e.stopPropagation(); deleteMappingMutation.mutate(mapping.id); }}
                          data-testid={`button-delete-test-${mapping.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card data-testid="card-documents-section">
            <CardContent className="pt-6">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-base font-semibold">Documents</h3>
                  <Badge variant="outline" className="text-xs" data-testid="badge-doc-count">
                    {coveredCount} / {mappedDocuments.length} OK
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
                  {mappedDocuments.map(({ mapping, document: doc }) => (
                    <div
                      key={mapping.id}
                      className="flex flex-wrap items-center gap-3 py-3"
                      data-testid={`row-mapped-doc-${mapping.id}`}
                    >
                      {mapping.coverageStatus === "Covered" ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-500 dark:text-emerald-400 shrink-0" />
                      ) : (
                        <XCircle className="h-5 w-5 text-destructive shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/documents/${doc!.id}`}
                          className="text-sm font-medium hover:underline"
                          data-testid={`link-doc-${doc!.id}`}
                        >
                          {doc!.title}
                        </Link>
                        {mapping.rationale && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">{mapping.rationale}</p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0" data-testid={`text-doc-owner-${doc!.id}`}>
                        {doc!.owner}
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="shrink-0 text-muted-foreground"
                        onClick={() => deleteMappingMutation.mutate(mapping.id)}
                        data-testid={`button-unlink-doc-${mapping.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
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
