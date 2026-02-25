import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "wouter";
import { format } from "date-fns";
import type { Document, BusinessUnit, User, DocumentVersion, Approval, ControlMapping, RegulatorySource, Control } from "@shared/schema";
import { insertDocumentSchema } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Upload, FileText, FileUp, X, Search, CheckCircle2, MoreHorizontal, ChevronLeft, ChevronRight, ChevronDown, RotateCcw, ArrowUpDown, ArrowUp, ArrowDown, Sparkles, Loader2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { uploadFileToStorage } from "@/lib/storage";
import { useAiJob, useCancelAiJob, persistJobId, getPersistedJobId, clearPersistedJobId } from "@/hooks/use-ai-job";

type AdminRecord = { id: number; label: string; value?: string; sortOrder: number; active: boolean };
const REVIEW_FREQUENCIES = ["Annual", "Semi-Annual", "Quarterly", "Monthly"];

const docFormSchema = insertDocumentSchema
  .omit({ tags: true, nextReviewDate: true, delegates: true, reviewers: true, approvers: true, parentDocumentId: true })
  .extend({
    documentReference: z.string().nullable().default(null),
    title: z.string().min(1, "Title is required"),
    docType: z.string().min(1, "Document type is required"),
    taxonomy: z.string().min(1, "Taxonomy is required"),
    owner: z.string().min(1, "Owner is required"),
    tagsText: z.string().default(""),
    nextReviewDate: z.string().nullable().default(null),
  });

