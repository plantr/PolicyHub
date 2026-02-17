import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "wouter";
import { format } from "date-fns";
import type { Document, BusinessUnit } from "@shared/schema";
import { insertDocumentSchema } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Pencil, Trash2 } from "lucide-react";

const DOC_TYPES = ["All", "Policy", "Standard", "Procedure"];
const TAXONOMIES = ["All", "AML", "Safeguarding", "Information Security", "Compliance", "Operations"];
const REVIEW_FREQUENCIES = ["Annual", "Semi-Annual", "Quarterly", "Monthly"];

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

const docFormSchema = insertDocumentSchema
  .omit({ tags: true, nextReviewDate: true, delegates: true, reviewers: true, approvers: true, parentDocumentId: true })
  .extend({
    title: z.string().min(1, "Title is required"),
    docType: z.string().min(1, "Document type is required"),
    taxonomy: z.string().min(1, "Taxonomy is required"),
    owner: z.string().min(1, "Owner is required"),
    tagsText: z.string().default(""),
  });

type DocFormValues = z.infer<typeof docFormSchema>;

export default function Documents() {
  const [docTypeFilter, setDocTypeFilter] = useState("All");
  const [taxonomyFilter, setTaxonomyFilter] = useState("All");
  const [buFilter, setBuFilter] = useState("All");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingDoc, setDeletingDoc] = useState<Document | null>(null);
  const { toast } = useToast();

  const form = useForm<DocFormValues>({
    resolver: zodResolver(docFormSchema),
    defaultValues: {
      title: "",
      docType: "",
      taxonomy: "",
      owner: "",
      reviewFrequency: null,
      businessUnitId: null,
      tagsText: "",
    },
  });

  const { data: documents, isLoading: docsLoading } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
  });

  const { data: businessUnits, isLoading: busLoading } = useQuery<BusinessUnit[]>({
    queryKey: ["/api/business-units"],
  });

  const isLoading = docsLoading || busLoading;

  const buMap = useMemo(() => {
    const map = new Map<number, string>();
    businessUnits?.forEach((bu) => map.set(bu.id, bu.name));
    return map;
  }, [businessUnits]);

  const filteredDocuments = useMemo(() => {
    if (!documents) return [];
    return documents.filter((doc) => {
      if (docTypeFilter !== "All" && doc.docType !== docTypeFilter) return false;
      if (taxonomyFilter !== "All" && doc.taxonomy !== taxonomyFilter) return false;
      if (buFilter !== "All") {
        const buName = doc.businessUnitId ? buMap.get(doc.businessUnitId) : "Group";
        if (buName !== buFilter) return false;
      }
      return true;
    });
  }, [documents, docTypeFilter, taxonomyFilter, buFilter, buMap]);

  const createMutation = useMutation({
    mutationFn: async (data: DocFormValues) => {
      const tags = data.tagsText
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const res = await apiRequest("POST", "/api/documents", {
        title: data.title,
        docType: data.docType,
        taxonomy: data.taxonomy,
        owner: data.owner,
        reviewFrequency: data.reviewFrequency || null,
        businessUnitId: data.businessUnitId || null,
        tags,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
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
        title: data.title,
        docType: data.docType,
        taxonomy: data.taxonomy,
        owner: data.owner,
        reviewFrequency: data.reviewFrequency || null,
        businessUnitId: data.businessUnitId || null,
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
      await apiRequest("DELETE", `/api/documents/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Document deleted" });
      setDeleteConfirmOpen(false);
      setDeletingDoc(null);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  function openCreateDialog() {
    setEditingDoc(null);
    form.reset({
      title: "",
      docType: "",
      taxonomy: "",
      owner: "",
      reviewFrequency: null,
      businessUnitId: null,
      tagsText: "",
    });
    setDialogOpen(true);
  }

  function openEditDialog(doc: Document) {
    setEditingDoc(doc);
    form.reset({
      title: doc.title,
      docType: doc.docType,
      taxonomy: doc.taxonomy,
      owner: doc.owner,
      reviewFrequency: doc.reviewFrequency ?? null,
      businessUnitId: doc.businessUnitId ?? null,
      tagsText: (doc.tags ?? []).join(", "),
    });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingDoc(null);
  }

  function onSubmit(values: DocFormValues) {
    if (editingDoc) {
      updateMutation.mutate({ id: editingDoc.id, data: values });
    } else {
      createMutation.mutate(values);
    }
  }

  return (
    <div className="space-y-6" data-testid="page-documents">
      <div className="flex flex-wrap items-start justify-between gap-3" data-testid="section-page-header">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">Documents</h1>
          <p className="text-sm text-muted-foreground mt-1" data-testid="text-page-subtitle">
            Policy estate document library
          </p>
        </div>
        <Button onClick={openCreateDialog} data-testid="button-add-document">
          <Plus className="h-4 w-4 mr-1" />
          Add Document
        </Button>
      </div>

      <Card className="p-4" data-testid="section-filters">
        <div className="flex flex-wrap items-center gap-3">
          <Select value={docTypeFilter} onValueChange={setDocTypeFilter}>
            <SelectTrigger className="w-[160px]" data-testid="select-doc-type-filter">
              <SelectValue placeholder="Document Type" />
            </SelectTrigger>
            <SelectContent>
              {DOC_TYPES.map((t) => (
                <SelectItem key={t} value={t} data-testid={`option-doc-type-${t.toLowerCase()}`}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={taxonomyFilter} onValueChange={setTaxonomyFilter}>
            <SelectTrigger className="w-[200px]" data-testid="select-taxonomy-filter">
              <SelectValue placeholder="Taxonomy" />
            </SelectTrigger>
            <SelectContent>
              {TAXONOMIES.map((t) => (
                <SelectItem key={t} value={t} data-testid={`option-taxonomy-${t.toLowerCase().replace(/\s+/g, "-")}`}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={buFilter} onValueChange={setBuFilter}>
            <SelectTrigger className="w-[200px]" data-testid="select-bu-filter">
              <SelectValue placeholder="Business Unit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All" data-testid="option-bu-all">All</SelectItem>
              {businessUnits?.map((bu) => (
                <SelectItem key={bu.id} value={bu.name} data-testid={`option-bu-${bu.id}`}>
                  {bu.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card data-testid="section-documents-table">
        {isLoading ? (
          <div className="p-4 space-y-3" data-testid="loading-skeleton">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead data-testid="col-title">Title</TableHead>
                <TableHead data-testid="col-type">Type</TableHead>
                <TableHead data-testid="col-taxonomy">Taxonomy</TableHead>
                <TableHead data-testid="col-owner">Owner</TableHead>
                <TableHead data-testid="col-review-frequency">Review Frequency</TableHead>
                <TableHead data-testid="col-next-review">Next Review</TableHead>
                <TableHead data-testid="col-bu">BU</TableHead>
                <TableHead className="text-right" data-testid="col-actions">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocuments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8" data-testid="text-no-documents">
                    No documents found
                  </TableCell>
                </TableRow>
              ) : (
                filteredDocuments.map((doc) => (
                  <TableRow key={doc.id} data-testid={`row-document-${doc.id}`}>
                    <TableCell>
                      <Link href={`/documents/${doc.id}`} data-testid={`link-document-${doc.id}`}>
                        <span className="font-medium text-foreground hover:underline cursor-pointer">
                          {doc.title}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getDocTypeBadgeVariant(doc.docType)} className="no-default-active-elevate" data-testid={`badge-type-${doc.id}`}>
                        {doc.docType}
                      </Badge>
                    </TableCell>
                    <TableCell data-testid={`text-taxonomy-${doc.id}`}>{doc.taxonomy}</TableCell>
                    <TableCell data-testid={`text-owner-${doc.id}`}>{doc.owner}</TableCell>
                    <TableCell data-testid={`text-review-freq-${doc.id}`}>
                      {doc.reviewFrequency || "-"}
                    </TableCell>
                    <TableCell data-testid={`text-next-review-${doc.id}`}>
                      {doc.nextReviewDate
                        ? format(new Date(doc.nextReviewDate), "dd MMM yyyy")
                        : "-"}
                    </TableCell>
                    <TableCell data-testid={`text-bu-${doc.id}`}>
                      {doc.businessUnitId ? buMap.get(doc.businessUnitId) || "Unknown" : "Group"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openEditDialog(doc)}
                          data-testid={`button-edit-document-${doc.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setDeletingDoc(doc);
                            setDeleteConfirmOpen(true);
                          }}
                          data-testid={`button-delete-document-${doc.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </Card>

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
              <div className="grid grid-cols-2 gap-4">
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
                      <FormLabel>Taxonomy</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. AML" {...field} data-testid="input-doc-taxonomy" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="owner"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Owner</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Jane Smith" {...field} data-testid="input-doc-owner" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
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
              </div>
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
    </div>
  );
}
