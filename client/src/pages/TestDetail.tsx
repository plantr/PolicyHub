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
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { X, CheckCircle2, XCircle, FileText, Save, MoreHorizontal, Share2, Pencil, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import type { ControlMapping, Control, Document as PolicyDocument, RegulatorySource } from "@shared/schema";

const createTestSchema = z.object({
  description: z.string().min(1, "Description is required"),
});

type CreateTestValues = z.infer<typeof createTestSchema>;

function EvidenceTestCriteria({
  mapping,
  document,
  control,
  source,
  isPassing,
}: {
  mapping: ControlMapping;
  document: PolicyDocument | null;
  control: Control | null;
  source: RegulatorySource | null;
  isPassing: boolean;
}) {
  const [expanded, setExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<"about" | "logic">("about");
  const [isEditingLogic, setIsEditingLogic] = useState(false);
  const [logicText, setLogicText] = useState(mapping.testLogic || "");
  const { toast } = useToast();

  const saveLogicMutation = useMutation({
    mutationFn: async (newLogic: string) => {
      await apiRequest("PUT", `/api/control-mappings/${mapping.id}`, {
        testLogic: newLogic,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/control-mappings"] });
      setIsEditingLogic(false);
      toast({ title: "Test logic saved" });
    },
    onError: () => {
      toast({ title: "Failed to save test logic", variant: "destructive" });
    },
  });

  const testDescription = mapping.rationale || "This test verifies compliance with the mapped control.";
  const docTitle = document?.title ?? "the linked document";

  return (
    <div data-testid="card-evidence-section">
      <div
        className="flex flex-wrap items-center justify-between gap-3 cursor-pointer py-1"
        onClick={() => setExpanded(!expanded)}
        data-testid="button-toggle-criteria"
      >
        <div className="flex items-center gap-2">
          {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronUp className="h-4 w-4 text-muted-foreground" />}
          <h3 className="text-sm font-semibold">Test criteria</h3>
        </div>
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            variant={activeTab === "about" ? "outline" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("about")}
            data-testid="button-tab-about"
            className={activeTab === "about" ? "toggle-elevate toggle-elevated" : ""}
          >
            About
          </Button>
          <Button
            variant={activeTab === "logic" ? "outline" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("logic")}
            data-testid="button-tab-logic"
            className={activeTab === "logic" ? "toggle-elevate toggle-elevated" : ""}
          >
            Logic
          </Button>
        </div>
      </div>

      {expanded && (
        <Card className="mt-3" data-testid="card-criteria-content">
          <CardContent className="pt-5 space-y-5">
            {activeTab === "about" ? (
              <div className="space-y-4 text-sm" data-testid="criteria-about">
                <div>
                  <h4 className="font-semibold mb-1">What is the test?</h4>
                  <p className="text-muted-foreground">
                    {document ? (
                      <>This test verifies that your company has an approved <Link href={`/documents/${document.id}`} className="underline hover:text-foreground" data-testid="link-criteria-doc">{docTitle}</Link>.</>
                    ) : (
                      <>{testDescription}</>
                    )}
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold mb-1">What are the inputs to the test?</h4>
                  <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                    {document ? (
                      <>
                        <li>A policy document with the ID: <span className="font-mono text-xs">{document.docType?.toLowerCase().replace(/\s+/g, "-")}-{document.id}</span></li>
                        <li>The policy must be both <strong className="text-foreground">created</strong> and <strong className="text-foreground">approved</strong></li>
                      </>
                    ) : (
                      <li>A document must be mapped to this test with coverage status set</li>
                    )}
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-1">What is pass and what is fail?</h4>
                  <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                    <li><strong className="text-foreground">Pass:</strong> The policy exists and has been approved</li>
                    <li><strong className="text-foreground">Fail:</strong> The policy does not exist, or hasn't been approved</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-1">Key terms</h4>
                  <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                    {document && (
                      <li><strong className="text-foreground">{docTitle}:</strong> A {document.docType} document owned by {document.owner}.</li>
                    )}
                    {source && (
                      <li><strong className="text-foreground">{source.name}:</strong> {source.description || `Regulatory source from ${source.jurisdiction}.`}</li>
                    )}
                  </ul>
                </div>

                {document && (
                  <div>
                    <h4 className="font-semibold mb-1">Relevant documentation</h4>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>
                        <Link href={`/documents/${document.id}`} className="text-sm text-purple-600 dark:text-purple-400 hover:underline" data-testid="link-relevant-doc">
                          {docTitle}
                        </Link>
                      </li>
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4 text-sm" data-testid="criteria-logic">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                  <h4 className="font-semibold">Test logic</h4>
                  {!isEditingLogic ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { setLogicText(mapping.testLogic || ""); setIsEditingLogic(true); }}
                      data-testid="button-edit-logic"
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1.5" />
                      Edit
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setIsEditingLogic(false)}
                        data-testid="button-cancel-logic"
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => saveLogicMutation.mutate(logicText)}
                        disabled={saveLogicMutation.isPending}
                        data-testid="button-save-logic"
                      >
                        <Save className="h-3.5 w-3.5 mr-1.5" />
                        {saveLogicMutation.isPending ? "Saving..." : "Save"}
                      </Button>
                    </div>
                  )}
                </div>

                {isEditingLogic ? (
                  <Textarea
                    value={logicText}
                    onChange={(e) => setLogicText(e.target.value)}
                    placeholder="Describe the test logic — what conditions must be met, what inputs are evaluated, and what constitutes a pass or fail..."
                    className="min-h-[200px] text-sm"
                    data-testid="input-test-logic"
                  />
                ) : (
                  <div className="space-y-4">
                    {mapping.testLogic ? (
                      <div className="text-muted-foreground whitespace-pre-wrap" data-testid="text-test-logic">
                        {mapping.testLogic}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-muted-foreground">This test evaluates the following conditions:</p>
                        <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                          <li>Document exists and is mapped to this control</li>
                          <li>Coverage status is set to "Covered"</li>
                          {document && <li>Document status is "Approved" or "Published"</li>}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                <div className="border-t pt-4 mt-4">
                  <h4 className="font-semibold mb-2">Current status</h4>
                  <div className="flex items-center gap-2">
                    {isPassing ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                    <span className="text-muted-foreground">
                      Coverage: <strong className="text-foreground">{mapping.coverageStatus}</strong>
                    </span>
                  </div>
                </div>

                {mapping.evidencePointers && (
                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-1">Evidence pointers</h4>
                    <p className="text-muted-foreground">{mapping.evidencePointers}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

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
    defaultValues: { description: "" },
  });

  const { data: allMappings, isLoading: mappingsLoading } = useQuery<ControlMapping[]>({
    queryKey: ["/api/control-mappings"],
  });

  const { data: allRequirements } = useQuery<Control[]>({
    queryKey: ["/api/controls"],
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
    return allRequirements.find((r) => r.id === mapping.controlId) ?? null;
  }, [mapping, allRequirements, isCreateMode, controlIdParam]);

  const source = useMemo(() => {
    if (!requirement || !sources) return null;
    return sources.find((s) => s.id === requirement.sourceId) ?? null;
  }, [requirement, sources]);

  const linkedControls = useMemo(() => {
    if (isCreateMode) return requirement ? [requirement] : [];
    if (!mapping || !allRequirements) return [];
    const req = allRequirements.find((r) => r.id === mapping.controlId);
    return req ? [req] : [];
  }, [mapping, allRequirements, isCreateMode, requirement]);

  const isPassing = mapping?.coverageStatus === "Covered" || mapping?.coverageStatus === "Partially Covered";

  const createMutation = useMutation({
    mutationFn: async (data: CreateTestValues) => {
      const res = await apiRequest("POST", "/api/control-mappings", {
        controlId: controlIdParam,
        documentId: null,
        coverageStatus: "Not Covered",
        rationale: data.description,
      });
      return res.json();
    },
    onSuccess: (created: ControlMapping) => {
      queryClient.invalidateQueries({ queryKey: ["/api/control-mappings"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
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
        <div className="flex justify-end">
          <Button size="icon" variant="ghost" onClick={() => window.history.length > 1 ? window.history.back() : navigate("/controls")} data-testid="button-close">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-muted-foreground">Test not found.</p>
      </div>
    );
  }

  if (isCreateMode) {
    return (
      <div className="space-y-6" data-testid="test-create-page">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-create-title">
              New Test
            </h1>
            {requirement && (
              <p className="text-sm text-muted-foreground mt-1">
                Creating a test for control: <span className="font-medium">{requirement.title}</span>
              </p>
            )}
          </div>
          <Button size="icon" variant="ghost" onClick={() => window.history.length > 1 ? window.history.back() : navigate("/controls")} data-testid="button-close">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <Tabs defaultValue="results" className="w-full" data-testid="test-tabs">
          <TabsList data-testid="test-tabs-list">
            <TabsTrigger value="results" data-testid="tab-results">Results</TabsTrigger>
            <TabsTrigger value="controls" data-testid="tab-controls">
              Controls <Badge variant="outline" className="ml-1 text-xs">{linkedControls.length}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="results" className="mt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <Card data-testid="card-test-form">
                  <CardContent className="pt-6">
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
                  </CardContent>
                </Card>
                <Button type="submit" disabled={createMutation.isPending} data-testid="button-save-test">
                  <Save className="h-4 w-4 mr-2" />
                  {createMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </form>
            </Form>
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

  const testTitle = document
    ? `This test verifies that your company has an approved ${document.title}`
    : (mapping!.rationale || `Test #${mapping!.id}`);
  const testDescription = mapping!.rationale || "This test verifies compliance with the mapped control.";

  return (
    <div className="space-y-5" data-testid="test-detail-page">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex-1 min-w-0 space-y-2">
          <h1 className="text-xl font-semibold tracking-tight leading-snug max-w-2xl" data-testid="text-test-title">
            {testTitle}
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl" data-testid="text-test-description">
            {testDescription}
          </p>
          {source && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground pt-1" data-testid="text-meta-source">
              <FileText className="h-3.5 w-3.5" />
              <span>{source.shortName}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
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
          <Button size="icon" variant="ghost" onClick={() => window.history.length > 1 ? window.history.back() : navigate("/controls")} data-testid="button-close">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Tabs defaultValue="results" className="w-full" data-testid="test-tabs">
        <TabsList className="bg-transparent border-b rounded-none h-auto p-0 gap-0" data-testid="test-tabs-list">
          <TabsTrigger value="results" className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-2 text-sm" data-testid="tab-results">Results</TabsTrigger>
          <TabsTrigger value="evidence" className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-2 text-sm" data-testid="tab-evidence">Evidence</TabsTrigger>
          <TabsTrigger value="history" className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-2 text-sm" data-testid="tab-history">History</TabsTrigger>
          <TabsTrigger value="controls" className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-2 text-sm" data-testid="tab-controls">
            Controls <span className="ml-1.5 text-muted-foreground">{linkedControls.length}</span>
          </TabsTrigger>
          <TabsTrigger value="comments" className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-2 text-sm" data-testid="tab-comments">
            Comments <span className="ml-1.5 text-muted-foreground">0</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="results" className="mt-6">
          <h3 className="text-sm font-semibold mb-3" data-testid="text-results-heading">Test results</h3>
          <Card data-testid="card-test-result">
            <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/40">
              {isPassing ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
              ) : (
                <XCircle className="h-4 w-4 text-destructive" />
              )}
              <span className="font-medium text-sm" data-testid="text-result-status">
                {isPassing ? "Passing" : "Failing"}
              </span>
            </div>
            <div className="px-4 py-3">
              <p className="text-sm text-muted-foreground" data-testid="text-result-description">
                {isPassing
                  ? "This test is passing."
                  : "This test is currently not passing. Map a document or update coverage to resolve."}
              </p>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="evidence" className="mt-6">
          <EvidenceTestCriteria
            mapping={mapping!}
            document={document}
            control={requirement}
            source={source}
            isPassing={isPassing}
          />
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
          {linkedControls.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4" data-testid="text-no-controls">
              No controls linked to this test.
            </p>
          ) : (
            <div className="space-y-3">
              {linkedControls.map((ctrl) => (
                <div
                  key={ctrl.id}
                  className="border rounded-md pl-4 pr-4 py-3 cursor-pointer hover-elevate"
                  style={{ borderLeftWidth: "3px", borderLeftColor: "hsl(var(--primary) / 0.35)" }}
                  onClick={() => navigate(`/controls/${ctrl.id}`)}
                  data-testid={`row-control-${ctrl.id}`}
                >
                  <span className="text-sm font-medium" data-testid={`text-control-title-${ctrl.id}`}>{ctrl.title}</span>
                  <p className="text-xs text-muted-foreground mt-0.5" data-testid={`text-control-code-${ctrl.id}`}>{ctrl.code} - {ctrl.category}</p>
                </div>
              ))}
            </div>
          )}
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