type DocFormValues = z.infer<typeof docFormSchema>;

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function getAvatarColor(name: string): string {
  const colors = [
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
    "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
    "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
    "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300",
    "bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export default function Documents() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [versionFilter, setVersionFilter] = useState("all");
  const [approverFilter, setApproverFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [frameworkFilter, setFrameworkFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("all");
  const [sortColumn, setSortColumn] = useState<string>("version");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingDoc, setDeletingDoc] = useState<Document | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const [autoMapDialogOpen, setAutoMapDialogOpen] = useState(false);
  const [autoMapSourceId, setAutoMapSourceId] = useState<string>("all");
  const [autoMapJobId, setAutoMapJobId] = useState<string | null>(null);
  const autoMapJob = useAiJob(autoMapJobId);
  const cancelJob = useCancelAiJob();
  const autoMapRunning = autoMapJobId !== null;

  const [mdRefreshJobId, setMdRefreshJobId] = useState<string | null>(null);
  const mdRefreshJob = useAiJob(mdRefreshJobId);
  const mdRefreshRunning = mdRefreshJobId !== null;

  // Restore jobs on mount from localStorage
  useEffect(() => {
    const saved = getPersistedJobId("map-all-documents");
    if (saved) setAutoMapJobId(saved);
    const savedMd = getPersistedJobId("bulk-pdf-to-markdown");
    if (savedMd) setMdRefreshJobId(savedMd);
  }, []);

  const form = useForm<DocFormValues>({
    resolver: zodResolver(docFormSchema),
    defaultValues: {
      documentReference: null,
      title: "",
      docType: "",
      taxonomy: "",
      owner: "",
      reviewFrequency: null,
      businessUnitId: null,
      tagsText: "",
      nextReviewDate: null,
    },
  });

  const { data: documents, isLoading: docsLoading } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
  });

  const { data: businessUnits, isLoading: busLoading } = useQuery<BusinessUnit[]>({
    queryKey: ["/api/business-units"],
  });

  const { data: categories } = useQuery<AdminRecord[]>({
    queryKey: ["/api/admin?table=document-categories"],
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: versions } = useQuery<DocumentVersion[]>({
    queryKey: ["/api/document-versions"],
  });

  const { data: approvalsData } = useQuery<Approval[]>({
    queryKey: ["/api/approvals"],
  });

  const { data: mappings } = useQuery<ControlMapping[]>({
    queryKey: ["/api/control-mappings"],
  });

  const { data: requirements } = useQuery<Control[]>({
    queryKey: ["/api/controls"],
  });

  const { data: sources } = useQuery<RegulatorySource[]>({
    queryKey: ["/api/regulatory-sources"],
  });

  const activeUsers = useMemo(
    () => (users ?? []).filter((u) => u.status === "Active").sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)),
    [users],
  );

  const activeCategories = useMemo(
    () => (categories ?? []).filter((c) => c.active).sort((a, b) => a.sortOrder - b.sortOrder),
    [categories],
  );

  const isLoading = docsLoading || busLoading;

  const buMap = useMemo(() => {
    const map = new Map<number, string>();
    businessUnits?.forEach((bu) => map.set(bu.id, bu.name));
    return map;
  }, [businessUnits]);

  const latestVersionMap = useMemo(() => {
    const map = new Map<number, DocumentVersion>();
    (versions ?? []).forEach((v) => {
      const existing = map.get(v.documentId);
      if (!existing || v.id > existing.id) map.set(v.documentId, v);
    });
    return map;
  }, [versions]);

  const approvalsByDoc = useMemo(() => {
    const map = new Map<number, { approved: number; total: number; approver: string | null }>();
    const docApprovals = (approvalsData ?? []).filter((a) => a.entityType === "document" || a.entityType === "version");
    const grouped = new Map<number, Approval[]>();
    docApprovals.forEach((a) => {
      const docId = a.entityId;
      if (!grouped.has(docId)) grouped.set(docId, []);
      grouped.get(docId)!.push(a);
    });
    grouped.forEach((apps, docId) => {
      const approved = apps.filter((a) => a.status === "Approved").length;
      const lastApprover = apps.length > 0 ? apps[apps.length - 1].approver : null;
      map.set(docId, { approved, total: apps.length || 1, approver: lastApprover });
    });
    return map;
  }, [approvalsData]);

  const publishedVersionMap = useMemo(() => {
    const map = new Map<number, string>();
    (versions ?? []).forEach((v) => {
      if (v.status === "Published") map.set(v.documentId, v.version);
    });
    return map;
  }, [versions]);

  const docControlsCountMap = useMemo(() => {
    const map = new Map<number, number>();
    (mappings ?? []).forEach((m) => {
      if (m.documentId == null) return;
      map.set(m.documentId, (map.get(m.documentId) ?? 0) + 1);
    });
    return map;
  }, [mappings]);

  const docFrameworkMap = useMemo(() => {
    const map = new Map<number, string[]>();
    const reqMap = new Map<number, Control>();
    (requirements ?? []).forEach((r) => reqMap.set(r.id, r));
    const srcMap = new Map<number, RegulatorySource>();
    (sources ?? []).forEach((s) => srcMap.set(s.id, s));

    (mappings ?? []).forEach((m) => {
      if (m.documentId == null) return;
      const req = reqMap.get(m.controlId);
      if (!req) return;
      const src = srcMap.get(req.sourceId);
      if (!src) return;
      const label = src.shortName || src.name;
      if (!map.has(m.documentId)) map.set(m.documentId, []);
      const arr = map.get(m.documentId)!;
      if (!arr.includes(label)) arr.push(label);
    });
    return map;
  }, [mappings, requirements, sources]);

  const uniqueFrameworks = useMemo(() => {
    const set = new Set<string>();
    docFrameworkMap.forEach((labels) => labels.forEach((l) => set.add(l)));
    return Array.from(set).sort();
  }, [docFrameworkMap]);

  const uniqueApprovers = useMemo(() => {
    const set = new Set<string>();
    approvalsByDoc.forEach((v) => { if (v.approver) set.add(v.approver); });
    return Array.from(set).sort();
  }, [approvalsByDoc]);

  const getOverallStatus = (doc: Document) => {
    const ver = latestVersionMap.get(doc.id);
    if (ver && (ver.status === "Approved" || ver.status === "Published")) return "OK";
    const approval = approvalsByDoc.get(doc.id);
    if (approval && approval.approved >= approval.total) return "OK";
    return "Needs attention";
  };

  const hasActiveFilters = statusFilter !== "all" || versionFilter !== "all" || approverFilter !== "all" || frameworkFilter !== "all" || sourceFilter !== "all" || typeFilter !== "all" || categoryFilter !== "all" || searchQuery.length > 0;

  const filteredDocuments = useMemo(() => {
    if (!documents) return [];
    let filtered = documents.filter((doc) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!doc.title.toLowerCase().includes(q) && !(doc.documentReference ?? "").toLowerCase().includes(q)) return false;
      }
      if (typeFilter !== "all") {
        if (doc.docType !== typeFilter) return false;
      }
      if (categoryFilter !== "all") {
        if (doc.taxonomy !== categoryFilter) return false;
      }
      if (statusFilter !== "all") {
        const status = getOverallStatus(doc);
        if (statusFilter === "ok" && status !== "OK") return false;
        if (statusFilter === "attention" && status !== "Needs attention") return false;
      }
      if (versionFilter !== "all") {
        const ver = latestVersionMap.get(doc.id);
        if (!ver || ver.status !== versionFilter) return false;
      }
      if (approverFilter !== "all") {
        const a = approvalsByDoc.get(doc.id);
        if (!a || a.approver !== approverFilter) return false;
      }
      if (frameworkFilter !== "all") {
        const fw = docFrameworkMap.get(doc.id) ?? [];
        if (!fw.includes(frameworkFilter)) return false;
      }
      if (sourceFilter !== "all") {
        const fw = docFrameworkMap.get(doc.id) ?? [];
        if (!fw.includes(sourceFilter)) return false;
      }
      return true;
    });
    filtered.sort((a, b) => {
      let cmp = 0;
      switch (sortColumn) {
        case "reference":
          cmp = (a.documentReference || "").localeCompare(b.documentReference || "");
          break;
        case "name":
          cmp = a.title.localeCompare(b.title);
          break;
        case "type":
          cmp = (a.docType || "").localeCompare(b.docType || "");
          break;
        case "category":
          cmp = (a.taxonomy || "").localeCompare(b.taxonomy || "");
          break;
        case "owner":
          cmp = (a.owner || "").localeCompare(b.owner || "");
          break;
        case "bu": {
          const buA = (a.businessUnitId ? buMap.get(a.businessUnitId) : "") ?? "";
          const buB = (b.businessUnitId ? buMap.get(b.businessUnitId) : "") ?? "";
          cmp = buA.localeCompare(buB);
          break;
        }
        case "status": {
          const sa = getOverallStatus(a);
          const sb = getOverallStatus(b);
          cmp = sa.localeCompare(sb);
          break;
        }
        case "frequency":
          cmp = (a.reviewFrequency || "").localeCompare(b.reviewFrequency || "");
          break;
        case "renew": {
          const da = a.nextReviewDate ? new Date(a.nextReviewDate).getTime() : 0;
          const db = b.nextReviewDate ? new Date(b.nextReviewDate).getTime() : 0;
          cmp = da - db;
          break;
        }
        case "version": {
          const va = latestVersionMap.get(a.id);
          const vb = latestVersionMap.get(b.id);
          const na = va ? parseFloat(va.version) || 0 : 0;
          const nb = vb ? parseFloat(vb.version) || 0 : 0;
          cmp = na - nb;
          break;
        }
        case "tags":
          cmp = (a.tags ?? []).join(", ").localeCompare((b.tags ?? []).join(", "));
          break;
        case "controls": {
          const ca = docControlsCountMap.get(a.id) ?? 0;
          const cb = docControlsCountMap.get(b.id) ?? 0;
          cmp = ca - cb;
          break;
        }
        case "framework": {
          const fa = (docFrameworkMap.get(a.id) ?? []).join(", ");
          const fb = (docFrameworkMap.get(b.id) ?? []).join(", ");
          cmp = fa.localeCompare(fb);
          break;
        }
        case "created": {
          const creA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const creB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          cmp = creA - creB;
          break;
        }
        default:
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return filtered;
  }, [documents, searchQuery, typeFilter, categoryFilter, statusFilter, versionFilter, approverFilter, frameworkFilter, sourceFilter, latestVersionMap, approvalsByDoc, docFrameworkMap, sortColumn, sortDir, docControlsCountMap, buMap]);

  function toggleSort(col: string) {
    if (sortColumn === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(col);
      setSortDir("asc");
    }
    setCurrentPage(1);
  }

  function SortIcon({ col }: { col: string }) {
    if (sortColumn !== col) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-30" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
  }

  const totalResults = filteredDocuments.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / pageSize));
  const paginatedDocs = filteredDocuments.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const startItem = totalResults === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalResults);

  function resetFilters() {
    setTypeFilter("all");
    setCategoryFilter("all");
    setStatusFilter("all");
    setVersionFilter("all");
    setApproverFilter("all");
    setFrameworkFilter("all");
    setSourceFilter("all");
    setSearchQuery("");
    setCurrentPage(1);
  }

  const createMutation = useMutation({
    mutationFn: async (data: DocFormValues) => {
      const tags = data.tagsText
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      // Step 1: Create document record via JSON (metadata only)
      const docRes = await apiRequest("POST", "/api/documents", {
        documentReference: data.documentReference || null,
        title: data.title,
        docType: data.docType,
        taxonomy: data.taxonomy,
        owner: data.owner,
        reviewFrequency: data.reviewFrequency || null,
        nextReviewDate: data.nextReviewDate || null,
        businessUnitId: data.businessUnitId || null,
        tags,
      });
      const doc = await docRes.json();

      // Step 2: If a file is selected, create a version and upload via TUS signed-URL flow
      if (selectedFile) {
        // Create initial draft version
        const verRes = await apiRequest("POST", "/api/document-versions", {
          documentId: doc.id,
          version: "1.0",
          status: "Draft",
          createdBy: data.owner,
          content: "No content",
        });
        const version = await verRes.json();

        // Get signed upload URL
        const urlRes = await apiRequest(
          "POST",
          `/api/document-versions?id=${version.id}&action=upload-url`,
          { fileName: selectedFile.name, mimeType: selectedFile.type, fileSize: selectedFile.size }
        );
        const { signedUrl, token, path: objectPath, bucketId } = await urlRes.json();

        // Upload via TUS
        await uploadFileToStorage({
          file: selectedFile,
          signedUrl,
          token,
          bucketId,
          objectPath,
        });

        // Confirm upload
        await apiRequest(
          "POST",
          `/api/document-versions?id=${version.id}&action=upload-confirm`,
          { storagePath: objectPath, fileName: selectedFile.name, fileSize: selectedFile.size }
        );
      }

      return doc;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/document-versions"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      toast({ title: "Document created" });
      closeDialog();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: DocFormValues }) => {
      const tags = data.tagsText
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const res = await apiRequest("PUT", `/api/documents/${id}`, {
        documentReference: data.documentReference || null,
        title: data.title,
        docType: data.docType,
        taxonomy: data.taxonomy,
        owner: data.owner,
        reviewFrequency: data.reviewFrequency || null,
        businessUnitId: data.businessUnitId || null,
        nextReviewDate: data.nextReviewDate || null,
        tags,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({ title: "Document updated" });
      closeDialog();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/documents?id=${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      toast({ title: "Document deleted" });
      setDeleteConfirmOpen(false);
      setDeletingDoc(null);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  useEffect(() => {
    if (!autoMapJob.data || !autoMapJobId) return;
    if (autoMapJob.data.status === "completed") {
      clearPersistedJobId("map-all-documents");
      queryClient.invalidateQueries({ queryKey: ["/api/control-mappings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      const result = autoMapJob.data.result as { documentsProcessed?: number; totalMapped?: number } | null;
      toast({
        title: "AI Auto-Map Complete",
        description: `Processed ${result?.documentsProcessed ?? 0} documents, mapped ${result?.totalMapped ?? 0} controls`,
      });
      setAutoMapJobId(null);
    } else if (autoMapJob.data.status === "failed") {
      clearPersistedJobId("map-all-documents");
      toast({ title: "AI Auto-Map Failed", description: autoMapJob.data.errorMessage || "Unknown error", variant: "destructive" });
      setAutoMapJobId(null);
    } else if (autoMapJob.data.status === "cancelled") {
      clearPersistedJobId("map-all-documents");
      toast({ title: "AI Auto-Map Cancelled" });
      setAutoMapJobId(null);
    }
  }, [autoMapJob.data?.status]);

  useEffect(() => {
    if (!mdRefreshJob.data || !mdRefreshJobId) return;
    if (mdRefreshJob.data.status === "completed") {
      clearPersistedJobId("bulk-pdf-to-markdown");
      queryClient.invalidateQueries({ queryKey: ["/api/document-versions"] });
      const result = mdRefreshJob.data.result as { total?: number; converted?: number; skipped?: number } | null;
      toast({
        title: "Markdown Refresh Complete",
        description: `Converted ${result?.converted ?? 0} of ${result?.total ?? 0} documents`,
      });
      setMdRefreshJobId(null);
    } else if (mdRefreshJob.data.status === "failed") {
      clearPersistedJobId("bulk-pdf-to-markdown");
      toast({ title: "Markdown Refresh Failed", description: mdRefreshJob.data.errorMessage || "Unknown error", variant: "destructive" });
      setMdRefreshJobId(null);
    } else if (mdRefreshJob.data.status === "cancelled") {
      clearPersistedJobId("bulk-pdf-to-markdown");
      toast({ title: "Markdown Refresh Cancelled" });
      setMdRefreshJobId(null);
    }
  }, [mdRefreshJob.data?.status]);

  const mdRefreshMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ai-jobs?action=bulk-pdf-to-markdown");
      return res.json();
    },
    onSuccess: (data: { jobId?: string; message?: string }) => {
      if (data.jobId) {
        persistJobId("bulk-pdf-to-markdown", data.jobId);
        setMdRefreshJobId(data.jobId);
      } else {
        toast({ title: "Markdown Refresh", description: data.message || "Nothing to process" });
      }
    },
    onError: (err: Error) => {
      toast({ title: "Markdown Refresh Failed", description: err.message, variant: "destructive" });
    },
  });

  const autoMapMutation = useMutation({
    mutationFn: async ({ mode, sourceId }: { mode: "full" | "unmapped"; sourceId?: number }) => {
      const params = new URLSearchParams({ action: "map-all-documents" });
      if (mode === "unmapped") params.set("mode", "unmapped");
      if (sourceId) params.set("sourceId", String(sourceId));
      const res = await apiRequest("POST", `/api/ai-jobs?${params}`);
      return res.json();
    },
    onSuccess: (data: { jobId?: string; message?: string }) => {
      setAutoMapDialogOpen(false);
      if (data.jobId) {
        persistJobId("map-all-documents", data.jobId);
        setAutoMapJobId(data.jobId);
      } else {
        toast({ title: "AI Auto-Map", description: data.message || "Nothing to process" });
      }
    },
    onError: (err: Error) => {
      toast({ title: "AI Auto-Map Failed", description: err.message, variant: "destructive" });
    },
  });

  const handleFileSelect = useCallback((file: File) => {
    if (file.type !== "application/pdf") {
      toast({ title: "Invalid file", description: "Only PDF files are accepted", variant: "destructive" });
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum file size is 50 MB", variant: "destructive" });
      return;
    }
    setSelectedFile(file);
  }, [toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current = 0;
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current += 1;
    setIsDragging(true);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDragging(false);
    }
  }, []);

  function openCreateDialog() {
    setEditingDoc(null);
    setSelectedFile(null);
    form.reset({
      documentReference: null,
      title: "",
      docType: "",
      taxonomy: "",
      owner: "",
      reviewFrequency: null,
      businessUnitId: null,
      tagsText: "",
      nextReviewDate: null,
    });
    setDialogOpen(true);
  }

  function openEditDialog(doc: Document) {
    setEditingDoc(doc);
    form.reset({
      documentReference: doc.documentReference ?? null,
      title: doc.title,
      docType: doc.docType,
      taxonomy: doc.taxonomy,
      owner: doc.owner,
      reviewFrequency: doc.reviewFrequency ?? null,
      businessUnitId: doc.businessUnitId ?? null,
      tagsText: (doc.tags ?? []).join(", "),
      nextReviewDate: doc.nextReviewDate ? new Date(doc.nextReviewDate).toISOString().split("T")[0] : null,
    });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingDoc(null);
    setSelectedFile(null);
    setIsDragging(false);
  }

  function onSubmit(values: DocFormValues) {
    if (editingDoc) {
      updateMutation.mutate({ id: editingDoc.id, data: values });
    } else {
      createMutation.mutate(values);
    }
  }

  const tabs = [
    { id: "all", label: "All" },
    { id: "needs-approval", label: "Needs approval" },
    { id: "needs-reassignment", label: "Needs reassignment" },
  ];

  return (
    <div className="space-y-4" data-testid="page-documents">
      <div className="flex flex-wrap items-center gap-4 border-b" data-testid="section-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setCurrentPage(1); }}
            className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            data-testid={`tab-${tab.id}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2" data-testid="section-filters">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search"
            className="pl-9 w-[160px]"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            data-testid="input-search-documents"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="text-sm" data-testid="filter-type">
              Type <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => { setTypeFilter("all"); setCurrentPage(1); }}>All</DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setTypeFilter("Policy"); setCurrentPage(1); }}>Policy</DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setTypeFilter("Standard"); setCurrentPage(1); }}>Standard</DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setTypeFilter("Procedure"); setCurrentPage(1); }}>Procedure</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="text-sm" data-testid="filter-category">
              Category <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => { setCategoryFilter("all"); setCurrentPage(1); }}>All</DropdownMenuItem>
            {activeCategories.map((c) => (
              <DropdownMenuItem key={c.id} onClick={() => { setCategoryFilter(c.label); setCurrentPage(1); }}>{c.label}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="text-sm" data-testid="filter-status">
              Overall status <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => { setStatusFilter("all"); setCurrentPage(1); }}>All</DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setStatusFilter("ok"); setCurrentPage(1); }}>OK</DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setStatusFilter("attention"); setCurrentPage(1); }}>Needs attention</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="text-sm" data-testid="filter-version">
              Latest version <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => { setVersionFilter("all"); setCurrentPage(1); }}>All</DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setVersionFilter("Approved"); setCurrentPage(1); }}>Approved</DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setVersionFilter("Draft"); setCurrentPage(1); }}>Draft</DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setVersionFilter("Published"); setCurrentPage(1); }}>Published</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="text-sm" data-testid="filter-approver">
              Approver <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => { setApproverFilter("all"); setCurrentPage(1); }}>All</DropdownMenuItem>
            {uniqueApprovers.map((a) => (
              <DropdownMenuItem key={a} onClick={() => { setApproverFilter(a); setCurrentPage(1); }}>{a}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="text-sm" data-testid="filter-framework">
              Framework <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => { setFrameworkFilter("all"); setCurrentPage(1); }}>All</DropdownMenuItem>
            {(sources ?? []).map((s) => (
              <DropdownMenuItem key={s.id} onClick={() => { setFrameworkFilter(s.shortName || s.name); setCurrentPage(1); }}>{s.shortName || s.name}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="text-sm" data-testid="filter-source">
              Source <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => { setSourceFilter("all"); setCurrentPage(1); }}>All</DropdownMenuItem>
            {(sources ?? []).map((s) => (
              <DropdownMenuItem key={s.id} onClick={() => { setSourceFilter(s.shortName || s.name); setCurrentPage(1); }}>{s.shortName || s.name}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" className="text-sm text-muted-foreground" onClick={resetFilters} data-testid="button-reset-view">
            Reset view
          </Button>
        )}

        <div className="ml-auto flex items-center gap-2">
          {autoMapRunning ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => autoMapJobId && cancelJob.mutate(autoMapJobId)}
              data-testid="button-ai-auto-map-all"
            >
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              {autoMapJob.data?.progressMessage || "Mapping..."}
              <X className="h-3.5 w-3.5 ml-1.5" />
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              disabled={autoMapMutation.isPending}
              onClick={() => setAutoMapDialogOpen(true)}
              data-testid="button-ai-auto-map-all"
            >
              <Sparkles className="h-3.5 w-3.5 mr-1.5 text-purple-500 dark:text-purple-400" />
              AI Auto-Map
            </Button>
          )}
          {mdRefreshRunning ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => mdRefreshJobId && cancelJob.mutate(mdRefreshJobId)}
              data-testid="button-md-refresh"
            >
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              {mdRefreshJob.data?.progressMessage || "Converting..."}
              <X className="h-3.5 w-3.5 ml-1.5" />
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              disabled={mdRefreshMutation.isPending}
              onClick={() => mdRefreshMutation.mutate()}
              data-testid="button-md-refresh"
            >
              <FileUp className="h-3.5 w-3.5 mr-1.5" />
              Markdown Refresh
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={openCreateDialog} data-testid="button-add-document">
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add document
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3" data-testid="loading-skeleton">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : (
        <>
          <div className="border rounded-md overflow-x-auto" data-testid="section-documents-table">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-medium text-muted-foreground cursor-pointer select-none whitespace-nowrap" data-testid="col-reference" onClick={() => toggleSort("reference")}>
                    <span className="flex items-center">Ref<SortIcon col="reference" /></span>
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground cursor-pointer select-none whitespace-nowrap min-w-[200px]" data-testid="col-name" onClick={() => toggleSort("name")}>
                    <span className="flex items-center">Name<SortIcon col="name" /></span>
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground cursor-pointer select-none whitespace-nowrap" data-testid="col-type" onClick={() => toggleSort("type")}>
                    <span className="flex items-center">Type<SortIcon col="type" /></span>
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground cursor-pointer select-none whitespace-nowrap" data-testid="col-category" onClick={() => toggleSort("category")}>
                    <span className="flex items-center">Category<SortIcon col="category" /></span>
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground cursor-pointer select-none whitespace-nowrap" data-testid="col-owner" onClick={() => toggleSort("owner")}>
                    <span className="flex items-center">Owner<SortIcon col="owner" /></span>
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground cursor-pointer select-none whitespace-nowrap" data-testid="col-bu" onClick={() => toggleSort("bu")}>
                    <span className="flex items-center">Business Unit<SortIcon col="bu" /></span>
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground cursor-pointer select-none whitespace-nowrap" data-testid="col-status" onClick={() => toggleSort("status")}>
                    <span className="flex items-center">Status<SortIcon col="status" /></span>
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground cursor-pointer select-none whitespace-nowrap" data-testid="col-frequency" onClick={() => toggleSort("frequency")}>
                    <span className="flex items-center">Review Freq.<SortIcon col="frequency" /></span>
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground cursor-pointer select-none whitespace-nowrap" data-testid="col-renew" onClick={() => toggleSort("renew")}>
                    <span className="flex items-center">Renew by<SortIcon col="renew" /></span>
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground cursor-pointer select-none whitespace-nowrap" data-testid="col-version" onClick={() => toggleSort("version")}>
                    <span className="flex items-center">Version<SortIcon col="version" /></span>
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground whitespace-nowrap" data-testid="col-approver">
                    <span>Approver</span>
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground cursor-pointer select-none whitespace-nowrap" data-testid="col-tags" onClick={() => toggleSort("tags")}>
                    <span className="flex items-center">Tags<SortIcon col="tags" /></span>
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground cursor-pointer select-none whitespace-nowrap" data-testid="col-framework" onClick={() => toggleSort("framework")}>
                    <span className="flex items-center">Frameworks<SortIcon col="framework" /></span>
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground cursor-pointer select-none whitespace-nowrap" data-testid="col-controls" onClick={() => toggleSort("controls")}>
                    <span className="flex items-center">Controls<SortIcon col="controls" /></span>
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground cursor-pointer select-none whitespace-nowrap" data-testid="col-created" onClick={() => toggleSort("created")}>
                    <span className="flex items-center">Created<SortIcon col="created" /></span>
                  </TableHead>
                  <TableHead className="w-[40px]" data-testid="col-actions"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedDocs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={16} className="text-center text-muted-foreground py-8" data-testid="text-no-documents">
                      No documents found
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedDocs.map((doc) => {
                    const latestVer = latestVersionMap.get(doc.id);
                    const approval = approvalsByDoc.get(doc.id);
                    const overallStatus = getOverallStatus(doc);
                    const approverName = approval?.approver || doc.owner;

                    return (
                      <TableRow key={doc.id} className="group" data-testid={`row-document-${doc.id}`}>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap" data-testid={`text-ref-${doc.id}`}>
                          {doc.documentReference || <span className="text-muted-foreground/50">&mdash;</span>}
                        </TableCell>
                        <TableCell>
                          <Link href={`/documents/${doc.id}`} data-testid={`link-document-${doc.id}`}>
                            <span className="text-sm font-medium text-foreground hover:underline cursor-pointer truncate block">
                              {doc.title}
                            </span>
                          </Link>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap" data-testid={`text-type-${doc.id}`}>
                          {doc.docType || <span className="text-muted-foreground/50">&mdash;</span>}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap" data-testid={`text-category-${doc.id}`}>
                          {doc.taxonomy || <span className="text-muted-foreground/50">&mdash;</span>}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap" data-testid={`text-owner-${doc.id}`}>
                          {doc.owner || <span className="text-muted-foreground/50">&mdash;</span>}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap" data-testid={`text-bu-${doc.id}`}>
                          {doc.businessUnitId ? (buMap.get(doc.businessUnitId) ?? doc.businessUnitId) : <span className="text-muted-foreground/50">&mdash;</span>}
                        </TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1.5 text-sm whitespace-nowrap" data-testid={`text-status-${doc.id}`}>
                            {overallStatus === "OK" ? (
                              <>
                                <CheckCircle2 className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
                                <span className="text-emerald-600 dark:text-emerald-400">OK</span>
                              </>
                            ) : (
                              <span className="text-muted-foreground">{overallStatus}</span>
                            )}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap" data-testid={`text-frequency-${doc.id}`}>
                          {doc.reviewFrequency || <span className="text-muted-foreground/50">&mdash;</span>}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap" data-testid={`text-renew-${doc.id}`}>
                          {doc.nextReviewDate
                            ? format(new Date(doc.nextReviewDate), "MMM d, yyyy")
                            : <span className="text-muted-foreground/50">&mdash;</span>}
                        </TableCell>
                        <TableCell data-testid={`text-version-${doc.id}`}>
                          {latestVer ? (
                            <span className="flex items-center gap-1.5 text-sm whitespace-nowrap">
                              {latestVer.status === "Published" ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" />
                              ) : null}
                              <span className={latestVer.status === "Published" ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}>
                                v{latestVer.version}
                              </span>
                              <span className="text-xs text-muted-foreground">({latestVer.status})</span>
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground/50">&mdash;</span>
                          )}
                        </TableCell>
                        <TableCell data-testid={`text-approver-${doc.id}`}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Avatar className="h-7 w-7">
                                <AvatarFallback className={`text-xs ${getAvatarColor(approverName)}`}>
                                  {getInitials(approverName)}
                                </AvatarFallback>
                              </Avatar>
                            </TooltipTrigger>
                            <TooltipContent>{approverName}</TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground" data-testid={`text-tags-${doc.id}`}>
                          {(doc.tags ?? []).length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {(doc.tags ?? []).map((t) => (
                                <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground/50">&mdash;</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground" data-testid={`text-framework-${doc.id}`}>
                          {(docFrameworkMap.get(doc.id) ?? []).length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {(docFrameworkMap.get(doc.id) ?? []).map((f) => (
                                <Badge key={f} variant="outline" className="text-xs">{f}</Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground/50">&mdash;</span>
                          )}
                        </TableCell>
                        <TableCell data-testid={`text-controls-${doc.id}`}>
                          {(docControlsCountMap.get(doc.id) ?? 0) > 0 ? (
                            <span className="text-sm">{docControlsCountMap.get(doc.id)}</span>
                          ) : (
                            <span className="text-sm text-muted-foreground/50">&mdash;</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap" data-testid={`text-created-${doc.id}`}>
                          {doc.createdAt
                            ? format(new Date(doc.createdAt), "MMM d, yyyy")
                            : <span className="text-muted-foreground/50">&mdash;</span>}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" data-testid={`button-actions-${doc.id}`}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditDialog(doc)} data-testid={`menu-edit-${doc.id}`}>Edit</DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => { setDeletingDoc(doc); setDeleteConfirmOpen(true); }}
                                data-testid={`menu-delete-${doc.id}`}
                              >
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground" data-testid="section-pagination">
            <span data-testid="text-results-count">
              {totalResults === 0 ? "0 results" : `${startItem} to ${endItem} of ${totalResults} results`}
            </span>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span>Show per page</span>
                <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setCurrentPage(1); }}>
                  <SelectTrigger className="w-[65px] h-8" data-testid="select-page-size">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="200">200</SelectItem>
                  <SelectItem value="500">500</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  data-testid="button-prev-page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  data-testid="button-next-page"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]" data-testid="dialog-document">
          <DialogHeader>
            <DialogTitle data-testid="text-dialog-title">
              {editingDoc ? "Edit Document" : "Add Document"}
            </DialogTitle>
            <DialogDescription>
              {editingDoc ? "Update document details." : "Create a new document."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. AML Policy" {...field} data-testid="input-doc-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="documentReference"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reference</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. POL-001" {...field} value={field.value ?? ""} data-testid="input-doc-reference" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="docType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Document Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-doc-type">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Policy" data-testid="option-doc-type-policy">Policy</SelectItem>
                          <SelectItem value="Standard" data-testid="option-doc-type-standard">Standard</SelectItem>
                          <SelectItem value="Procedure" data-testid="option-doc-type-procedure">Procedure</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="taxonomy"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-doc-taxonomy">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {activeCategories.map((c) => (
                            <SelectItem key={c.id} value={c.label} data-testid={`option-doc-taxonomy-${c.id}`}>
                              {c.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="owner"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Owner</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-doc-owner">
                            <SelectValue placeholder="Select owner" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {activeUsers.map((u) => (
                            <SelectItem key={u.id} value={`${u.firstName} ${u.lastName}`} data-testid={`option-doc-owner-${u.id}`}>
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
                  control={form.control}
                  name="reviewFrequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Review Frequency</FormLabel>
                      <Select onValueChange={(v) => field.onChange(v === "__none__" ? null : v)} value={field.value ?? "__none__"}>
                        <FormControl>
                          <SelectTrigger data-testid="select-doc-review-frequency">
                            <SelectValue placeholder="Select frequency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__" data-testid="option-review-freq-none">None</SelectItem>
                          {REVIEW_FREQUENCIES.map((rf) => (
                            <SelectItem key={rf} value={rf} data-testid={`option-review-freq-${rf.toLowerCase().replace(/\s+/g, "-")}`}>
                              {rf}
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
                  name="nextReviewDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Next Review Date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value || null)}
                          data-testid="input-doc-next-review-date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="businessUnitId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Unit</FormLabel>
                    <Select
                      onValueChange={(v) => field.onChange(v === "__group__" ? null : Number(v))}
                      value={field.value ? String(field.value) : "__group__"}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-doc-business-unit">
                          <SelectValue placeholder="Select business unit" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__group__" data-testid="option-bu-group">Group</SelectItem>
                        {businessUnits?.map((bu) => (
                          <SelectItem key={bu.id} value={String(bu.id)} data-testid={`option-bu-form-${bu.id}`}>
                            {bu.name}
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
                name="tagsText"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tags (comma-separated)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. critical, annual-review, board-approved" {...field} data-testid="input-doc-tags" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {!editingDoc && (
                <div>
                  <FormLabel>PDF Document (optional)</FormLabel>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelect(file);
                      e.target.value = "";
                    }}
                    data-testid="input-file-pdf"
                  />
                  {selectedFile ? (
                    <div className="flex items-center gap-3 rounded-md border p-3 mt-1.5" data-testid="section-selected-file">
                      <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" data-testid="text-selected-filename">{selectedFile.name}</p>
                        <p className="text-xs text-muted-foreground" data-testid="text-selected-filesize">
                          {(selectedFile.size / 1024).toFixed(0)} KB
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => setSelectedFile(null)}
                        data-testid="button-remove-file"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div
                      className={`mt-1.5 flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-6 cursor-pointer transition-colors ${
                        isDragging
                          ? "border-primary bg-primary/5"
                          : "border-muted-foreground/25 hover:border-muted-foreground/50"
                      }`}
                      onClick={() => fileInputRef.current?.click()}
                      onDrop={handleDrop}
                      onDragEnter={handleDragEnter}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      data-testid="dropzone-pdf"
                    >
                      <Upload className="h-6 w-6 text-muted-foreground" />
                      <div className="text-center">
                        <p className="text-sm font-medium">Drop a PDF here or click to browse</p>
                        <p className="text-xs text-muted-foreground mt-0.5">PDF up to 50 MB</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeDialog} data-testid="button-cancel-document">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-document"
                >
                  {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent data-testid="dialog-delete-document">
          <DialogHeader>
            <DialogTitle>Delete Document</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingDoc?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)} data-testid="button-cancel-delete-document">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingDoc && deleteMutation.mutate(deletingDoc.id)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete-document"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={autoMapDialogOpen} onOpenChange={(open) => { setAutoMapDialogOpen(open); if (!open) setAutoMapSourceId("all"); }}>
        <DialogContent className="sm:max-w-[440px]" data-testid="dialog-auto-map">
          <DialogHeader>
            <DialogTitle>AI Auto-Map All Documents</DialogTitle>
            <DialogDescription>
              This will use AI to automatically map controls to your documents. Choose how you'd like to proceed.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Framework</label>
              <Select value={autoMapSourceId} onValueChange={setAutoMapSourceId}>
                <SelectTrigger data-testid="select-auto-map-framework">
                  <SelectValue placeholder="All frameworks" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All frameworks</SelectItem>
                  {(sources ?? []).map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.shortName || s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              className="justify-start h-auto py-3 px-4"
              disabled={autoMapMutation.isPending}
              onClick={() => autoMapMutation.mutate({ mode: "unmapped", sourceId: autoMapSourceId !== "all" ? Number(autoMapSourceId) : undefined })}
              data-testid="button-auto-map-unmapped"
            >
              <div className="text-left">
                <p className="text-sm font-medium">Unmapped documents only</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Only process documents that haven't been AI reviewed yet
                </p>
              </div>
            </Button>
            <Button
              variant="outline"
              className="justify-start h-auto py-3 px-4"
              disabled={autoMapMutation.isPending}
              onClick={() => autoMapMutation.mutate({ mode: "full", sourceId: autoMapSourceId !== "all" ? Number(autoMapSourceId) : undefined })}
              data-testid="button-auto-map-full"
            >
              <div className="text-left">
                <p className="text-sm font-medium">Full refresh</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Re-analyse all documents, including previously mapped ones
                </p>
              </div>
            </Button>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setAutoMapDialogOpen(false); setAutoMapSourceId("all"); }} data-testid="button-cancel-auto-map">
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
