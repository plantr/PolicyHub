import { useEffect, useMemo, useRef, useState, useCallback } from "react";
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
  ControlMapping,
  Control,
  RegulatorySource,
  Audit,
  PolicyLink,
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
  AlertCircle,
  CircleDot,
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
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Link2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { uploadFileToStorage } from "@/lib/storage";
import { useAiJob, useCancelAiJob, persistJobId, getPersistedJobId, clearPersistedJobId } from "@/hooks/use-ai-job";

type AdminRecord = { id: number; label: string; value?: string; sortOrder: number; active: boolean };

const VERSION_STATUSES = ["Draft", "In Review", "Approved", "Published", "Superseded"];

const editDocSchema = z.object({
  documentReference: z.string().nullable().default(null),
  title: z.string().min(1, "Title is required"),
  docType: z.string().min(1, "Document type is required"),
  domain: z.string().min(1, "Domain is required"),
  owner: z.string().min(1, "Owner is required"),
  reviewFrequency: z.string().nullable().default(null),
  businessUnitId: z.number().nullable().default(null),
  tagsText: z.string().default(""),
  nextReviewDate: z.string().nullable().default(null),
});
type EditDocValues = z.infer<typeof editDocSchema>;

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
    queryFn: async () => {
      const res = await fetch(`/api/documents?id=${id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
  });

  const { data: versions, isLoading: versionsLoading } = useQuery<DocumentVersion[]>({
    queryKey: ["/api/document-versions", id],
    enabled: !!id,
    queryFn: async () => {
      const res = await fetch(`/api/document-versions?documentId=${id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch versions");
      return res.json();
    },
  });


  const { data: businessUnits } = useQuery<BusinessUnit[]>({
    queryKey: ["/api/business-units"],
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: allMappings } = useQuery<ControlMapping[]>({
    queryKey: ["/api/control-mappings"],
  });

  const { data: allRequirements } = useQuery<Control[]>({
    queryKey: ["/api/controls"],
  });

  const { data: allSources } = useQuery<RegulatorySource[]>({
    queryKey: ["/api/regulatory-sources"],
  });

  const { data: allAudits } = useQuery<Audit[]>({
    queryKey: ["/api/audits"],
  });

  const { data: allPolicyLinks } = useQuery<PolicyLink[]>({
    queryKey: ["/api/policy-links"],
  });

  const { data: allDocuments } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
  });

  const { data: categories } = useQuery<AdminRecord[]>({
    queryKey: ["/api/admin?table=document-domains"],
  });

  const activeDomains = useMemo(
    () => (categories ?? []).filter((c) => c.active).sort((a, b) => a.sortOrder - b.sortOrder),
    [categories],
  );

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
    const map = new Map<number, Control>();
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

  const gapMappings = useMemo(() => {
    return docMappings.filter((m) => m.coverageStatus !== "Covered");
  }, [docMappings]);

  const gapMetrics = useMemo(() => {
    const total = docMappings.length;
    const covered = docMappings.filter((m) => m.coverageStatus === "Covered").length;
    const partial = docMappings.filter((m) => m.coverageStatus === "Partially Covered").length;
    const notCovered = docMappings.filter((m) => m.coverageStatus === "Not Covered").length;
    return { total, covered, partial, notCovered };
  }, [docMappings]);

  const linkedFrameworks = useMemo(() => {
    const frameworkIds = new Set<number>();
    docMappings.forEach((m) => {
      const req = reqMap.get(m.controlId);
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

  const docLinks = useMemo(() => {
    if (!allPolicyLinks || !id) return [];
    const docId = Number(id);
    return allPolicyLinks.filter((l) => l.fromDocumentId === docId || l.toDocumentId === docId);
  }, [allPolicyLinks, id]);

  const docMap = useMemo(() => {
    const map = new Map<number, Document>();
    allDocuments?.forEach((d) => map.set(d.id, d));
    return map;
  }, [allDocuments]);

  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingVersionId, setUploadingVersionId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("versions");

  const [mappedSearch, setMappedSearch] = useState("");
  const [mappedFrameworkFilter, setMappedFrameworkFilter] = useState("all");
  const [mappedCodeFilter, setMappedCodeFilter] = useState("all");
  const [mappedPage, setMappedPage] = useState(1);
  const [mappedPageSize, setMappedPageSize] = useState(5);
  const [mappedSortCol, setMappedSortCol] = useState<string>("aiMatch");
  const [mappedSortDir, setMappedSortDir] = useState<"asc" | "desc">("desc");

  const [mapControlOpen, setMapControlOpen] = useState(false);
  const [mapSearch, setMapSearch] = useState("");
  const [mapFrameworkFilter, setMapFrameworkFilter] = useState("all");

  const mappedHasActiveFilters = mappedSearch.length > 0 || mappedFrameworkFilter !== "all" || mappedCodeFilter !== "all";

  const filteredMappings = useMemo(() => {
    return docMappings.filter((m) => {
      const req = reqMap.get(m.controlId);
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

  const sortedMappings = useMemo(() => {
    const sorted = [...filteredMappings];
    sorted.sort((a, b) => {
      let va: any, vb: any;
      const reqA = reqMap.get(a.controlId);
      const reqB = reqMap.get(b.controlId);
      switch (mappedSortCol) {
        case "control":
          va = (reqA?.title ?? "").toLowerCase();
          vb = (reqB?.title ?? "").toLowerCase();
          break;
        case "framework":
          va = (reqA ? sourceMap.get(reqA.sourceId)?.shortName ?? "" : "").toLowerCase();
          vb = (reqB ? sourceMap.get(reqB.sourceId)?.shortName ?? "" : "").toLowerCase();
          break;
        case "aiMatch":
          va = a.aiMatchScore ?? -1;
          vb = b.aiMatchScore ?? -1;
          break;
        case "rationale":
          va = (a.rationale ?? "").toLowerCase();
          vb = (b.rationale ?? "").toLowerCase();
          break;
        case "coverage":
          const order: Record<string, number> = { "Covered": 0, "Partially Covered": 1, "Not Covered": 2 };
          va = order[a.coverageStatus] ?? 3;
          vb = order[b.coverageStatus] ?? 3;
          break;
        default:
          return 0;
      }
      if (va < vb) return mappedSortDir === "asc" ? -1 : 1;
      if (va > vb) return mappedSortDir === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredMappings, mappedSortCol, mappedSortDir, reqMap, sourceMap]);

  const mappedTotal = sortedMappings.length;
  const mappedTotalPages = Math.max(1, Math.ceil(mappedTotal / mappedPageSize));
  const mappedPaginated = sortedMappings.slice((mappedPage - 1) * mappedPageSize, mappedPage * mappedPageSize);
  const mappedStart = mappedTotal === 0 ? 0 : (mappedPage - 1) * mappedPageSize + 1;
  const mappedEnd = Math.min(mappedPage * mappedPageSize, mappedTotal);

  const frameworkOptions = useMemo(() => {
    const set = new Set<string>();
    docMappings.forEach((m) => {
      const req = reqMap.get(m.controlId);
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
      const req = reqMap.get(m.controlId);
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

  function toggleMappedSort(col: string) {
    if (mappedSortCol === col) {
      setMappedSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setMappedSortCol(col);
      setMappedSortDir(col === "aiMatch" ? "desc" : "asc");
    }
    setMappedPage(1);
  }

  function MappedSortIcon({ col }: { col: string }) {
    if (mappedSortCol !== col) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return mappedSortDir === "asc" ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
  }

  const alreadyMappedReqIds = useMemo(() => {
    return new Set(docMappings.map((m) => m.controlId));
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
    mutationFn: async (controlId: number) => {
      const res = await apiRequest("POST", "/api/control-mappings", {
        controlId,
        documentId: Number(id),
        coverageStatus: "Not Covered",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/control-mappings"] });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to add mapping", description: err.message, variant: "destructive" });
    },
  });

  const removeMappingMutation = useMutation({
    mutationFn: async (mappingId: number) => {
      await apiRequest("DELETE", `/api/control-mappings?id=${mappingId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/control-mappings"] });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to remove mapping", description: err.message, variant: "destructive" });
    },
  });

  const [linkDocOpen, setLinkDocOpen] = useState(false);
  const [linkDocId, setLinkDocId] = useState<string>("");
  const [linkType, setLinkType] = useState<string>("Related to");

  const addLinkMutation = useMutation({
    mutationFn: async ({ toDocumentId, linkType }: { toDocumentId: number; linkType: string }) => {
      const res = await apiRequest("POST", "/api/policy-links", {
        fromDocumentId: Number(id),
        toDocumentId,
        linkType,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/policy-links"] });
      toast({ title: "Document linked" });
      setLinkDocOpen(false);
      setLinkDocId("");
      setLinkType("Related to");
    },
    onError: (err: Error) => {
      toast({ title: "Failed to link document", description: err.message, variant: "destructive" });
    },
  });

  const removeLinkMutation = useMutation({
    mutationFn: async (linkId: number) => {
      await apiRequest("DELETE", `/api/policy-links?id=${linkId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/policy-links"] });
      toast({ title: "Link removed" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to remove link", description: err.message, variant: "destructive" });
    },
  });

  const alreadyLinkedDocIds = useMemo(() => {
    const set = new Set<number>();
    docLinks.forEach((l) => {
      set.add(l.fromDocumentId);
      set.add(l.toDocumentId);
    });
    return set;
  }, [docLinks]);

  const [aiJobId, setAiJobId] = useState<string | null>(null);

  const aiJob = useAiJob(aiJobId);
  const cancelJob = useCancelAiJob();
  const aiAutoMapRunning = aiJobId !== null;
  const aiJobProgress = aiJob.data?.progressMessage;
  const storageKey = `map-controls:${id}`;

  // Restore job on mount from localStorage
  useEffect(() => {
    const saved = getPersistedJobId(storageKey);
    if (saved) setAiJobId(saved);
  }, [storageKey]);

  // Handle job completion/failure via useEffect
  useEffect(() => {
    if (!aiJob.data || !aiJobId) return;
    if (aiJob.data.status === "completed") {
      clearPersistedJobId(storageKey);
      queryClient.invalidateQueries({ queryKey: ["/api/control-mappings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      const result = aiJob.data.result as { matched?: number; total?: number; removed?: number } | null;
      const removedMsg = result?.removed ? `, removed ${result.removed} low-quality mappings` : "";
      toast({
        title: "AI Auto-Map Complete",
        description: `Matched ${result?.matched ?? 0} controls out of ${result?.total ?? 0} evaluated${removedMsg}`,
      });
      setAiJobId(null);
    } else if (aiJob.data.status === "failed") {
      clearPersistedJobId(storageKey);
      toast({ title: "AI Auto-Map Failed", description: aiJob.data.errorMessage || "Unknown error", variant: "destructive" });
      setAiJobId(null);
    } else if (aiJob.data.status === "cancelled") {
      clearPersistedJobId(storageKey);
      toast({ title: "AI Auto-Map Cancelled" });
      setAiJobId(null);
    }
  }, [aiJob.data?.status]);

  const [autoMapDialogOpen, setAutoMapDialogOpen] = useState(false);
  const [autoMapSelectedSources, setAutoMapSelectedSources] = useState<number[]>([]);

  const aiAutoMapMutation = useMutation({
    mutationFn: async (sourceIds?: number[]) => {
      const params = new URLSearchParams({ action: "map-controls", documentId: String(id) });
      if (sourceIds && sourceIds.length > 0) params.set("sourceIds", sourceIds.join(","));
      const res = await apiRequest("POST", `/api/ai-jobs?${params}`);
      return res.json();
    },
    onSuccess: (data: { jobId?: string; message?: string }) => {
      setAutoMapDialogOpen(false);
      if (data.jobId) {
        persistJobId(storageKey, data.jobId);
        setAiJobId(data.jobId);
      } else {
        // Early return (e.g. all controls already mapped) — no background job
        queryClient.invalidateQueries({ queryKey: ["/api/control-mappings"] });
        queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
        toast({ title: "AI Auto-Map Complete", description: data.message || "All controls already mapped" });
      }
    },
    onError: (err: Error) => {
      toast({ title: "AI Auto-Map Failed", description: err.message, variant: "destructive" });
    },
  });


  const uploadMutation = useMutation({
    mutationFn: async ({ versionId, file }: { versionId: number; file: File }) => {
      // Get signed upload URL
      const urlRes = await apiRequest(
        "POST",
        `/api/document-versions?id=${versionId}&action=upload-url`,
        { fileName: file.name, mimeType: file.type, fileSize: file.size }
      );
      const { signedUrl, token, path: objectPath, bucketId } = await urlRes.json();

      // Upload via TUS
      await uploadFileToStorage({ file, signedUrl, token, bucketId, objectPath });

      // Confirm upload
      const confirmRes = await apiRequest(
        "POST",
        `/api/document-versions?id=${versionId}&action=upload-confirm`,
        { storagePath: objectPath, fileName: file.name, fileSize: file.size }
      );
      return confirmRes.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/document-versions", id] });
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
      // Get signed download URL (JSON mode)
      const res = await fetch(`/api/document-versions?id=${versionId}&action=download&mode=download`, {
        headers: { Accept: "application/json" },
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Download failed");
      }
      const { url: signedUrl } = await res.json();
      const a = window.document.createElement("a");
      a.href = signedUrl;
      a.target = "_blank";
      a.click();
    },
    onSuccess: () => {},
    onError: (err: Error) => {
      toast({ title: "Download failed", description: err.message, variant: "destructive" });
    },
  });

  const deletePdfMutation = useMutation({
    mutationFn: async (versionId: number) => {
      const res = await apiRequest(
        "DELETE",
        `/api/document-versions?id=${versionId}&action=pdf`
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/document-versions", id] });
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

  // --- Edit details dialog ---
  const [editDetailsOpen, setEditDetailsOpen] = useState(false);
  const editForm = useForm<EditDocValues>({
    resolver: zodResolver(editDocSchema),
    defaultValues: { documentReference: null, title: "", docType: "", domain: "", owner: "", reviewFrequency: null, businessUnitId: null, tagsText: "", nextReviewDate: null },
  });

  function openEditDetailsDialog() {
    if (!document) return;
    editForm.reset({
      documentReference: document.documentReference ?? null,
      title: document.title,
      docType: document.docType,
      domain: document.domain,
      owner: document.owner,
      reviewFrequency: document.reviewFrequency ?? null,
      businessUnitId: document.businessUnitId ?? null,
      tagsText: (document.tags ?? []).join(", "),
      nextReviewDate: document.nextReviewDate ? new Date(document.nextReviewDate).toISOString().split("T")[0] : null,
    });
    setEditDetailsOpen(true);
  }

  const editDetailsMutation = useMutation({
    mutationFn: async (data: EditDocValues) => {
      const tags = data.tagsText.split(",").map((t) => t.trim()).filter(Boolean);
      const res = await apiRequest("PUT", `/api/documents?id=${document!.id}`, {
        documentReference: data.documentReference || null,
        title: data.title,
        docType: data.docType,
        domain: data.domain,
        owner: data.owner,
        reviewFrequency: data.reviewFrequency || null,
        businessUnitId: data.businessUnitId || null,
        nextReviewDate: data.nextReviewDate || null,
        tags,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({ title: "Document updated" });
      setEditDetailsOpen(false);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

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
      // Step 1: Create version record via JSON (metadata only)
      const verRes = await apiRequest("POST", "/api/document-versions", {
        documentId: Number(id),
        version: data.version,
        status: data.status,
        changeReason: data.changeReason || null,
        createdBy: data.createdBy,
        effectiveDate: data.effectiveDate || null,
        content: "No content",
      });
      const version = await verRes.json();

      // Step 2: If a file is attached, upload via TUS signed-URL flow
      if (versionFile) {
        const urlRes = await apiRequest(
          "POST",
          `/api/document-versions?id=${version.id}&action=upload-url`,
          { fileName: versionFile.name, mimeType: versionFile.type, fileSize: versionFile.size }
        );
        const { signedUrl, token, path: objectPath, bucketId } = await urlRes.json();

        await uploadFileToStorage({ file: versionFile, signedUrl, token, bucketId, objectPath });

        await apiRequest(
          "POST",
          `/api/document-versions?id=${version.id}&action=upload-confirm`,
          { storagePath: objectPath, fileName: versionFile.name, fileSize: versionFile.size }
        );
      }

      return version;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/document-versions", id] });
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
    ? `${document.title} (${document.documentReference}${document.domain ? " - " + document.domain : ""})`
    : document.title;

  const tabs = [
    { key: "versions", label: "Policy versions" },
    { key: "mapped", label: `Mapped elements (${docMappings.length})` },
    { key: "gaps", label: `Gaps (${gapMappings.length})` },
    { key: "related", label: `Related documents (${docLinks.length})` },
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
        <div className="space-y-3 flex-1 min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight leading-tight" data-testid="text-document-title">
            {titleDisplay}
          </h1>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-2 text-sm" data-testid="section-document-fields">
            <div>
              <span className="text-muted-foreground">Reference</span>
              <p className="font-medium" data-testid="text-doc-reference">{document.documentReference || <span className="text-muted-foreground/50">&mdash;</span>}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Type</span>
              <p className="font-medium" data-testid="text-doc-type">{document.docType}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Domain</span>
              <p className="font-medium" data-testid="text-doc-domain">{document.domain}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Owner</span>
              <p className="font-medium" data-testid="text-doc-owner">{document.owner}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Business Unit</span>
              <p className="font-medium" data-testid="text-doc-bu">{document.businessUnitId ? (buMap.get(document.businessUnitId) ?? "Unknown") : <span className="text-muted-foreground/50">&mdash;</span>}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Status</span>
              <p className="font-medium" data-testid="text-doc-status">
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className={`h-4 w-4 ${docStatus === "OK" ? "text-emerald-500 dark:text-emerald-400" : "text-muted-foreground"}`} />
                  <span className={docStatus === "OK" ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}>
                    {docStatus}
                  </span>
                </span>
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Review Frequency</span>
              <p className="font-medium" data-testid="text-review-frequency">{document.reviewFrequency || <span className="text-muted-foreground/50">&mdash;</span>}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Next Review</span>
              <p className="font-medium" data-testid="text-next-review">{document.nextReviewDate ? format(new Date(document.nextReviewDate), "MMM d, yyyy") : <span className="text-muted-foreground/50">&mdash;</span>}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Frameworks</span>
              <p className="font-medium" data-testid="text-framework-count">
                {linkedFrameworks.length > 0 ? (
                  <span className="inline-flex items-center gap-1.5">
                    <List className="h-4 w-4 text-muted-foreground" />
                    {linkedFrameworks.length}
                  </span>
                ) : <span className="text-muted-foreground/50">&mdash;</span>}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Created</span>
              <p className="font-medium" data-testid="text-doc-created">{document.createdAt ? format(new Date(document.createdAt), "MMM d, yyyy") : <span className="text-muted-foreground/50">&mdash;</span>}</p>
            </div>
            {(document.tags ?? []).length > 0 && (
              <div className="col-span-2">
                <span className="text-muted-foreground">Tags</span>
                <div className="flex flex-wrap gap-1 mt-0.5" data-testid="text-doc-tags">
                  {(document.tags ?? []).map((t) => (
                    <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                  ))}
                </div>
              </div>
            )}
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
          {aiAutoMapRunning ? (
            <Button
              variant="outline"
              size="sm"
              data-testid="button-ai-auto-map"
              onClick={() => aiJobId && cancelJob.mutate(aiJobId)}
            >
              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              {aiJobProgress || "Analysing..."}
              <X className="h-3.5 w-3.5 ml-1.5" />
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              data-testid="button-ai-auto-map"
              disabled={aiAutoMapMutation.isPending}
              onClick={() => { setAutoMapSelectedSources([]); setAutoMapDialogOpen(true); }}
            >
              <Sparkles className="h-4 w-4 mr-1.5 text-purple-500 dark:text-purple-400" />
              AI Auto-Map
            </Button>
          )}
          <Button variant="outline" size="sm" data-testid="button-edit-details" onClick={openEditDetailsDialog}>
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
                  <TableHead className="text-xs font-medium text-muted-foreground cursor-pointer select-none" data-testid="col-control" onClick={() => toggleMappedSort("control")}>
                    <span className="inline-flex items-center">Control<MappedSortIcon col="control" /></span>
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground cursor-pointer select-none" data-testid="col-frameworks" onClick={() => toggleMappedSort("framework")}>
                    <span className="inline-flex items-center">Frameworks<MappedSortIcon col="framework" /></span>
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground cursor-pointer select-none" data-testid="col-ai-match" onClick={() => toggleMappedSort("aiMatch")}>
                    <span className="inline-flex items-center">AI Match<MappedSortIcon col="aiMatch" /></span>
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground cursor-pointer select-none" data-testid="col-rationale" onClick={() => toggleMappedSort("rationale")}>
                    <span className="inline-flex items-center">Rationale<MappedSortIcon col="rationale" /></span>
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground cursor-pointer select-none" data-testid="col-coverage" onClick={() => toggleMappedSort("coverage")}>
                    <span className="inline-flex items-center">Coverage<MappedSortIcon col="coverage" /></span>
                  </TableHead>
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
                    const req = reqMap.get(mapping.controlId);
                    const source = req ? sourceMap.get(req.sourceId) : null;
                    return (
                      <TableRow key={mapping.id} className="group cursor-pointer" onClick={() => navigate(`/controls/${mapping.controlId}`)} data-testid={`row-mapping-${mapping.id}`}>
                        <TableCell className="max-w-[280px]">
                          <div>
                            <span className="font-medium text-sm" data-testid={`text-control-title-${mapping.id}`}>
                              {req?.title ?? `Control #${mapping.controlId}`}
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
                        <TableCell onClick={(e) => e.stopPropagation()}>
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
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="200">200</SelectItem>
                  <SelectItem value="500">500</SelectItem>
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

      {activeTab === "gaps" && (
        <div className="space-y-4" data-testid="tabcontent-gaps">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border rounded-md p-4" data-testid="card-gap-not-covered">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <span className="text-sm font-medium text-muted-foreground">Not Covered</span>
              </div>
              <p className="text-3xl font-bold">{gapMetrics.notCovered}</p>
              <p className="text-xs text-muted-foreground mt-1">controls not addressed by this policy</p>
            </div>
            <div className="border rounded-md p-4" data-testid="card-gap-partial">
              <div className="flex items-center gap-2 mb-1">
                <CircleDot className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-medium text-muted-foreground">Partially Covered</span>
              </div>
              <p className="text-3xl font-bold">{gapMetrics.partial}</p>
              <p className="text-xs text-muted-foreground mt-1">controls needing additional coverage</p>
            </div>
            <div className="border rounded-md p-4" data-testid="card-gap-covered">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span className="text-sm font-medium text-muted-foreground">Fully Covered</span>
              </div>
              <p className="text-3xl font-bold">{gapMetrics.covered}</p>
              <p className="text-xs text-muted-foreground mt-1">controls with full policy coverage</p>
            </div>
          </div>

          {gapMappings.length === 0 ? (
            <div className="border rounded-md py-12 text-center text-muted-foreground" data-testid="text-no-gaps">
              All mapped controls are fully covered by this policy. No gaps identified.
            </div>
          ) : (
            <div className="border rounded-md" data-testid="gaps-table">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs font-medium text-muted-foreground">Control</TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground">Framework</TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground">Coverage</TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground">AI Match %</TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground">Recommendation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gapMappings.map((mapping) => {
                    const req = reqMap.get(mapping.controlId);
                    const source = req ? sourceMap.get(req.sourceId) : null;
                    return (
                      <TableRow key={mapping.id} className="cursor-pointer" onClick={() => navigate(`/controls/${mapping.controlId}`)} data-testid={`gap-row-${mapping.id}`}>
                        <TableCell className="max-w-[280px]">
                          <div>
                            <span className="font-mono text-xs text-muted-foreground mr-1.5">{req?.code}</span>
                            <span className="font-medium text-sm">{req?.title ?? `Control #${mapping.controlId}`}</span>
                            {req?.description && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{req.description}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{source?.shortName ?? "-"}</TableCell>
                        <TableCell>
                          <Badge variant={mapping.coverageStatus === "Partially Covered" ? "secondary" : "destructive"} className="text-xs">
                            {mapping.coverageStatus}
                          </Badge>
                        </TableCell>
                        <TableCell>
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
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-normal">
                          {mapping.aiMatchRecommendations ?? mapping.aiMatchRationale ?? "--"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      {activeTab === "related" && (
        <div className="space-y-4" data-testid="tabcontent-related">
          <div className="flex flex-wrap items-center gap-2">
            <div className="ml-auto">
              <Button variant="outline" size="sm" onClick={() => { setLinkDocOpen(true); setLinkDocId(""); setLinkType("Related to"); }} data-testid="button-link-document">
                <Link2 className="h-3.5 w-3.5 mr-1" />
                Link Document
              </Button>
            </div>
          </div>

          <div className="border rounded-md" data-testid="related-documents-table">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-medium text-muted-foreground" data-testid="col-related-document">Document</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground" data-testid="col-related-type">Type</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground" data-testid="col-related-link-type">Link Type</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground w-[50px]" data-testid="col-related-action"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {docLinks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8" data-testid="text-no-related">
                      No related documents
                    </TableCell>
                  </TableRow>
                ) : (
                  docLinks.map((link) => {
                    const otherDocId = link.fromDocumentId === Number(id) ? link.toDocumentId : link.fromDocumentId;
                    const otherDoc = docMap.get(otherDocId);
                    return (
                      <TableRow key={link.id} data-testid={`row-link-${link.id}`}>
                        <TableCell>
                          <Link href={`/documents/${otherDocId}`}>
                            <span className="text-sm font-medium text-primary hover:underline cursor-pointer" data-testid={`link-doc-${link.id}`}>
                              {otherDoc?.title ?? `Document #${otherDocId}`}
                            </span>
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" data-testid={`badge-doctype-${link.id}`}>
                            {otherDoc?.docType ?? "-"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" data-testid={`badge-linktype-${link.id}`}>
                            {link.linkType}
                          </Badge>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => removeLinkMutation.mutate(link.id)}
                            disabled={removeLinkMutation.isPending}
                            data-testid={`button-unlink-${link.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
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
              Search and select framework controls to map to this document. Already mapped controls can be removed.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2 flex-wrap" data-testid="map-control-filters">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search controls..."
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
                      No controls found
                    </TableCell>
                  </TableRow>
                ) : (
                  mapControlRequirements.slice(0, 50).map((r) => {
                    const source = sourceMap.get(r.sourceId);
                    const isMapped = alreadyMappedReqIds.has(r.id);
                    const existingMapping = isMapped ? docMappings.find((m) => m.controlId === r.id) : null;
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

      <Dialog open={linkDocOpen} onOpenChange={(open) => {
        setLinkDocOpen(open);
        if (!open) { setLinkDocId(""); setLinkType("Related to"); }
      }}>
        <DialogContent className="sm:max-w-[450px]" data-testid="dialog-link-document">
          <DialogHeader>
            <DialogTitle data-testid="text-link-dialog-title">Link Document</DialogTitle>
            <DialogDescription data-testid="text-link-dialog-description">
              Select a document and link type to create a relationship.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Document</label>
              <Select value={linkDocId} onValueChange={setLinkDocId}>
                <SelectTrigger data-testid="select-link-document">
                  <SelectValue placeholder="Select a document" />
                </SelectTrigger>
                <SelectContent>
                  {(allDocuments ?? [])
                    .filter((d) => d.id !== Number(id) && !alreadyLinkedDocIds.has(d.id))
                    .map((d) => (
                      <SelectItem key={d.id} value={String(d.id)} data-testid={`option-link-doc-${d.id}`}>
                        {d.title}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Link Type</label>
              <Select value={linkType} onValueChange={setLinkType}>
                <SelectTrigger data-testid="select-link-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="References">References</SelectItem>
                  <SelectItem value="Supersedes">Supersedes</SelectItem>
                  <SelectItem value="Related to">Related to</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setLinkDocOpen(false)} data-testid="button-cancel-link">
              Cancel
            </Button>
            <Button
              disabled={!linkDocId || addLinkMutation.isPending}
              onClick={() => addLinkMutation.mutate({ toDocumentId: Number(linkDocId), linkType })}
              data-testid="button-submit-link"
            >
              {addLinkMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={autoMapDialogOpen} onOpenChange={(open) => { setAutoMapDialogOpen(open); if (!open) setAutoMapSelectedSources([]); }}>
        <DialogContent className="sm:max-w-[440px]" data-testid="dialog-auto-map">
          <DialogHeader>
            <DialogTitle>AI Auto-Map</DialogTitle>
            <DialogDescription>
              Select which frameworks to map this document against. Leave all unchecked to map against all frameworks.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 py-2 max-h-[300px] overflow-y-auto">
            {(allSources ?? []).map((s) => (
              <label key={s.id} className="flex items-center gap-2 px-1 py-1.5 rounded hover:bg-muted cursor-pointer">
                <Checkbox
                  checked={autoMapSelectedSources.includes(s.id)}
                  onCheckedChange={(checked) => {
                    setAutoMapSelectedSources((prev) =>
                      checked ? [...prev, s.id] : prev.filter((id) => id !== s.id)
                    );
                  }}
                />
                <span className="text-sm">{s.shortName || s.name}</span>
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setAutoMapDialogOpen(false); setAutoMapSelectedSources([]); }}>
              Cancel
            </Button>
            <Button
              disabled={aiAutoMapMutation.isPending}
              onClick={() => aiAutoMapMutation.mutate(autoMapSelectedSources.length > 0 ? autoMapSelectedSources : undefined)}
            >
              {aiAutoMapMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              Start Mapping
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Details Dialog */}
      <Dialog open={editDetailsOpen} onOpenChange={setEditDetailsOpen}>
        <DialogContent className="sm:max-w-[550px]" data-testid="dialog-edit-details">
          <DialogHeader>
            <DialogTitle>Edit Document Details</DialogTitle>
            <DialogDescription>Update document metadata.</DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit((v) => editDetailsMutation.mutate(v))} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={editForm.control} name="documentReference" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reference</FormLabel>
                    <FormControl><Input {...field} value={field.value ?? ""} placeholder="e.g. OG-POL-001" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={editForm.control} name="title" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={editForm.control} name="docType" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="Policy">Policy</SelectItem>
                        <SelectItem value="Standard">Standard</SelectItem>
                        <SelectItem value="Procedure">Procedure</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={editForm.control} name="domain" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Domain</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select domain" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {activeDomains.map((c) => (
                          <SelectItem key={c.id} value={c.label}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={editForm.control} name="owner" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Owner</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select owner" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {activeUsers.map((u) => (
                          <SelectItem key={u.id} value={`${u.firstName} ${u.lastName}`}>{u.firstName} {u.lastName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={editForm.control} name="businessUnitId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Unit</FormLabel>
                    <Select onValueChange={(v) => field.onChange(v ? Number(v) : null)} value={field.value?.toString() ?? ""}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {businessUnits?.map((bu) => (
                          <SelectItem key={bu.id} value={bu.id.toString()}>{bu.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={editForm.control} name="reviewFrequency" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Review Frequency</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ""}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select frequency" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="Monthly">Monthly</SelectItem>
                        <SelectItem value="Quarterly">Quarterly</SelectItem>
                        <SelectItem value="Semi-annual">Semi-annual</SelectItem>
                        <SelectItem value="Annual">Annual</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={editForm.control} name="nextReviewDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Next Review Date</FormLabel>
                    <FormControl><Input type="date" {...field} value={field.value ?? ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={editForm.control} name="tagsText" render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags (comma-separated)</FormLabel>
                  <FormControl><Input {...field} placeholder="e.g. Data Protection, GDPR" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditDetailsOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={editDetailsMutation.isPending}>
                  {editDetailsMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                  Save changes
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
