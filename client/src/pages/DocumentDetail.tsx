import { useMemo, useRef, useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import type {
  Document,
  DocumentVersion,
  BusinessUnit,
  User,
  RequirementMapping,
  Requirement,
  RegulatorySource,
  Audit,
} from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  Upload,
  Download,
  FileText,
  Trash2,
  Loader2,
  Plus,
  X,
  CheckCircle2,
  Calendar,
  List,
  MoreHorizontal,
  Pencil,
  UserCircle,
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

const VERSION_STATUSES = ["Draft", "In Review", "Approved", "Published", "Superseded"];

const addVersionSchema = z.object({
  version: z.string().min(1, "Version number is required"),
  status: z.string().min(1, "Status is required"),
  changeReason: z.string().default(""),
  createdBy: z.string().min(1, "Created by is required"),
  effectiveDate: z.string().nullable().default(null),
});

function getVersionStatusClass(status: string): string {
  switch (status) {
    case "Draft":
      return "bg-muted text-muted-foreground";
    case "In Review":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200";
    case "Approved":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    case "Published":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    case "Superseded":
      return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export default function DocumentDetail() {
  const [, params] = useRoute("/documents/:id");
  const id = params?.id;
  const [, navigate] = useLocation();

  const { data: document, isLoading: docLoading } = useQuery<Document>({
    queryKey: ["/api/documents", id],
    enabled: !!id,
  });

  const { data: versions, isLoading: versionsLoading } = useQuery<DocumentVersion[]>({
    queryKey: ["/api/documents", id, "versions"],
    enabled: !!id,
  });


  const { data: businessUnits } = useQuery<BusinessUnit[]>({
    queryKey: ["/api/business-units"],
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: allMappings } = useQuery<RequirementMapping[]>({
    queryKey: ["/api/requirement-mappings"],
  });

  const { data: allRequirements } = useQuery<Requirement[]>({
    queryKey: ["/api/requirements"],
  });

  const { data: allSources } = useQuery<RegulatorySource[]>({
    queryKey: ["/api/regulatory-sources"],
  });

  const { data: allAudits } = useQuery<Audit[]>({
    queryKey: ["/api/audits"],
  });

  const activeUsers = useMemo(
    () => (users ?? []).filter((u) => u.status === "Active").sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)),
    [users],
  );

  const buMap = useMemo(() => {
    const map = new Map<number, string>();
    businessUnits?.forEach((bu) => map.set(bu.id, bu.name));
    return map;
  }, [businessUnits]);

  const reqMap = useMemo(() => {
    const map = new Map<number, Requirement>();
    allRequirements?.forEach((r) => map.set(r.id, r));
    return map;
  }, [allRequirements]);

  const sourceMap = useMemo(() => {
    const map = new Map<number, RegulatorySource>();
    allSources?.forEach((s) => map.set(s.id, s));
    return map;
  }, [allSources]);

  const docMappings = useMemo(() => {
    if (!allMappings || !id) return [];
    const docId = Number(id);
    return allMappings.filter((m) => m.documentId === docId);
  }, [allMappings, id]);

  const linkedFrameworks = useMemo(() => {
    const frameworkIds = new Set<number>();
    docMappings.forEach((m) => {
      const req = reqMap.get(m.requirementId);
      if (req) frameworkIds.add(req.sourceId);
    });
    return Array.from(frameworkIds)
      .map((sid) => sourceMap.get(sid))
      .filter(Boolean) as RegulatorySource[];
  }, [docMappings, reqMap, sourceMap]);

  const latestVersion = useMemo(() => {
    if (!versions || versions.length === 0) return null;
    const published = versions.find((v) => v.status === "Published");
    const approved = versions.find((v) => v.status === "Approved");
    return published || approved || versions[0];
  }, [versions]);

  const docStatus = useMemo(() => {
    if (!latestVersion) return "No versions";
    if (latestVersion.status === "Published" || latestVersion.status === "Approved") return "OK";
    if (latestVersion.status === "In Review") return "In Review";
    return "Draft";
  }, [latestVersion]);

  const docAudits = useMemo(() => {
    if (!allAudits || !document) return [];
    return allAudits.filter((a) => a.businessUnitId === document.businessUnitId);
  }, [allAudits, document]);

  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingVersionId, setUploadingVersionId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("versions");

  const [mappedSearch, setMappedSearch] = useState("");
  const [mappedFrameworkFilter, setMappedFrameworkFilter] = useState("all");
  const [mappedCodeFilter, setMappedCodeFilter] = useState("all");
  const [mappedPage, setMappedPage] = useState(1);
  const [mappedPageSize, setMappedPageSize] = useState(5);

  const [mapControlOpen, setMapControlOpen] = useState(false);
  const [mapSearch, setMapSearch] = useState("");
  const [mapFrameworkFilter, setMapFrameworkFilter] = useState("all");

  const mappedHasActiveFilters = mappedSearch.length > 0 || mappedFrameworkFilter !== "all" || mappedCodeFilter !== "all";

  const filteredMappings = useMemo(() => {
    return docMappings.filter((m) => {
      const req = reqMap.get(m.requirementId);
      if (!req) return false;
      const source = sourceMap.get(req.sourceId);
      if (mappedFrameworkFilter !== "all" && source?.shortName !== mappedFrameworkFilter) return false;
      if (mappedCodeFilter !== "all" && req.code !== mappedCodeFilter) return false;
      if (mappedSearch) {
        const q = mappedSearch.toLowerCase();
        const titleMatch = req.title.toLowerCase().includes(q);
        const descMatch = (req.description ?? "").toLowerCase().includes(q);
        const codeMatch = req.code.toLowerCase().includes(q);
        const rationaleMatch = (m.rationale ?? "").toLowerCase().includes(q);
        if (!titleMatch && !descMatch && !codeMatch && !rationaleMatch) return false;
      }
      return true;
    });
  }, [docMappings, reqMap, sourceMap, mappedFrameworkFilter, mappedCodeFilter, mappedSearch]);

  const mappedTotal = filteredMappings.length;
  const mappedTotalPages = Math.max(1, Math.ceil(mappedTotal / mappedPageSize));
  const mappedPaginated = filteredMappings.slice((mappedPage - 1) * mappedPageSize, mappedPage * mappedPageSize);
  const mappedStart = mappedTotal === 0 ? 0 : (mappedPage - 1) * mappedPageSize + 1;
  const mappedEnd = Math.min(mappedPage * mappedPageSize, mappedTotal);

  const frameworkOptions = useMemo(() => {
    const set = new Set<string>();
    docMappings.forEach((m) => {
      const req = reqMap.get(m.requirementId);
      if (req) {
        const src = sourceMap.get(req.sourceId);
        if (src) set.add(src.shortName);
      }
    });
    return Array.from(set).sort();
  }, [docMappings, reqMap, sourceMap]);

  const codeOptions = useMemo(() => {
    const codes = new Set<string>();
    docMappings.forEach((m) => {
      const req = reqMap.get(m.requirementId);
      if (req) codes.add(req.code);
    });
    return Array.from(codes).sort();
  }, [docMappings, reqMap]);

  function resetMappedFilters() {
    setMappedSearch("");
    setMappedFrameworkFilter("all");
    setMappedCodeFilter("all");
    setMappedPage(1);
  }

  const alreadyMappedReqIds = useMemo(() => {
    return new Set(docMappings.map((m) => m.requirementId));
  }, [docMappings]);

  const allFrameworkOptions = useMemo(() => {
    const set = new Set<string>();
    allSources?.forEach((s) => set.add(s.shortName));
    return Array.from(set).sort();
  }, [allSources]);

  const mapControlRequirements = useMemo(() => {
    if (!allRequirements) return [];
    return allRequirements.filter((r) => {
      const source = sourceMap.get(r.sourceId);
      if (mapFrameworkFilter !== "all" && source?.shortName !== mapFrameworkFilter) return false;
      if (mapSearch) {
        const q = mapSearch.toLowerCase();
        if (!r.title.toLowerCase().includes(q) && !r.code.toLowerCase().includes(q) && !(r.description ?? "").toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [allRequirements, sourceMap, mapFrameworkFilter, mapSearch]);

  const addMappingMutation = useMutation({
    mutationFn: async (requirementId: number) => {
      const res = await fetch("/api/requirement-mappings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requirementId,
          documentId: Number(id),
          coverageStatus: "Not Covered",
        }),
      });
      if (!res.ok) throw new Error("Failed to add mapping");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/requirement-mappings"] });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to add mapping", description: err.message, variant: "destructive" });
    },
  });

  const removeMappingMutation = useMutation({
    mutationFn: async (mappingId: number) => {
      const res = await fetch(`/api/requirement-mappings/${mappingId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to remove mapping");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/requirement-mappings"] });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to remove mapping", description: err.message, variant: "destructive" });
    },
  });

  const [aiAutoMapRunning, setAiAutoMapRunning] = useState(false);

  const aiAutoMapMutation = useMutation({
    mutationFn: async () => {
      setAiAutoMapRunning(true);
      const res = await fetch(`/api/documents/${id}/ai-map-controls`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "AI auto-map failed");
      }
      return res.json();
    },
    onSuccess: (data: { matched: number; total: number; removed?: number }) => {
      setAiAutoMapRunning(false);
      queryClient.invalidateQueries({ queryKey: ["/api/requirement-mappings"] });
      const removedMsg = data.removed ? `, removed ${data.removed} low-quality mappings` : "";
      toast({
        title: "AI Auto-Map Complete",
        description: `Matched ${data.matched} controls out of ${data.total} evaluated${removedMsg}`,
      });
    },
    onError: (err: Error) => {
      setAiAutoMapRunning(false);
      toast({ title: "AI Auto-Map Failed", description: err.message, variant: "destructive" });
    },
  });

  const hasPublishedVersion = useMemo(() => {
    return versions?.some((v) => v.status === "Published") ?? false;
  }, [versions]);

  const uploadMutation = useMutation({
    mutationFn: async ({ versionId, file }: { versionId: number; file: File }) => {
      const formData = new FormData();
      formData.append("pdf", file);
      const res = await fetch(`/api/document-versions/${versionId}/pdf`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Upload failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents", id, "versions"] });
      toast({ title: "PDF uploaded successfully" });
      setUploadingVersionId(null);
    },
    onError: (err: Error) => {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
      setUploadingVersionId(null);
    },
  });

  const downloadMutation = useMutation({
    mutationFn: async (versionId: number) => {
      const res = await fetch(`/api/document-versions/${versionId}/pdf/download`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Download failed");
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition");
      const match = disposition?.match(/filename="(.+)"/);
      const fileName = match?.[1] || "policy.pdf";
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    },
    onSuccess: () => {},
    onError: (err: Error) => {
      toast({ title: "Download failed", description: err.message, variant: "destructive" });
    },
  });

  const deletePdfMutation = useMutation({
    mutationFn: async (versionId: number) => {
      const res = await fetch(`/api/document-versions/${versionId}/pdf`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Delete failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents", id, "versions"] });
      toast({ title: "PDF removed" });
    },
    onError: (err: Error) => {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    },
  });

  function handleFileSelect(versionId: number) {
    setUploadingVersionId(versionId);
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file && uploadingVersionId) {
      uploadMutation.mutate({ versionId: uploadingVersionId, file });
    }
    e.target.value = "";
  }

  const [addVersionOpen, setAddVersionOpen] = useState(false);
  const [versionFile, setVersionFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);
  const versionFileInputRef = useRef<HTMLInputElement>(null);

  type AddVersionValues = z.infer<typeof addVersionSchema>;

  const versionForm = useForm<AddVersionValues>({
    resolver: zodResolver(addVersionSchema),
    defaultValues: {
      version: "",
      status: "Draft",
      changeReason: "",
      createdBy: "",
      effectiveDate: null,
    },
  });

  const createVersionMutation = useMutation({
    mutationFn: async (data: AddVersionValues) => {
      const formData = new FormData();
      formData.append("documentId", id!);
      formData.append("version", data.version);
      formData.append("status", data.status);
      if (data.changeReason) formData.append("changeReason", data.changeReason);
      formData.append("createdBy", data.createdBy);
      if (data.effectiveDate) formData.append("effectiveDate", data.effectiveDate);
      if (versionFile) formData.append("pdf", versionFile);
      const res = await fetch(`/api/documents/${id}/versions`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Failed to create version" }));
        throw new Error(err.message || "Failed to create version");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents", id, "versions"] });
      toast({ title: "Version created" });
      setAddVersionOpen(false);
      setVersionFile(null);
      versionForm.reset();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  function onVersionSubmit(data: AddVersionValues) {
    createVersionMutation.mutate(data);
  }

  const handleVersionDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    setIsDragging(true);
  }, []);

  const handleVersionDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) setIsDragging(false);
  }, []);

  const handleVersionDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleVersionDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type === "application/pdf") {
      setVersionFile(file);
    }
  }, []);

  if (docLoading) {
    return (
      <div className="space-y-6" data-testid="loading-document-detail">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-full max-w-2xl" />
        <Skeleton className="h-4 w-96" />
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-60 w-full" />
      </div>
    );
  }

  if (!document) {
    return (
      <div className="space-y-4" data-testid="text-document-not-found">
        <p className="text-muted-foreground">Document not found</p>
        <Link href="/documents">
          <Button variant="outline" data-testid="link-back-to-documents">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Policies
          </Button>
        </Link>
      </div>
    );
  }

  const titleDisplay = document.documentReference
    ? `${document.title} (${document.documentReference}${document.taxonomy ? " - " + document.taxonomy : ""})`
    : document.title;

  const tabs = [
    { key: "versions", label: "Policy versions" },
    { key: "mapped", label: "Mapped elements" },
    { key: "audits", label: "Audits" },
    { key: "comments", label: "Comments" },
  ];

  return (
    <div className="space-y-5" data-testid="page-document-detail">
      <Link href="/documents">
        <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground cursor-pointer transition-colors" data-testid="link-back">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Policies
        </span>
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4" data-testid="section-header">
        <div className="space-y-2 flex-1 min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight leading-tight" data-testid="text-document-title">
            {titleDisplay}
          </h1>

          <p className="text-sm text-muted-foreground max-w-2xl" data-testid="text-document-description">
            {document.docType} document owned by {document.owner}
            {document.businessUnitId ? ` for ${buMap.get(document.businessUnitId) ?? "Unknown"}` : ""}.
            {document.tags?.length ? ` Tags: ${document.tags.join(", ")}.` : ""}
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-1" data-testid="section-status-indicators">
            <span className="inline-flex items-center gap-1.5 text-sm">
              <CheckCircle2 className={`h-4 w-4 ${docStatus === "OK" ? "text-emerald-500 dark:text-emerald-400" : "text-muted-foreground"}`} />
              <span className={docStatus === "OK" ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-muted-foreground"} data-testid="text-doc-status">
                {docStatus}
              </span>
            </span>

            {document.reviewFrequency && (
              <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground" data-testid="text-review-frequency">
                <Calendar className="h-4 w-4" />
                Renew {document.reviewFrequency.toLowerCase()}
              </span>
            )}

            <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground" data-testid="text-framework-count">
              <List className="h-4 w-4" />
              Frameworks ({linkedFrameworks.length})
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" data-testid="button-more-actions">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem data-testid="menu-item-duplicate">Duplicate</DropdownMenuItem>
              <DropdownMenuItem data-testid="menu-item-archive">Archive</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" data-testid="menu-item-delete">Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="icon" data-testid="button-owner-info">
            <UserCircle className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            data-testid="button-ai-auto-map"
            disabled={aiAutoMapRunning || !hasPublishedVersion}
            onClick={() => aiAutoMapMutation.mutate()}
          >
            {aiAutoMapRunning ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
            ) : (
              <Sparkles className="h-4 w-4 mr-1.5 text-purple-500 dark:text-purple-400" />
            )}
            {aiAutoMapRunning ? "Analysing..." : "AI Auto-Map"}
          </Button>
          <Button variant="outline" size="sm" data-testid="button-edit-details">
            <Pencil className="h-3.5 w-3.5 mr-1.5" />
            Edit details
          </Button>
        </div>
      </div>

      <div className="border-b" data-testid="section-tabs">
        <div className="flex gap-6" role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              role="tab"
              aria-selected={activeTab === tab.key}
              className={`pb-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab.key
                  ? "border-emerald-500 text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setActiveTab(tab.key)}
              data-testid={`tab-${tab.key}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "versions" && (
        <div className="space-y-4" data-testid="tabcontent-versions">
          <div className="flex flex-wrap items-center gap-2">
            <div className="ml-auto">
              <Button variant="outline" size="sm" onClick={() => setAddVersionOpen(true)} data-testid="button-add-version">
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Version
              </Button>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handleFileChange}
            data-testid="input-pdf-file"
          />
          <div className="border rounded-md" data-testid="versions-table">
            {versionsLoading ? (
              <div className="p-4 space-y-3" data-testid="loading-versions">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs font-medium text-muted-foreground" data-testid="col-version">Version</TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground" data-testid="col-status">Status</TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground" data-testid="col-change-reason">Change Reason</TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground" data-testid="col-created-by">Created By</TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground" data-testid="col-date">Issued Date</TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground" data-testid="col-pdf">PDF</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!versions?.length ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8" data-testid="text-no-versions">
                        No versions found
                      </TableCell>
                    </TableRow>
                  ) : (
                    versions.map((ver) => (
                      <TableRow
                        key={ver.id}
                        className="group cursor-pointer"
                        onClick={() => navigate(`/documents/${id}/versions/${ver.id}`)}
                        data-testid={`row-version-${ver.id}`}
                      >
                        <TableCell className="font-medium" data-testid={`text-version-number-${ver.id}`}>
                          {ver.version}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${getVersionStatusClass(ver.status)}`}
                            data-testid={`badge-version-status-${ver.id}`}
                          >
                            {ver.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm" data-testid={`text-change-reason-${ver.id}`}>
                          {ver.changeReason || "-"}
                        </TableCell>
                        <TableCell className="text-sm" data-testid={`text-created-by-${ver.id}`}>
                          {ver.createdBy}
                        </TableCell>
                        <TableCell className="text-sm" data-testid={`text-version-date-${ver.id}`}>
                          {ver.createdAt
                            ? format(new Date(ver.createdAt), "dd MMM yyyy")
                            : "-"}
                        </TableCell>
                        <TableCell data-testid={`cell-pdf-${ver.id}`} onClick={(e) => e.stopPropagation()}>
                          {ver.pdfS3Key ? (
                            <div className="flex items-center gap-1">
                              <div className="flex items-center gap-1 text-xs text-muted-foreground mr-1">
                                <FileText className="h-3.5 w-3.5" />
                                <span className="max-w-[100px] truncate" data-testid={`text-pdf-name-${ver.id}`}>
                                  {ver.pdfFileName}
                                </span>
                              </div>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => downloadMutation.mutate(ver.id)}
                                disabled={downloadMutation.isPending}
                                data-testid={`button-download-pdf-${ver.id}`}
                              >
                                <Download className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => deletePdfMutation.mutate(ver.id)}
                                disabled={deletePdfMutation.isPending}
                                data-testid={`button-delete-pdf-${ver.id}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleFileSelect(ver.id)}
                              disabled={uploadMutation.isPending && uploadingVersionId === ver.id}
                              data-testid={`button-upload-pdf-${ver.id}`}
                            >
                              {uploadMutation.isPending && uploadingVersionId === ver.id ? (
                                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                              ) : (
                                <Upload className="h-3.5 w-3.5 mr-1" />
                              )}
                              Attach PDF
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      )}

      {activeTab === "mapped" && (
        <div className="space-y-4" data-testid="tabcontent-mapped">
          <h2 className="text-lg font-semibold tracking-tight" data-testid="text-controls-heading">Controls</h2>

          <div className="flex flex-wrap items-center gap-2" data-testid="section-mapped-filters">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search controls"
                className="pl-9 w-[160px]"
                value={mappedSearch}
                onChange={(e) => { setMappedSearch(e.target.value); setMappedPage(1); }}
                data-testid="input-search-controls"
              />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-sm" data-testid="filter-framework">
                  Framework <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => { setMappedFrameworkFilter("all"); setMappedPage(1); }} data-testid="filter-framework-all">All Frameworks</DropdownMenuItem>
                {frameworkOptions.map((f) => (
                  <DropdownMenuItem key={f} onClick={() => { setMappedFrameworkFilter(f); setMappedPage(1); }} data-testid={`filter-framework-${f}`}>{f}</DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-sm" data-testid="filter-code">
                  Framework code <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => { setMappedCodeFilter("all"); setMappedPage(1); }} data-testid="filter-code-all">All Codes</DropdownMenuItem>
                {codeOptions.map((c) => (
                  <DropdownMenuItem key={c} onClick={() => { setMappedCodeFilter(c); setMappedPage(1); }} data-testid={`filter-code-${c}`}>{c}</DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {mappedHasActiveFilters && (
              <Button variant="ghost" size="sm" className="text-sm text-muted-foreground" onClick={resetMappedFilters} data-testid="button-reset-mapped-filters">
                Reset view
              </Button>
            )}

            <div className="ml-auto flex items-center gap-2">
              <Button variant="outline" size="icon" data-testid="button-settings">
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" data-testid="button-map-control" onClick={() => { setMapControlOpen(true); setMapSearch(""); setMapFrameworkFilter("all"); }}>
                Map control
              </Button>
            </div>
          </div>

          <div className="border rounded-md" data-testid="mapped-controls-table">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-medium text-muted-foreground" data-testid="col-control">Control</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground" data-testid="col-frameworks">Frameworks</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground" data-testid="col-ai-match">AI Match</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground" data-testid="col-rationale">Rationale</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground" data-testid="col-coverage">Coverage</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mappedPaginated.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No mapped controls found
                    </TableCell>
                  </TableRow>
                ) : (
                  mappedPaginated.map((mapping) => {
                    const req = reqMap.get(mapping.requirementId);
                    const source = req ? sourceMap.get(req.sourceId) : null;
                    return (
                      <TableRow key={mapping.id} className="group" data-testid={`row-mapping-${mapping.id}`}>
                        <TableCell className="max-w-[280px]">
                          <div>
                            <span className="font-medium text-sm" data-testid={`text-control-title-${mapping.id}`}>
                              {req?.title ?? `Control #${mapping.requirementId}`}
                            </span>
                            {req?.description && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2" data-testid={`text-control-desc-${mapping.id}`}>
                                {req.description}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm" data-testid={`text-framework-${mapping.id}`}>
                          {source?.shortName ?? "-"}
                        </TableCell>
                        <TableCell data-testid={`text-ai-match-${mapping.id}`}>
                          {mapping.aiMatchScore != null ? (
                            <div className="flex items-center gap-1.5">
                              <svg width="24" height="24" viewBox="0 0 36 36">
                                <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" strokeWidth="4" className="text-muted" />
                                <circle
                                  cx="18" cy="18" r="14" fill="none" strokeWidth="4" strokeLinecap="round"
                                  strokeDasharray={`${(mapping.aiMatchScore / 100) * 87.96} ${87.96}`}
                                  transform="rotate(-90 18 18)"
                                  className={mapping.aiMatchScore >= 80 ? "stroke-green-500 dark:stroke-green-400" : mapping.aiMatchScore >= 60 ? "stroke-amber-500 dark:stroke-amber-400" : "stroke-gray-400 dark:stroke-gray-500"}
                                />
                              </svg>
                              <span className="text-xs font-semibold">{mapping.aiMatchScore}%</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm max-w-[250px]" data-testid={`text-rationale-${mapping.id}`}>
                          {mapping.rationale ?? "-"}
                        </TableCell>
                        <TableCell data-testid={`text-coverage-${mapping.id}`}>
                          <Badge variant={mapping.coverageStatus === "Covered" ? "default" : "secondary"}>
                            {mapping.coverageStatus}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            data-testid={`button-unmap-${mapping.id}`}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground" data-testid="section-mapped-pagination">
            <span data-testid="text-mapped-pagination-info">
              {mappedStart} to {mappedEnd} of {mappedTotal} results
            </span>
            <div className="flex items-center gap-2">
              <span>Show per page</span>
              <Select value={String(mappedPageSize)} onValueChange={(v) => { setMappedPageSize(Number(v)); setMappedPage(1); }}>
                <SelectTrigger className="w-[65px] h-8" data-testid="select-mapped-page-size">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" disabled={mappedPage <= 1} onClick={() => setMappedPage((p) => p - 1)} data-testid="button-mapped-prev">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" disabled={mappedPage >= mappedTotalPages} onClick={() => setMappedPage((p) => p + 1)} data-testid="button-mapped-next">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {activeTab === "audits" && (
        <div className="space-y-4" data-testid="tabcontent-audits">
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-medium text-muted-foreground">Title</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground">Type</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground">Status</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground">Lead Auditor</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {docAudits.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No audits found for this document
                    </TableCell>
                  </TableRow>
                ) : (
                  docAudits.map((audit) => (
                    <TableRow key={audit.id} data-testid={`row-audit-${audit.id}`}>
                      <TableCell className="font-medium text-sm">{audit.title}</TableCell>
                      <TableCell><Badge variant="outline">{audit.auditType}</Badge></TableCell>
                      <TableCell><Badge variant="secondary">{audit.status}</Badge></TableCell>
                      <TableCell className="text-sm">{audit.leadAuditor ?? "-"}</TableCell>
                      <TableCell className="text-sm">
                        {audit.startDate ? format(new Date(audit.startDate), "dd MMM yyyy") : "-"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {activeTab === "comments" && (
        <div className="space-y-4" data-testid="tabcontent-comments">
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm">No comments yet</p>
          </div>
        </div>
      )}

      <Dialog open={addVersionOpen} onOpenChange={(open) => {
        setAddVersionOpen(open);
        if (!open) {
          versionForm.reset();
          setVersionFile(null);
        }
      }}>
        <DialogContent className="sm:max-w-[500px]" data-testid="dialog-add-version">
          <DialogHeader>
            <DialogTitle data-testid="text-dialog-title">Add Version</DialogTitle>
            <DialogDescription data-testid="text-dialog-description">
              Create a new version for this document. Optionally attach a PDF.
            </DialogDescription>
          </DialogHeader>
          <Form {...versionForm}>
            <form onSubmit={versionForm.handleSubmit(onVersionSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={versionForm.control}
                  name="version"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Version Number</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. 1.0" {...field} data-testid="input-version-number" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={versionForm.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-version-status">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {VERSION_STATUSES.map((s) => (
                            <SelectItem key={s} value={s} data-testid={`option-status-${s.toLowerCase().replace(/\s+/g, "-")}`}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={versionForm.control}
                name="changeReason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Change Reason</FormLabel>
                    <FormControl>
                      <Input placeholder="Reason for this version" {...field} data-testid="input-change-reason" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={versionForm.control}
                  name="createdBy"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Created By</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-created-by">
                            <SelectValue placeholder="Select user" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {activeUsers.map((u) => (
                            <SelectItem key={u.id} value={`${u.firstName} ${u.lastName}`} data-testid={`option-user-${u.id}`}>
                              {u.firstName} {u.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={versionForm.control}
                  name="effectiveDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Effective Date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value || null)}
                          data-testid="input-effective-date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div>
                <FormLabel>PDF Attachment (optional)</FormLabel>
                <input
                  ref={versionFileInputRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setVersionFile(f);
                    e.target.value = "";
                  }}
                  data-testid="input-version-pdf-file"
                />
                {versionFile ? (
                  <div className="mt-1.5 flex items-center gap-2 rounded-md border p-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm flex-1 truncate" data-testid="text-selected-filename">{versionFile.name}</span>
                    <span className="text-xs text-muted-foreground">{(versionFile.size / 1024).toFixed(0)} KB</span>
                    <Button type="button" size="icon" variant="ghost" onClick={() => setVersionFile(null)} data-testid="button-remove-file">
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <div
                    className={`mt-1.5 flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-6 cursor-pointer transition-colors ${
                      isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25"
                    }`}
                    onClick={() => versionFileInputRef.current?.click()}
                    onDragEnter={handleVersionDragEnter}
                    onDragLeave={handleVersionDragLeave}
                    onDragOver={handleVersionDragOver}
                    onDrop={handleVersionDrop}
                    data-testid="dropzone-pdf"
                  >
                    <Upload className="h-5 w-5 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Drop a PDF here or click to browse
                    </p>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setAddVersionOpen(false)} data-testid="button-cancel-version">
                  Cancel
                </Button>
                <Button type="submit" disabled={createVersionMutation.isPending} data-testid="button-submit-version">
                  {createVersionMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  Create Version
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={mapControlOpen} onOpenChange={setMapControlOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Map Controls to Document</DialogTitle>
            <DialogDescription>
              Search and select framework requirements to map to this document. Already mapped controls can be removed.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2 flex-wrap" data-testid="map-control-filters">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search requirements..."
                value={mapSearch}
                onChange={(e) => setMapSearch(e.target.value)}
                className="pl-9"
                data-testid="input-map-search"
              />
            </div>
            <Select value={mapFrameworkFilter} onValueChange={setMapFrameworkFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-map-framework">
                <SelectValue placeholder="Framework" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Frameworks</SelectItem>
                {allFrameworkOptions.map((f) => (
                  <SelectItem key={f} value={f}>{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 overflow-auto border rounded-md" data-testid="map-control-list">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-medium text-muted-foreground w-[100px]">Code</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground">Title</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground w-[130px]">Framework</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground w-[100px] text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mapControlRequirements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-32 text-center text-muted-foreground" data-testid="text-no-map-results">
                      No requirements found
                    </TableCell>
                  </TableRow>
                ) : (
                  mapControlRequirements.slice(0, 50).map((r) => {
                    const source = sourceMap.get(r.sourceId);
                    const isMapped = alreadyMappedReqIds.has(r.id);
                    const existingMapping = isMapped ? docMappings.find((m) => m.requirementId === r.id) : null;
                    return (
                      <TableRow key={r.id} data-testid={`row-map-req-${r.id}`}>
                        <TableCell className="font-mono text-sm font-medium" data-testid={`text-map-code-${r.id}`}>
                          {r.code}
                        </TableCell>
                        <TableCell data-testid={`text-map-title-${r.id}`}>
                          <div className="text-sm font-medium">{r.title}</div>
                          {r.description && (
                            <div className="text-xs text-muted-foreground truncate max-w-[350px]">{r.description}</div>
                          )}
                        </TableCell>
                        <TableCell data-testid={`text-map-fw-${r.id}`}>
                          <Badge className="bg-muted text-muted-foreground no-default-hover-elevate no-default-active-elevate">
                            {source?.shortName ?? "—"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {isMapped ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => existingMapping && removeMappingMutation.mutate(existingMapping.id)}
                              disabled={removeMappingMutation.isPending}
                              data-testid={`button-unmap-${r.id}`}
                            >
                              <X className="h-3 w-3 mr-1" />
                              Unmap
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => addMappingMutation.mutate(r.id)}
                              disabled={addMappingMutation.isPending}
                              data-testid={`button-map-${r.id}`}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Map
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
            {mapControlRequirements.length > 50 && (
              <p className="text-xs text-muted-foreground text-center py-2" data-testid="text-map-truncated">
                Showing first 50 of {mapControlRequirements.length} results. Refine your search to see more.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setMapControlOpen(false)} data-testid="button-close-map-control">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
