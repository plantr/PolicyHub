import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation, Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, CheckCircle2, XCircle, Clock, FileText } from "lucide-react";
import type { RequirementMapping, Requirement, Document as PolicyDocument, RegulatorySource } from "@shared/schema";

export default function TestDetail() {
  const [, params] = useRoute("/tests/:id");
  const [, navigate] = useLocation();
  const mappingId = Number(params?.id);

  const { data: allMappings, isLoading: mappingsLoading } = useQuery<RequirementMapping[]>({
    queryKey: ["/api/requirement-mappings"],
  });

  const { data: allRequirements } = useQuery<Requirement[]>({
    queryKey: ["/api/requirements"],
  });

  const { data: allDocuments } = useQuery<PolicyDocument[]>({
    queryKey: ["/api/documents"],
  });

  const { data: sources } = useQuery<RegulatorySource[]>({
    queryKey: ["/api/regulatory-sources"],
  });

  const mapping = useMemo(() => {
    return (allMappings ?? []).find((m) => m.id === mappingId);
  }, [allMappings, mappingId]);

  const document = useMemo(() => {
    if (!mapping || !allDocuments) return null;
    return allDocuments.find((d) => d.id === mapping.documentId) ?? null;
  }, [mapping, allDocuments]);

  const requirement = useMemo(() => {
    if (!mapping || !allRequirements) return null;
    return allRequirements.find((r) => r.id === mapping.requirementId) ?? null;
  }, [mapping, allRequirements]);

  const source = useMemo(() => {
    if (!requirement || !sources) return null;
    return sources.find((s) => s.id === requirement.sourceId) ?? null;
  }, [requirement, sources]);

  const linkedControls = useMemo(() => {
    if (!mapping || !allMappings || !allRequirements) return [];
    const reqMap = new Map((allRequirements ?? []).map((r) => [r.id, r]));
    return [reqMap.get(mapping.requirementId)].filter(Boolean) as Requirement[];
  }, [mapping, allMappings, allRequirements]);

  const isPassing = mapping?.coverageStatus === "Covered" || mapping?.coverageStatus === "Partially Covered";

  if (mappingsLoading) {
    return (
      <div className="space-y-6" data-testid="test-detail-loading">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!mapping) {
    return (
      <div className="space-y-4" data-testid="test-detail-not-found">
        <Button variant="ghost" onClick={() => window.history.back()} data-testid="button-back">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <p className="text-muted-foreground">Test not found.</p>
      </div>
    );
  }

  const testTitle = mapping.rationale || (document ? `${document.title} is mapped` : `Test #${mapping.id}`);
  const testDescription = document
    ? `This test verifies that your company has an approved ${document.title}.`
    : "This test verifies compliance with the mapped control.";

  return (
    <div className="space-y-6" data-testid="test-detail-page">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" onClick={() => window.history.back()} data-testid="button-back">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>

      <div>
        <p className="text-xs text-muted-foreground mb-1" data-testid="text-breadcrumb">Tests</p>
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-test-title">
          {testTitle}
        </h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl" data-testid="text-test-description">
          {testDescription}
          {document && (
            <>
              {" "}
              <Link href={`/documents/${document.id}`} className="hover:underline underline" data-testid="link-test-document">
                {document.title}
              </Link>
            </>
          )}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground" data-testid="test-metadata-row">
        {document && (
          <span className="flex items-center gap-1" data-testid="text-meta-owner">
            <FileText className="h-3.5 w-3.5" />
            {document.owner}
          </span>
        )}
        {mapping.confirmedAt && (
          <span className="flex items-center gap-1" data-testid="text-meta-ran">
            <Clock className="h-3.5 w-3.5" />
            Confirmed {new Date(mapping.confirmedAt).toLocaleDateString()}
          </span>
        )}
        {source && (
          <span data-testid="text-meta-source">{source.shortName}</span>
        )}
        <span data-testid="text-meta-type">Policy</span>
      </div>

      <Tabs defaultValue="results" className="w-full" data-testid="test-tabs">
        <TabsList data-testid="test-tabs-list">
          <TabsTrigger value="results" data-testid="tab-results">Results</TabsTrigger>
          <TabsTrigger value="evidence" data-testid="tab-evidence">Evidence</TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-history">History</TabsTrigger>
          <TabsTrigger value="controls" data-testid="tab-controls">
            Controls <Badge variant="outline" className="ml-1 text-xs">{linkedControls.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="comments" data-testid="tab-comments">
            Comments <Badge variant="outline" className="ml-1 text-xs">0</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="results" className="mt-6">
          <h3 className="text-base font-semibold mb-4" data-testid="text-results-heading">Test results</h3>
          <Card data-testid="card-test-result">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-2">
                {isPassing ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
                ) : (
                  <XCircle className="h-5 w-5 text-destructive" />
                )}
                <span className="font-medium text-sm" data-testid="text-result-status">
                  {isPassing ? "Passing" : "Failing"}
                </span>
              </div>
              <p className="text-sm text-muted-foreground ml-7" data-testid="text-result-description">
                {isPassing
                  ? "This test is passing."
                  : "This test is currently not passing. Map a document or update coverage to resolve."}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="evidence" className="mt-6">
          <Card data-testid="card-evidence-section">
            <CardContent className="pt-6">
              {document ? (
                <div className="flex flex-wrap items-center gap-3 py-2" data-testid="row-evidence-doc">
                  <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/documents/${document.id}`}
                      className="text-sm font-medium hover:underline"
                      data-testid="link-evidence-doc"
                    >
                      {document.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">{document.docType} - {document.owner}</p>
                  </div>
                  <Badge variant={isPassing ? "default" : "destructive"} className="text-xs" data-testid="badge-evidence-status">
                    {mapping.coverageStatus}
                  </Badge>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-4" data-testid="text-no-evidence">
                  No evidence linked to this test.
                </p>
              )}
              {mapping.evidencePointers && (
                <p className="text-sm text-muted-foreground mt-3 border-t pt-3" data-testid="text-evidence-pointers">
                  {mapping.evidencePointers}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <Card data-testid="card-history-section">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground py-4" data-testid="text-no-history">
                No history available for this test.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="controls" className="mt-6">
          <Card data-testid="card-controls-section">
            <CardContent className="pt-6">
              {linkedControls.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4" data-testid="text-no-controls">
                  No controls linked to this test.
                </p>
              ) : (
                <div className="divide-y">
                  {linkedControls.map((ctrl) => (
                    <div
                      key={ctrl.id}
                      className="flex flex-wrap items-center gap-3 py-3 cursor-pointer hover-elevate"
                      onClick={() => navigate(`/controls/${ctrl.id}`)}
                      data-testid={`row-control-${ctrl.id}`}
                    >
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium">{ctrl.title}</span>
                        <p className="text-xs text-muted-foreground mt-0.5">{ctrl.code} - {ctrl.category}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comments" className="mt-6">
          <Card data-testid="card-comments-section">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground py-4" data-testid="text-no-comments">
                No comments yet.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
