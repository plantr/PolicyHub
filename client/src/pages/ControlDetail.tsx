import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation, Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, CheckCircle2, AlertCircle, Trash2 } from "lucide-react";
import type { Requirement, RegulatorySource, RequirementMapping, Document as PolicyDocument } from "@shared/schema";

export default function ControlDetail() {
  const [, params] = useRoute("/controls/:id");
  const [, navigate] = useLocation();
  const controlId = Number(params?.id);
  const { toast } = useToast();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

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

  const mappedDocuments = useMemo(() => {
    return mappings
      .map((m) => ({
        mapping: m,
        document: documentMap.get(m.documentId),
      }))
      .filter((entry) => entry.document);
  }, [mappings, documentMap]);

  const bestStatus = useMemo(() => {
    if (mappings.length === 0) return "Not Covered";
    if (mappings.some((m) => m.coverageStatus === "Covered")) return "Covered";
    if (mappings.some((m) => m.coverageStatus === "Partially Covered")) return "Partially Covered";
    return "Not Covered";
  }, [mappings]);

  const coveredCount = mappings.filter((m) => m.coverageStatus === "Covered" || m.coverageStatus === "Partially Covered").length;

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/requirements/${controlId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/requirements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Control deleted" });
      navigate("/requirements");
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

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
        <Button variant="ghost" onClick={() => navigate("/requirements")} data-testid="button-back">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Controls
        </Button>
        <p className="text-muted-foreground">Control not found.</p>
      </div>
    );
  }

  const statusVariant = bestStatus === "Covered" ? "default" as const
    : bestStatus === "Partially Covered" ? "secondary" as const
    : "destructive" as const;

  return (
    <div className="space-y-6" data-testid="control-detail-page">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" onClick={() => navigate("/requirements")} data-testid="button-back">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-control-title">
          {control.title}
        </h1>
        {control.description && (
          <p className="text-muted-foreground mt-2 max-w-2xl" data-testid="text-control-description">
            {control.description}
          </p>
        )}
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
          <Card data-testid="card-documents-section">
            <CardContent className="pt-6">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <h3 className="text-base font-semibold">Documents</h3>
                <Badge variant="outline" className="text-xs" data-testid="badge-doc-count">
                  {coveredCount} / {mappedDocuments.length} OK
                </Badge>
              </div>

              {mappedDocuments.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4" data-testid="text-no-documents">
                  No documents mapped to this control yet.
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
                      ) : mapping.coverageStatus === "Partially Covered" ? (
                        <AlertCircle className="h-5 w-5 text-amber-500 dark:text-amber-400 shrink-0" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-muted-foreground shrink-0" />
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

      <div className="border-t pt-6">
        <Button
          variant="destructive"
          onClick={() => setDeleteConfirmOpen(true)}
          data-testid="button-delete-control"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete control
        </Button>
      </div>

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent data-testid="dialog-delete-confirm">
          <DialogHeader>
            <DialogTitle>Delete Control</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{control.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteConfirmOpen(false)} data-testid="button-cancel-delete">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
