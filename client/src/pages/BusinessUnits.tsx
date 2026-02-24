import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Search, MoreHorizontal, ChevronLeft, ChevronRight, ChevronDown, MapPin } from "lucide-react";
import type { BusinessUnit } from "@shared/schema";
import { insertBusinessUnitSchema } from "@shared/schema";

const buFormSchema = insertBusinessUnitSchema.extend({
  code: z.string().nullable().default(null),
  name: z.string().min(1, "Name is required"),
  jurisdiction: z.string().min(1, "Jurisdiction is required"),
  type: z.string().min(1, "Entity type is required"),
  description: z.string().nullable().default(null),
  activitiesText: z.string().default(""),
}).omit({ activities: true, effectiveDate: true });

type BUFormValues = z.infer<typeof buFormSchema>;

export default function BusinessUnits() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBU, setEditingBU] = useState<BusinessUnit | null>(null);
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
  const [archivingBU, setArchivingBU] = useState<BusinessUnit | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const { toast } = useToast();

  const form = useForm<BUFormValues>({
    resolver: zodResolver(buFormSchema),
    defaultValues: {
      code: null,
      name: "",
      jurisdiction: "",
      type: "",
      description: null,
      activitiesText: "",
    },
  });

  const { data: businessUnits, isLoading } = useQuery<BusinessUnit[]>({
    queryKey: ["/api/business-units"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: BUFormValues) => {
      const activities = data.activitiesText
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean);
      const res = await apiRequest("POST", "/api/business-units", {
        code: data.code || null,
        name: data.name,
        jurisdiction: data.jurisdiction,
        type: data.type,
        description: data.description || null,
        activities,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/business-units"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      toast({ title: "Business unit created" });
      closeDialog();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: BUFormValues }) => {
      const activities = data.activitiesText
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean);
      const res = await apiRequest("PUT", `/api/business-units?id=${id}`, {
        code: data.code || null,
        name: data.name,
        jurisdiction: data.jurisdiction,
        type: data.type,
        description: data.description || null,
        activities,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/business-units"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      toast({ title: "Business unit updated" });
      closeDialog();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("PUT", `/api/business-units?id=${id}&action=archive`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/business-units"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      toast({ title: "Business unit archived" });
      setArchiveConfirmOpen(false);
      setArchivingBU(null);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const uniqueTypes = useMemo(() => {
    const set = new Set<string>();
    (businessUnits ?? []).forEach((bu) => { if (bu.type) set.add(bu.type); });
    return Array.from(set).sort();
  }, [businessUnits]);

  const hasActiveFilters = searchQuery !== "" || statusFilter !== "all" || typeFilter !== "all";

  const filteredUnits = useMemo(() => {
    if (!businessUnits) return [];
    return businessUnits.filter((bu) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!bu.name.toLowerCase().includes(q) && !bu.jurisdiction.toLowerCase().includes(q)) return false;
      }
      if (statusFilter !== "all" && bu.status !== statusFilter) return false;
      if (typeFilter !== "all" && bu.type !== typeFilter) return false;
      return true;
    });
  }, [businessUnits, searchQuery, statusFilter, typeFilter]);

  const totalResults = filteredUnits.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / pageSize));
  const paginatedUnits = filteredUnits.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const startItem = totalResults === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalResults);

  function resetFilters() {
    setSearchQuery("");
    setStatusFilter("all");
    setTypeFilter("all");
    setCurrentPage(1);
  }

  function openCreateDialog() {
    setEditingBU(null);
    form.reset({
      code: null,
      name: "",
      jurisdiction: "",
      type: "",
      description: null,
      activitiesText: "",
    });
    setDialogOpen(true);
  }

  function openEditDialog(bu: BusinessUnit) {
    setEditingBU(bu);
    form.reset({
      code: bu.code ?? null,
      name: bu.name,
      jurisdiction: bu.jurisdiction,
      type: bu.type,
      description: bu.description ?? null,
      activitiesText: (bu.activities ?? []).join(", "),
    });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingBU(null);
  }

  function onSubmit(values: BUFormValues) {
    if (editingBU) {
      updateMutation.mutate({ id: editingBU.id, data: values });
    } else {
      createMutation.mutate(values);
    }
  }

  return (
    <div className="space-y-4" data-testid="business-units-page">
      <div className="flex flex-wrap items-center gap-2" data-testid="bu-header">
        <h1 className="text-xl font-semibold tracking-tight" data-testid="text-page-title">Business Units</h1>

        <div className="relative ml-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search"
            className="pl-9 w-[160px]"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            data-testid="input-search-bu"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="text-sm" data-testid="filter-status">
              Status <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => { setStatusFilter("all"); setCurrentPage(1); }}>All</DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setStatusFilter("Active"); setCurrentPage(1); }}>Active</DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setStatusFilter("Archived"); setCurrentPage(1); }}>Archived</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="text-sm" data-testid="filter-type">
              Type <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => { setTypeFilter("all"); setCurrentPage(1); }}>All</DropdownMenuItem>
            {uniqueTypes.map((t) => (
              <DropdownMenuItem key={t} onClick={() => { setTypeFilter(t); setCurrentPage(1); }}>{t}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" className="text-sm text-muted-foreground" onClick={resetFilters} data-testid="button-reset-view">
            Reset view
          </Button>
        )}

        <div className="ml-auto">
          <Button variant="outline" size="sm" onClick={openCreateDialog} data-testid="button-add-bu">
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Business Unit
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : (
        <>
          <div className="border rounded-md" data-testid="bu-table">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-medium text-muted-foreground" data-testid="th-code">Code</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground" data-testid="th-name">Name</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground" data-testid="th-type">Type</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground" data-testid="th-jurisdiction">Jurisdiction</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground" data-testid="th-status">Status</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground" data-testid="th-activities">Activities</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground" data-testid="th-description">Description</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground w-[50px]" data-testid="th-actions" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedUnits.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-muted-foreground" data-testid="text-no-bus">
                      No business units configured. Click "Add Business Unit" to create one.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedUnits.map((bu) => (
                    <TableRow key={bu.id} className="group" data-testid={`row-bu-${bu.id}`}>
                      <TableCell className="text-sm text-muted-foreground" data-testid={`text-code-${bu.id}`}>
                        {bu.code ?? "--"}
                      </TableCell>
                      <TableCell className="font-medium" data-testid={`text-name-${bu.id}`}>
                        {bu.name}
                      </TableCell>
                      <TableCell data-testid={`badge-type-${bu.id}`}>
                        <Badge variant="outline">{bu.type}</Badge>
                      </TableCell>
                      <TableCell data-testid={`text-jurisdiction-${bu.id}`}>
                        <div className="flex items-center gap-1 text-sm">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          {bu.jurisdiction}
                        </div>
                      </TableCell>
                      <TableCell data-testid={`badge-status-${bu.id}`}>
                        <Badge variant={bu.status === "Active" ? "default" : "secondary"}>
                          {bu.status}
                        </Badge>
                      </TableCell>
                      <TableCell data-testid={`text-activities-${bu.id}`}>
                        <div className="flex flex-wrap gap-1">
                          {(bu.activities ?? []).map((a, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs no-default-active-elevate">
                              {a}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate" data-testid={`text-desc-${bu.id}`}>
                        {bu.description ?? "--"}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                              data-testid={`button-actions-bu-${bu.id}`}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(bu)} data-testid={`menu-edit-bu-${bu.id}`}>
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={bu.status === "Archived"}
                              onClick={() => {
                                setArchivingBU(bu);
                                setArchiveConfirmOpen(true);
                              }}
                              data-testid={`menu-archive-bu-${bu.id}`}
                            >
                              Archive
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground" data-testid="section-pagination">
            <span data-testid="text-results-count">
              {startItem} to {endItem} of {totalResults} results
            </span>
            <div className="flex items-center gap-2">
              <span>Show per page</span>
              <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setCurrentPage(1); }}>
                <SelectTrigger className="w-[70px]" data-testid="select-page-size">
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
              <Button
                size="icon"
                variant="ghost"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                data-testid="button-prev-page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                data-testid="button-next-page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]" data-testid="dialog-bu">
          <DialogHeader>
            <DialogTitle data-testid="text-dialog-title">
              {editingBU ? "Edit Business Unit" : "Add Business Unit"}
            </DialogTitle>
            <DialogDescription>
              {editingBU ? "Update business unit details." : "Create a new regulated entity."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Code</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. UK-EMI" {...field} value={field.value ?? ""} data-testid="input-bu-code" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. UK EMI" {...field} data-testid="input-bu-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Entity Type</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. EMI, VASP, CASP" {...field} data-testid="input-bu-type" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="jurisdiction"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jurisdiction</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. United Kingdom" {...field} data-testid="input-bu-jurisdiction" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="activitiesText"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Activities (comma-separated)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Electronic money issuance, Payment services, Safeguarding"
                        className="resize-none"
                        {...field}
                        data-testid="input-bu-activities"
                      />
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
                        placeholder="Brief description of the business unit"
                        className="resize-none"
                        {...field}
                        value={field.value ?? ""}
                        data-testid="input-bu-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeDialog} data-testid="button-cancel-bu">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-bu"
                >
                  {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={archiveConfirmOpen} onOpenChange={setArchiveConfirmOpen}>
        <DialogContent data-testid="dialog-archive-bu">
          <DialogHeader>
            <DialogTitle>Archive Business Unit</DialogTitle>
            <DialogDescription>
              Are you sure you want to archive "{archivingBU?.name}"? It will no longer appear as active but its data will be preserved.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setArchiveConfirmOpen(false)} data-testid="button-cancel-archive-bu">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => archivingBU && archiveMutation.mutate(archivingBU.id)}
              disabled={archiveMutation.isPending}
              data-testid="button-confirm-archive-bu"
            >
              {archiveMutation.isPending ? "Archiving..." : "Archive"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
