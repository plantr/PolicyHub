import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Search, Info, ChevronsRight } from "lucide-react";
import { useLocation } from "wouter";
import type { Requirement, RegulatorySource, RequirementMapping, Document as PolicyDocument } from "@shared/schema";
import { insertRequirementSchema } from "@shared/schema";

const reqFormSchema = insertRequirementSchema.extend({
  sourceId: z.coerce.number().min(1, "Source is required"),
  code: z.string().min(1, "Code is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  category: z.string().min(1, "Category is required"),
  article: z.string().nullable().default(null),
});

type ReqFormValues = z.infer<typeof reqFormSchema>;

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

function DonutChart({ segments, size = 120, strokeWidth = 20, centerLabel, centerSub }: {
  segments: { value: number; className: string }[];
  size?: number;
  strokeWidth?: number;
  centerLabel: string;
  centerSub: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  let accumulated = 0;

  return (
    <div className="relative" style={{ width: size, height: size }}>
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
        {total > 0 && segments.map((seg, i) => {
          const pct = seg.value / total;
          const dashLen = pct * circumference;
          const offset = (accumulated / total) * circumference;
          accumulated += seg.value;
          return (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              strokeDasharray={`${dashLen} ${circumference - dashLen}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
              className={seg.className}
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold">{centerLabel}</span>
        <span className="text-xs text-muted-foreground">{centerSub}</span>
      </div>
    </div>
  );
}

export default function Requirements() {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [frameworkFilter, setFrameworkFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReq, setEditingReq] = useState<Requirement | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingReq, setDeletingReq] = useState<Requirement | null>(null);
  const { toast } = useToast();

  const form = useForm<ReqFormValues>({
    resolver: zodResolver(reqFormSchema),
    defaultValues: {
      sourceId: 0,
      code: "",
      title: "",
      description: "",
      category: "",
      article: null,
    },
  });

  const { data: requirements, isLoading: reqLoading } = useQuery<Requirement[]>({
    queryKey: ["/api/requirements"],
  });

  const { data: sources, isLoading: srcLoading } = useQuery<RegulatorySource[]>({
    queryKey: ["/api/regulatory-sources"],
  });

  const { data: allMappings } = useQuery<RequirementMapping[]>({
    queryKey: ["/api/requirement-mappings"],
  });

  const { data: allDocuments } = useQuery<PolicyDocument[]>({
    queryKey: ["/api/documents"],
  });

  const isLoading = reqLoading || srcLoading;

  const sourceMap = useMemo(
    () => new Map((sources ?? []).map((s) => [s.id, s])),
    [sources]
  );

  const categories = useMemo(
    () => Array.from(new Set((requirements ?? []).map((r) => r.category))).sort(),
    [requirements]
  );

  const mappingsByReq = useMemo(() => {
    const lookup = new Map<number, RequirementMapping[]>();
    for (const m of allMappings ?? []) {
      const list = lookup.get(m.requirementId) || [];
      list.push(m);
      lookup.set(m.requirementId, list);
    }
    return lookup;
  }, [allMappings]);

  const metrics = useMemo(() => {
    const reqs = requirements ?? [];
    const total = reqs.length;
    if (total === 0) return { total: 0, covered: 0, partial: 0, notCovered: 0, coveragePercent: 0, mappedDocCount: 0, totalDocCount: 0 };

    const coveredIds = new Set<number>();
    const partialIds = new Set<number>();
    const docIds = new Set<number>();

    mappingsByReq.forEach((maps, reqId) => {
      for (const m of maps) {
        if (m.documentId != null) docIds.add(m.documentId);
        if (m.coverageStatus === "Covered") coveredIds.add(reqId);
        else if (m.coverageStatus === "Partially Covered") partialIds.add(reqId);
      }
    });

    const covered = coveredIds.size;
    const partial = Array.from(partialIds).filter((id) => !coveredIds.has(id)).length;
    const notCovered = total - covered - partial;
    const coveragePercent = Math.round(((covered + partial * 0.5) / total) * 100);

    return {
      total,
      covered,
      partial,
      notCovered,
      coveragePercent,
      mappedDocCount: docIds.size,
      totalDocCount: (allDocuments ?? []).length,
    };
  }, [requirements, mappingsByReq, allDocuments]);

  function getBestStatus(reqId: number): string {
    const maps = mappingsByReq.get(reqId);
    if (!maps || maps.length === 0) return "Not Covered";
    if (maps.some((m) => m.coverageStatus === "Covered")) return "Covered";
    if (maps.some((m) => m.coverageStatus === "Partially Covered")) return "Partially Covered";
    return "Not Covered";
  }

  const filtered = useMemo(() => {
    return (requirements ?? []).filter((req) => {
      if (frameworkFilter !== "all" && String(req.sourceId) !== frameworkFilter) return false;
      if (categoryFilter !== "all" && req.category !== categoryFilter) return false;
      if (statusFilter !== "all") {
        const status = getBestStatus(req.id);
        if (statusFilter === "covered" && status !== "Covered") return false;
        if (statusFilter === "partial" && status !== "Partially Covered") return false;
        if (statusFilter === "not_covered" && status !== "Not Covered") return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!req.title.toLowerCase().includes(q) && !req.code.toLowerCase().includes(q) && !(req.description && req.description.toLowerCase().includes(q))) return false;
      }
      return true;
    });
  }, [requirements, frameworkFilter, categoryFilter, statusFilter, searchQuery, mappingsByReq]);

  const createMutation = useMutation({
    mutationFn: async (data: ReqFormValues) => {
      const res = await apiRequest("POST", "/api/requirements", {
        sourceId: data.sourceId,
        code: data.code,
        title: data.title,
        description: data.description,
        category: data.category,
        article: data.article || null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/requirements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Control created" });
      closeDialog();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: ReqFormValues }) => {
      const res = await apiRequest("PUT", `/api/requirements/${id}`, {
        sourceId: data.sourceId,
        code: data.code,
        title: data.title,
        description: data.description,
        category: data.category,
        article: data.article || null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/requirements"] });
      toast({ title: "Control updated" });
      closeDialog();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/requirements/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/requirements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Control deleted" });
      setDeleteConfirmOpen(false);
      setDeletingReq(null);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  function openCreateDialog() {
    setEditingReq(null);
    form.reset({
      sourceId: 0,
      code: "",
      title: "",
      description: "",
      category: "",
      article: null,
    });
    setDialogOpen(true);
  }

  function openEditDialog(req: Requirement) {
    setEditingReq(req);
    form.reset({
      sourceId: req.sourceId,
      code: req.code,
      title: req.title,
      description: req.description,
      category: req.category,
      article: req.article ?? null,
    });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingReq(null);
  }

  function onSubmit(values: ReqFormValues) {
    if (editingReq) {
      updateMutation.mutate({ id: editingReq.id, data: values });
    } else {
      createMutation.mutate(values);
    }
  }

  return (
    <div className="space-y-6" data-testid="controls-page">
      <div className="flex flex-wrap items-center justify-between gap-3" data-testid="controls-header">
        <h1 className="text-xl font-semibold tracking-tight" data-testid="text-page-title">Controls</h1>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search"
              className="pl-9 w-[180px]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="input-search-controls-header"
            />
          </div>
          <Button variant="outline" onClick={openCreateDialog} data-testid="button-add-control">
            Add control
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : (
        <Table data-testid="controls-table">
          <TableHeader>
            <TableRow className="border-b">
              <TableHead className="w-[120px] text-xs font-normal text-muted-foreground" data-testid="th-id">
                <span className="flex flex-wrap items-center gap-1">ID <Info className="h-3 w-3" /></span>
              </TableHead>
              <TableHead className="text-xs font-normal text-muted-foreground" data-testid="th-control">Control</TableHead>
              <TableHead className="w-[200px] text-xs font-normal text-muted-foreground" data-testid="th-owner">Owner</TableHead>
              <TableHead className="text-xs font-normal text-muted-foreground" data-testid="th-frameworks">Frameworks</TableHead>
              <TableHead className="w-[40px]" data-testid="th-actions"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground" data-testid="text-no-controls">
                  No controls found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((req) => {
                const source = sourceMap.get(req.sourceId);
                const maps = mappingsByReq.get(req.id) || [];
                const ownerDoc = maps.length > 0 && maps[0].documentId
                  ? (allDocuments ?? []).find((d) => d.id === maps[0].documentId)
                  : null;
                const ownerName = ownerDoc?.owner ?? "";

                const frameworkTags: string[] = [];
                if (source) {
                  frameworkTags.push(`${source.shortName} · ${req.code}`);
                } else {
                  frameworkTags.push(req.code);
                }
                for (const m of maps) {
                  if (m.documentId) {
                    const doc = (allDocuments ?? []).find((d) => d.id === m.documentId);
                    if (doc) {
                      const docSource = sourceMap.get(req.sourceId);
                      const tag = docSource ? `${docSource.shortName} · ${req.code}` : req.code;
                      if (!frameworkTags.includes(tag)) {
                        frameworkTags.push(tag);
                      }
                    }
                  }
                }
                const visibleTags = frameworkTags.slice(0, 2);
                const extraCount = frameworkTags.length - 2;

                return (
                  <TableRow
                    key={req.id}
                    className="cursor-pointer border-b"
                    onClick={() => navigate(`/controls/${req.id}`)}
                    data-testid={`row-control-${req.id}`}
                  >
                    <TableCell className="font-mono text-sm text-muted-foreground py-4" data-testid={`text-id-${req.id}`}>
                      {req.code}
                    </TableCell>
                    <TableCell className="py-4" data-testid={`text-control-${req.id}`}>
                      <span className="text-sm">{req.title}</span>
                    </TableCell>
                    <TableCell className="text-sm py-4" data-testid={`text-owner-${req.id}`}>
                      {ownerName}
                    </TableCell>
                    <TableCell className="py-4" data-testid={`text-framework-${req.id}`}>
                      <div className="flex flex-wrap items-center gap-3">
                        {visibleTags.map((tag, i) => (
                          <span key={i} className="text-sm text-muted-foreground whitespace-nowrap">{tag}</span>
                        ))}
                        {extraCount > 0 && (
                          <span className="text-sm text-muted-foreground whitespace-nowrap">+{extraCount}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-4 text-right" data-testid={`text-actions-${req.id}`}>
                      <ChevronsRight className="h-4 w-4 text-muted-foreground/50 inline-block" />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]" data-testid="dialog-control">
          <DialogHeader>
            <DialogTitle data-testid="text-dialog-title">
              {editingReq ? "Edit Control" : "Add Control"}
            </DialogTitle>
            <DialogDescription>
              {editingReq ? "Update control details." : "Create a new control."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
              <FormField
                control={form.control}
                name="sourceId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Framework</FormLabel>
                    <Select
                      value={field.value ? String(field.value) : ""}
                      onValueChange={(val) => field.onChange(Number(val))}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-trigger-sourceId">
                          <SelectValue placeholder="Select a framework" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(sources ?? []).map((s) => (
                          <SelectItem key={s.id} value={String(s.id)} data-testid={`select-item-sourceId-${s.id}`}>
                            {s.shortName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Code</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. CTL-001" {...field} data-testid="input-control-code" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. AML/KYC" {...field} data-testid="input-control-category" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Control title" {...field} data-testid="input-control-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the control"
                        className="resize-none"
                        {...field}
                        data-testid="input-control-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="article"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Article</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Art. 5(1)"
                        {...field}
                        value={field.value ?? ""}
                        data-testid="input-control-article"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeDialog} data-testid="button-cancel-control">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-control"
                >
                  {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent data-testid="dialog-delete-control">
          <DialogHeader>
            <DialogTitle>Delete Control</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingReq?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)} data-testid="button-cancel-delete-control">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingReq && deleteMutation.mutate(deletingReq.id)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete-control"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
