import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import type { Document, DocumentVersion, User } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import Markdown from "react-markdown";
import { Button } from "@/components/ui/button";
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
import { ArrowLeft, Upload, Download, FileText, Trash2, Loader2, Save, FileUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { uploadFileToStorage } from "@/lib/storage";

const VERSION_STATUSES = ["Draft", "In Review", "Approved", "Published", "Superseded"];

const editVersionSchema = z.object({
  version: z.string().min(1, "Version number is required"),
  status: z.string().min(1, "Status is required"),
  changeReason: z.string().default(""),
  createdBy: z.string().min(1, "Created by is required"),
  effectiveDate: z.string().nullable().default(null),
  content: z.string().min(1, "Content is required"),
});

type EditVersionValues = z.infer<typeof editVersionSchema>;

function getVersionStatusClass(status: string): string {
  switch (status) {
    case "Draft":
      return "bg-muted text-muted-foreground";
    case "In Review":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
    case "Approved":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
    case "Published":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300";
    case "Superseded":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export default function VersionDetail() {
  const [, params] = useRoute("/documents/:docId/versions/:verId");
  const docId = params?.docId;
  const verId = params?.verId;

  const { toast } = useToast();

  const { data: document, isLoading: docLoading } = useQuery<Document>({
    queryKey: ["/api/documents", docId],
    enabled: !!docId,
    queryFn: async () => {
      const res = await fetch(`/api/documents?id=${docId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
  });

  const { data: versions, isLoading: versionsLoading } = useQuery<DocumentVersion[]>({
    queryKey: ["/api/document-versions", docId],
    enabled: !!docId,
    queryFn: async () => {
      const res = await fetch(`/api/document-versions?documentId=${docId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch versions");
      return res.json();
    },
  });

  const version = useMemo(
    () => versions?.find((v) => v.id === Number(verId)),
    [versions, verId],
  );

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const activeUsers = useMemo(
    () => (users ?? []).filter((u) => u.status === "Active").sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)),
    [users],
  );

  const form = useForm<EditVersionValues>({
    resolver: zodResolver(editVersionSchema),
    defaultValues: {
      version: "",
      status: "Draft",
      changeReason: "",
      createdBy: "",
      effectiveDate: null,
      content: "",
    },
  });

  const pdfToMarkdownMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("GET", `/api/document-versions?id=${verId}&action=to-markdown`);
      return res.json() as Promise<{ markdown: string }>;
    },
    onSuccess: (data) => {
      form.setValue("content", data.markdown, { shouldDirty: true });
      toast({ title: "PDF converted", description: "Markdown content populated from attached PDF" });
    },
    onError: (err: Error) => {
      toast({ title: "Conversion failed", description: err.message, variant: "destructive" });
    },
  });

  const hasPdf = !!version?.pdfS3Key;

  const [loadedVersionId, setLoadedVersionId] = useState<number | null>(null);
  if (version && loadedVersionId !== version.id) {
    form.reset({
      version: version.version,
      status: version.status,
      changeReason: version.changeReason ?? "",
      createdBy: version.createdBy,
      effectiveDate: version.effectiveDate ? format(new Date(version.effectiveDate), "yyyy-MM-dd") : null,
      content: version.content && version.content !== "No content" ? version.content : "",
    });
    setLoadedVersionId(version.id);
  }

  const saveMutation = useMutation({
    mutationFn: async (data: EditVersionValues) => {
      const res = await apiRequest("PUT", `/api/document-versions?id=${verId}`, {
        version: data.version,
        status: data.status,
        changeReason: data.changeReason || null,
        createdBy: data.createdBy,
        effectiveDate: data.effectiveDate || null,
        content: data.content,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/document-versions", docId] });
      toast({ title: "Version saved" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      // Get signed upload URL
      const urlRes = await apiRequest(
        "POST",
        `/api/document-versions?id=${verId}&action=upload-url`,
        { fileName: file.name, mimeType: file.type, fileSize: file.size }
      );
      const { signedUrl, token, path: objectPath, bucketId } = await urlRes.json();

      // Upload via TUS
      await uploadFileToStorage({ file, signedUrl, token, bucketId, objectPath });

      // Confirm upload
      const confirmRes = await apiRequest(
        "POST",
        `/api/document-versions?id=${verId}&action=upload-confirm`,
        { storagePath: objectPath, fileName: file.name, fileSize: file.size }
      );
      return confirmRes.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/document-versions", docId] });
      toast({ title: "PDF uploaded successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    },
  });

  const downloadMutation = useMutation({
    mutationFn: async () => {
      // Get signed download URL (JSON mode)
      const res = await fetch(`/api/document-versions?id=${verId}&action=download&mode=download`, {
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
    mutationFn: async () => {
      const res = await apiRequest("DELETE", `/api/document-versions?id=${verId}&action=pdf`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/document-versions", docId] });
      toast({ title: "PDF removed" });
    },
    onError: (err: Error) => {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    },
  });

  const isLoading = docLoading || versionsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6" data-testid="loading-version-detail">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-6 w-96" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!document || !version) {
    return (
      <div className="space-y-6" data-testid="version-not-found">
        <div className="flex items-center gap-2">
          <Link href={`/documents/${docId}`}>
            <Button variant="ghost" size="icon" data-testid="link-back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <span className="text-sm text-muted-foreground">Back to Document</span>
        </div>
        <p className="text-muted-foreground">Version not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="page-version-detail">
      <div className="flex items-center gap-2" data-testid="section-breadcrumb">
        <Link href={`/documents/${docId}`}>
          <Button variant="ghost" size="icon" data-testid="link-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <span className="text-sm text-muted-foreground" data-testid="text-breadcrumb-label">
          {document.title}
        </span>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3" data-testid="section-header">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-version-title">
              Version {version.version}
            </h1>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${getVersionStatusClass(version.status)}`}
              data-testid="badge-version-status"
            >
              {version.status}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1" data-testid="text-version-subtitle">
            Created by {version.createdBy} on {version.createdAt ? format(new Date(version.createdAt), "dd MMM yyyy") : "-"}
          </p>
        </div>
        <Button
          onClick={form.handleSubmit((data) => saveMutation.mutate(data))}
          disabled={saveMutation.isPending}
          data-testid="button-save-version"
        >
          {saveMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
          Save Changes
        </Button>
      </div>

      <Card className="p-6" data-testid="section-version-form">
        <Form {...form}>
          <form className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField
                control={form.control}
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
                control={form.control}
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
              <FormField
                control={form.control}
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

            <FormField
              control={form.control}
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

            <FormField
              control={form.control}
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
          </form>
        </Form>
      </Card>

      <Card className="p-6" data-testid="section-markdown">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h2 className="text-lg font-semibold" data-testid="text-markdown-heading">Markdown Content</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!hasPdf || pdfToMarkdownMutation.isPending}
            onClick={() => pdfToMarkdownMutation.mutate()}
            data-testid="button-markdown-document"
          >
            <FileUp className="h-4 w-4 mr-1" />
            {pdfToMarkdownMutation.isPending ? "Converting..." : "Markdown Document"}
          </Button>
        </div>
        <Tabs defaultValue="edit">
          <TabsList data-testid="tabs-markdown">
            <TabsTrigger value="edit" data-testid="tab-markdown-edit">Edit</TabsTrigger>
            <TabsTrigger value="preview" data-testid="tab-markdown-preview">Preview</TabsTrigger>
          </TabsList>
          <TabsContent value="edit">
            <Textarea
              placeholder="Write markdown content for this version..."
              className="min-h-[300px] font-mono text-sm"
              value={form.watch("content")}
              onChange={(e) => form.setValue("content", e.target.value, { shouldDirty: true })}
              data-testid="input-markdown"
            />
          </TabsContent>
          <TabsContent value="preview">
            <div className="prose prose-sm dark:prose-invert max-w-none min-h-[300px] border rounded-md p-4" data-testid="preview-markdown">
              {form.watch("content") ? (
                <Markdown>{form.watch("content")}</Markdown>
              ) : (
                <p className="text-muted-foreground">No content yet.</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </Card>

      <Card className="p-6" data-testid="section-metadata">
        <h2 className="text-lg font-semibold mb-4" data-testid="text-metadata-heading">Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div data-testid="metadata-content-hash">
            <span className="text-xs text-muted-foreground">Content Hash</span>
            <p className="text-sm font-mono">{version.contentHash ? version.contentHash.substring(0, 24) + "..." : "-"}</p>
          </div>
          <div data-testid="metadata-created-at">
            <span className="text-xs text-muted-foreground">Created At</span>
            <p className="text-sm">{version.createdAt ? format(new Date(version.createdAt), "dd MMM yyyy HH:mm") : "-"}</p>
          </div>
          <div data-testid="metadata-document">
            <span className="text-xs text-muted-foreground">Document</span>
            <p className="text-sm">{document.title}</p>
          </div>
        </div>
      </Card>

      <Card className="p-6" data-testid="section-pdf">
        <h2 className="text-lg font-semibold mb-4" data-testid="text-pdf-heading">PDF Attachment</h2>
        {version.pdfS3Key ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span data-testid="text-pdf-filename">{version.pdfFileName}</span>
              {version.pdfFileSize && (
                <span className="text-xs">({(version.pdfFileSize / 1024).toFixed(0)} KB)</span>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadMutation.mutate()}
              disabled={downloadMutation.isPending}
              data-testid="button-download-pdf"
            >
              <Download className="h-3.5 w-3.5 mr-1" />
              Download
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => deletePdfMutation.mutate()}
              disabled={deletePdfMutation.isPending}
              data-testid="button-delete-pdf"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Remove
            </Button>
          </div>
        ) : (
          <div>
            <input
              type="file"
              accept="application/pdf"
              className="hidden"
              id="pdf-upload"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadMutation.mutate(file);
                e.target.value = "";
              }}
              data-testid="input-pdf-upload"
            />
            <label htmlFor="pdf-upload">
              <Button
                variant="outline"
                asChild
                disabled={uploadMutation.isPending}
                data-testid="button-upload-pdf"
              >
                <span>
                  {uploadMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5 mr-1" />
                  )}
                  Attach PDF
                </span>
              </Button>
            </label>
            <p className="text-sm text-muted-foreground mt-2">No PDF attached to this version.</p>
          </div>
        )}
      </Card>
    </div>
  );
}
