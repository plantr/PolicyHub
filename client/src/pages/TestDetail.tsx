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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ArrowLeft, CheckCircle2, XCircle, Clock, FileText, Save, MoreHorizontal, Share2, User, Pencil, Trash2 } from "lucide-react";
import type { RequirementMapping, Requirement, Document as PolicyDocument, RegulatorySource } from "@shared/schema";

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths}mo ago`;
}

const createTestSchema = z.object({
  description: z.string().min(1, "Description is required"),
  documentId: z.coerce.number().min(1, "Document is required"),
  coverageStatus: z.enum(["Covered", "Partially Covered", "Not Covered"]),
});

type CreateTestValues = z.infer<typeof createTestSchema>;

export default function TestDetail() {
  const [, params] = useRoute("/tests/:id");
  const [, navigate] = useLocation();
  const rawId = params?.id;
  const isCreateMode = rawId === "new";
  const mappingId = isCreateMode ? null : Number(rawId);
  const { toast } = useToast();

  const searchParams = new URLSearchParams(window.location.search);
  const controlIdParam = Number(searchParams.get("controlId")) || 0;

  const form = useForm<CreateTestValues>({
    resolver: zodResolver(createTestSchema),
    defaultValues: { description: "", documentId: 0, coverageStatus: "Covered" },
  });

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
    if (isCreateMode || !allMappings) return null;
    return allMappings.find((m) => m.id === mappingId) ?? null;
  }, [allMappings, mappingId, isCreateMode]);

  const document = useMemo(() => {
    if (!mapping || !allDocuments) return null;
    return allDocuments.find((d) => d.id === mapping.documentId) ?? null;
  }, [mapping, allDocuments]);

  const requirement = useMemo(() => {
    if (isCreateMode) {
      return (allRequirements ?? []).find((r) => r.id === controlIdParam) ?? null;
    }
    if (!mapping || !allRequirements) return null;
    return allRequirements.find((r) => r.id === mapping.requirementId) ?? null;
  }, [mapping, allRequirements, isCreateMode, controlIdParam]);

  const source = useMemo(() => {
    if (!requirement || !sources) return null;
    return sources.find((s) => s.id === requirement.sourceId) ?? null;
  }, [requirement, sources]);

  const linkedControls = useMemo(() => {
    if (isCreateMode) return requirement ? [requirement] : [];
    if (!mapping || !allRequirements) return [];
    const req = allRequirements.find((r) => r.id === mapping.requirementId);
    return req ? [req] : [];
  }, [mapping, allRequirements, isCreateMode, requirement]);

  const isPassing = mapping?.coverageStatus === "Covered" || mapping?.coverageStatus === "Partially Covered";

  const createMutation = useMutation({
    mutationFn: async (data: CreateTestValues) => {
      const res = await apiRequest("POST", "/api/requirement-mappings", {
        requirementId: controlIdParam,
        documentId: data.documentId,
        coverageStatus: data.coverageStatus,
        rationale: data.description,
      });
      return res.json();
    },
    onSuccess: (created: RequirementMapping) => {
      queryClient.invalidateQueries({ queryKey: ["/api/requirement-mappings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Test created" });
      navigate(`/tests/${created.id}`, { replace: true });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  function onSubmit(values: CreateTestValues) {
    createMutation.mutate(values);
  }

  if (mappingsLoading) {
    return (
      <div className="space-y-6" data-testid="test-detail-loading">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!isCreateMode && !mapping) {
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

  if (isCreateMode) {
    return (
      <div className="space-y-6" data-testid="test-create-page">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" onClick={() => window.history.back()} data-testid="button-back">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        <div>
          <p className="text-xs text-muted-foreground mb-1" data-testid="text-breadcrumb">Tests</p>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-create-title">
            New Test
          </h1>
          {requirement && (
            <p className="text-sm text-muted-foreground mt-1">
              Creating a test for control: <span className="font-medium">{requirement.title}</span>
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground" data-testid="test-metadata-row">
          {source && <span data-testid="text-meta-source">{source.shortName}</span>}
          <span data-testid="text-meta-type">Policy</span>
        </div>

        <Tabs defaultValue="results" className="w-full" data-testid="test-tabs">
          <TabsList data-testid="test-tabs-list">
            <TabsTrigger value="results" data-testid="tab-results">Results</TabsTrigger>
            <TabsTrigger value="controls" data-testid="tab-controls">
              Controls <Badge variant="outline" className="ml-1 text-xs">{linkedControls.length}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="results" className="mt-6">
            <h3 className="text-base font-semibold mb-4" data-testid="text-results-heading">Test configuration</h3>
            <Card data-testid="card-test-form">
              <CardContent className="pt-6">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Company has an approved Code of Conduct" {...field} data-testid="input-test-description" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="documentId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Document</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value ? String(field.value) : ""}>
                            <FormControl>
                              <SelectTrigger data-testid="select-test-document">
                                <SelectValue placeholder="Select a document" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {(allDocuments ?? []).map((d) => (
                                <SelectItem key={d.id} value={String(d.id)} data-testid={`select-item-doc-${d.id}`}>
                                  {d.title}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="coverageStatus"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-test-status">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Covered" data-testid="select-item-covered">Covered</SelectItem>
                              <SelectItem value="Partially Covered" data-testid="select-item-partial">Partially Covered</SelectItem>
                              <SelectItem value="Not Covered" data-testid="select-item-not-covered">Not Covered</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="pt-2">
                      <Button type="submit" disabled={createMutation.isPending} data-testid="button-save-test">
                        <Save className="h-4 w-4 mr-2" />
                        {createMutation.isPending ? "Saving..." : "Save test"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="controls" className="mt-6">
            <Card data-testid="card-controls-section">
              <CardContent className="pt-6">
                {linkedControls.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4" data-testid="text-no-controls">
                    No controls linked.
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
        </Tabs>
      </div>
    );
  }

  const testTitle = mapping!.rationale || (document ? `${document.title} is mapped` : `Test #${mapping!.id}`);
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

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground mb-1" data-testid="text-breadcrumb">Tests</p>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-test-title">
            {testTitle}
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl" data-testid="text-test-description">
            {testDescription}
            {document && (
              <>
                {" "}
                <Link href={`/documents/${document.id}`} className="underline hover:text-foreground" data-testid="link-test-document">
                  {document.title}
                </Link>
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0 pt-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="outline" data-testid="button-test-more">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem data-testid="menu-item-edit">
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" data-testid="menu-item-delete">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="icon" variant="outline" data-testid="button-test-share">
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground" data-testid="test-metadata-row">
        {document && (
          <span className="flex items-center gap-1" data-testid="text-meta-owner">
            <User className="h-3.5 w-3.5" />
            {document.owner}
          </span>
        )}
        {mapping!.confirmedAt && (
          <span className="flex items-center gap-1" data-testid="text-meta-ran">
            <Clock className="h-3.5 w-3.5" />
            Ran {formatTimeAgo(new Date(mapping!.confirmedAt))}
          </span>
        )}
        {source && (
          <span className="flex items-center gap-1" data-testid="text-meta-source">
            <FileText className="h-3.5 w-3.5" />
            {source.shortName}
          </span>
        )}
        <span className="flex items-center gap-1" data-testid="text-meta-type">
          <FileText className="h-3.5 w-3.5" />
          Policy
        </span>
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
                    {mapping!.coverageStatus}
                  </Badge>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-4" data-testid="text-no-evidence">
                  No evidence linked to this test.
                </p>
              )}
              {mapping!.evidencePointers && (
                <p className="text-sm text-muted-foreground mt-3 border-t pt-3" data-testid="text-evidence-pointers">
                  {mapping!.evidencePointers}
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
