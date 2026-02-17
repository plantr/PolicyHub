import { useMemo, useRef, useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import type {
  Document,
  DocumentVersion,
  Addendum,
  ReviewHistoryEntry,
  PolicyLink,
  BusinessUnit,
  User,
} from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
import { ArrowLeft, Upload, Download, FileText, Trash2, Loader2, Plus, X } from "lucide-react";
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
      return "bg-amber-100 text-amber-800";
    case "Approved":
      return "bg-green-100 text-green-800";
    case "Published":
      return "bg-blue-100 text-blue-800";
    case "Superseded":
      return "bg-gray-100 text-gray-600";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function getDocTypeBadgeVariant(docType: string): "default" | "secondary" | "outline" {
  switch (docType) {
    case "Policy":
      return "default";
    case "Standard":
      return "secondary";
    case "Procedure":
      return "outline";
    default:
      return "default";
  }
}

export default function DocumentDetail() {
  const [, params] = useRoute("/documents/:id");
  const id = params?.id;

  const { data: document, isLoading: docLoading } = useQuery<Document>({
    queryKey: ["/api/documents", id],
    enabled: !!id,
  });

  const { data: versions, isLoading: versionsLoading } = useQuery<DocumentVersion[]>({
    queryKey: ["/api/documents", id, "versions"],
    enabled: !!id,
  });

  const { data: addendaList, isLoading: addendaLoading } = useQuery<Addendum[]>({
    queryKey: ["/api/documents", id, "addenda"],
    enabled: !!id,
  });

  const { data: reviews, isLoading: reviewsLoading } = useQuery<ReviewHistoryEntry[]>({
    queryKey: ["/api/documents", id, "reviews"],
    enabled: !!id,
  });

  const { data: policyLinks } = useQuery<PolicyLink[]>({
    queryKey: ["/api/policy-links"],
  });

  const { data: allDocuments } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
  });

  const { data: businessUnits } = useQuery<BusinessUnit[]>({
    queryKey: ["/api/business-units"],
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
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

  const docMap = useMemo(() => {
    const map = new Map<number, string>();
    allDocuments?.forEach((d) => map.set(d.id, d.title));
    return map;
  }, [allDocuments]);

  const relatedLinks = useMemo(() => {
    if (!policyLinks || !id) return [];
    const docId = Number(id);
    return policyLinks.filter(
      (link) => link.fromDocumentId === docId || link.toDocumentId === docId
    );
  }, [policyLinks, id]);

  const latestContent = useMemo(() => {
    if (!versions || versions.length === 0) return null;
    const published = versions.find((v) => v.status === "Published");
    const approved = versions.find((v) => v.status === "Approved");
    return published || approved || versions[0];
  }, [versions]);

  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingVersionId, setUploadingVersionId] = useState<number | null>(null);

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
      return res.json();
    },
    onSuccess: (data: { url: string }) => {
      window.open(data.url, "_blank");
    },
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
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-40 w-full" />
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
            Back to Documents
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="page-document-detail">
      <div className="flex items-center gap-2" data-testid="section-breadcrumb">
        <Link href="/documents">
          <Button variant="ghost" size="icon" data-testid="link-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <span className="text-sm text-muted-foreground" data-testid="text-breadcrumb-label">Documents</span>
      </div>

      <div className="space-y-2" data-testid="section-header">
        <div className="flex flex-wrap items-center gap-3">
          {document.documentReference && (
            <span className="text-sm text-muted-foreground font-mono" data-testid="text-document-ref">{document.documentReference}</span>
          )}
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-document-title">
            {document.title}
          </h1>
          <Badge variant={getDocTypeBadgeVariant(document.docType)} data-testid="badge-doc-type">
            {document.docType}
          </Badge>
          <Badge variant="outline" data-testid="badge-taxonomy">
            {document.taxonomy}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground" data-testid="text-owner-label">
          Owned by {document.owner}
        </p>
      </div>

      <Card className="p-4" data-testid="section-metadata">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div data-testid="metadata-owner">
            <span className="text-xs text-muted-foreground">Owner</span>
            <p className="text-sm font-medium">{document.owner}</p>
          </div>
          <div data-testid="metadata-delegates">
            <span className="text-xs text-muted-foreground">Delegates</span>
            <p className="text-sm font-medium">
              {document.delegates?.length ? document.delegates.join(", ") : "-"}
            </p>
          </div>
          <div data-testid="metadata-reviewers">
            <span className="text-xs text-muted-foreground">Reviewers</span>
            <p className="text-sm font-medium">
              {document.reviewers?.length ? document.reviewers.join(", ") : "-"}
            </p>
          </div>
          <div data-testid="metadata-approvers">
            <span className="text-xs text-muted-foreground">Approvers</span>
            <p className="text-sm font-medium">
              {document.approvers?.length ? document.approvers.join(", ") : "-"}
            </p>
          </div>
          <div data-testid="metadata-tags">
            <span className="text-xs text-muted-foreground">Tags</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {document.tags?.length ? (
                document.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs" data-testid={`badge-tag-${tag}`}>
                    {tag}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">-</span>
              )}
            </div>
          </div>
          <div data-testid="metadata-review-frequency">
            <span className="text-xs text-muted-foreground">Review Frequency</span>
            <p className="text-sm font-medium">{document.reviewFrequency || "-"}</p>
          </div>
          <div data-testid="metadata-next-review">
            <span className="text-xs text-muted-foreground">Next Review Date</span>
            <p className="text-sm font-medium">
              {document.nextReviewDate
                ? format(new Date(document.nextReviewDate), "dd MMM yyyy")
                : "-"}
            </p>
          </div>
          <div data-testid="metadata-bu">
            <span className="text-xs text-muted-foreground">Business Unit</span>
            <p className="text-sm font-medium">
              {document.businessUnitId
                ? buMap.get(document.businessUnitId) || "Unknown"
                : "Group"}
            </p>
          </div>
        </div>
      </Card>

      <Tabs defaultValue="versions" data-testid="section-tabs">
        <TabsList data-testid="tabs-list">
          <TabsTrigger value="versions" data-testid="tab-versions">Versions</TabsTrigger>
          <TabsTrigger value="content" data-testid="tab-content">Content</TabsTrigger>
          <TabsTrigger value="addenda" data-testid="tab-addenda">Addenda</TabsTrigger>
          <TabsTrigger value="reviews" data-testid="tab-reviews">Reviews</TabsTrigger>
          <TabsTrigger value="links" data-testid="tab-links">Links</TabsTrigger>
        </TabsList>

        <TabsContent value="versions" data-testid="tabcontent-versions">
          <div className="flex items-center justify-end mb-3">
            <Button onClick={() => setAddVersionOpen(true)} data-testid="button-add-version">
              <Plus className="h-4 w-4 mr-1" />
              Add Version
            </Button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handleFileChange}
            data-testid="input-pdf-file"
          />
          <Card>
            {versionsLoading ? (
              <div className="p-4 space-y-3" data-testid="loading-versions">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead data-testid="col-version">Version</TableHead>
                    <TableHead data-testid="col-status">Status</TableHead>
                    <TableHead data-testid="col-content-hash">Content Hash</TableHead>
                    <TableHead data-testid="col-change-reason">Change Reason</TableHead>
                    <TableHead data-testid="col-created-by">Created By</TableHead>
                    <TableHead data-testid="col-date">Date</TableHead>
                    <TableHead data-testid="col-pdf">PDF Attachment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!versions?.length ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8" data-testid="text-no-versions">
                        No versions found
                      </TableCell>
                    </TableRow>
                  ) : (
                    versions.map((ver) => (
                      <TableRow key={ver.id} data-testid={`row-version-${ver.id}`}>
                        <TableCell data-testid={`text-version-number-${ver.id}`}>
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
                        <TableCell
                          className="font-mono text-xs"
                          data-testid={`text-content-hash-${ver.id}`}
                        >
                          {ver.contentHash ? ver.contentHash.substring(0, 12) + "..." : "-"}
                        </TableCell>
                        <TableCell data-testid={`text-change-reason-${ver.id}`}>
                          {ver.changeReason || "-"}
                        </TableCell>
                        <TableCell data-testid={`text-created-by-${ver.id}`}>
                          {ver.createdBy}
                        </TableCell>
                        <TableCell data-testid={`text-version-date-${ver.id}`}>
                          {ver.createdAt
                            ? format(new Date(ver.createdAt), "dd MMM yyyy")
                            : "-"}
                        </TableCell>
                        <TableCell data-testid={`cell-pdf-${ver.id}`}>
                          {ver.pdfS3Key ? (
                            <div className="flex items-center gap-1">
                              <div className="flex items-center gap-1 text-xs text-muted-foreground mr-1">
                                <FileText className="h-3.5 w-3.5" />
                                <span className="max-w-[120px] truncate" data-testid={`text-pdf-name-${ver.id}`}>
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
          </Card>
        </TabsContent>

        <TabsContent value="content" data-testid="tabcontent-content">
          <Card className="p-4">
            {versionsLoading ? (
              <div className="space-y-3" data-testid="loading-content">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : latestContent ? (
              <div data-testid="section-latest-content">
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <span className="text-sm text-muted-foreground" data-testid="text-content-version-label">
                    Version {latestContent.version}
                  </span>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${getVersionStatusClass(latestContent.status)}`}
                    data-testid="badge-content-status"
                  >
                    {latestContent.status}
                  </span>
                </div>
                <pre
                  className="whitespace-pre-wrap text-sm font-sans leading-relaxed"
                  data-testid="text-document-content"
                >
                  {latestContent.content}
                </pre>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm" data-testid="text-no-content">
                No content available
              </p>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="addenda" data-testid="tabcontent-addenda">
          <Card>
            {addendaLoading ? (
              <div className="p-4 space-y-3" data-testid="loading-addenda">
                {Array.from({ length: 2 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : !addendaList?.length ? (
              <div className="p-4">
                <p className="text-muted-foreground text-sm text-center py-4" data-testid="text-no-addenda">
                  No addenda found
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead data-testid="col-addendum-bu">Business Unit</TableHead>
                    <TableHead data-testid="col-addendum-status">Status</TableHead>
                    <TableHead data-testid="col-addendum-content">Content</TableHead>
                    <TableHead data-testid="col-addendum-approved-by">Approved By</TableHead>
                    <TableHead data-testid="col-addendum-approved-at">Approved At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {addendaList.map((addendum) => (
                    <TableRow key={addendum.id} data-testid={`row-addendum-${addendum.id}`}>
                      <TableCell data-testid={`text-addendum-bu-${addendum.id}`}>
                        {buMap.get(addendum.businessUnitId) || "Unknown"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" data-testid={`badge-addendum-status-${addendum.id}`}>
                          {addendum.status}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className="max-w-md truncate"
                        data-testid={`text-addendum-content-${addendum.id}`}
                      >
                        {addendum.content}
                      </TableCell>
                      <TableCell data-testid={`text-addendum-approved-by-${addendum.id}`}>
                        {addendum.approvedBy || "-"}
                      </TableCell>
                      <TableCell data-testid={`text-addendum-approved-at-${addendum.id}`}>
                        {addendum.approvedAt
                          ? format(new Date(addendum.approvedAt), "dd MMM yyyy")
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="reviews" data-testid="tabcontent-reviews">
          <Card>
            {reviewsLoading ? (
              <div className="p-4 space-y-3" data-testid="loading-reviews">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : !reviews?.length ? (
              <div className="p-4">
                <p className="text-muted-foreground text-sm text-center py-4" data-testid="text-no-reviews">
                  No review history found
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead data-testid="col-reviewer">Reviewer</TableHead>
                    <TableHead data-testid="col-outcome">Outcome</TableHead>
                    <TableHead data-testid="col-comments">Comments</TableHead>
                    <TableHead data-testid="col-actions-raised">Actions Raised</TableHead>
                    <TableHead data-testid="col-reviewed-at">Reviewed At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reviews.map((review) => (
                    <TableRow key={review.id} data-testid={`row-review-${review.id}`}>
                      <TableCell data-testid={`text-reviewer-${review.id}`}>
                        {review.reviewer}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" data-testid={`badge-outcome-${review.id}`}>
                          {review.outcome}
                        </Badge>
                      </TableCell>
                      <TableCell data-testid={`text-review-comments-${review.id}`}>
                        {review.comments || "-"}
                      </TableCell>
                      <TableCell data-testid={`text-actions-raised-${review.id}`}>
                        {review.actionsRaised || "-"}
                      </TableCell>
                      <TableCell data-testid={`text-reviewed-at-${review.id}`}>
                        {review.reviewedAt
                          ? format(new Date(review.reviewedAt), "dd MMM yyyy")
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="links" data-testid="tabcontent-links">
          <Card>
            {!relatedLinks.length ? (
              <div className="p-4">
                <p className="text-muted-foreground text-sm text-center py-4" data-testid="text-no-links">
                  No related documents found
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead data-testid="col-link-type">Link Type</TableHead>
                    <TableHead data-testid="col-linked-document">Linked Document</TableHead>
                    <TableHead data-testid="col-direction">Direction</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {relatedLinks.map((link) => {
                    const docId = Number(id);
                    const isFrom = link.fromDocumentId === docId;
                    const linkedDocId = isFrom ? link.toDocumentId : link.fromDocumentId;
                    const linkedDocName = docMap.get(linkedDocId) || `Document #${linkedDocId}`;

                    return (
                      <TableRow key={link.id} data-testid={`row-link-${link.id}`}>
                        <TableCell>
                          <Badge variant="secondary" data-testid={`badge-link-type-${link.id}`}>
                            {link.linkType}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Link href={`/documents/${linkedDocId}`}>
                            <span
                              className="text-foreground hover:underline cursor-pointer"
                              data-testid={`link-linked-doc-${link.id}`}
                            >
                              {linkedDocName}
                            </span>
                          </Link>
                        </TableCell>
                        <TableCell data-testid={`text-link-direction-${link.id}`}>
                          {isFrom ? "Outgoing" : "Incoming"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>
      </Tabs>

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
    </div>
  );
}
