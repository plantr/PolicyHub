import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import { format } from "date-fns";
import { Search, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import type { AuditLogEntry } from "@shared/schema";
import { supabase } from "@/lib/supabase";

const ENTITY_TYPES = [
  "document",
  "document_version",
  "finding",
  "mapping",
  "addendum",
  "effective_policy",
  "approval",
];

export default function AuditTrail() {
  const [searchQuery, setSearchQuery] = useState("");
  const [entityTypeFilter, setEntityTypeFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);

  const { data: entries, isLoading } = useQuery<AuditLogEntry[]>({
    queryKey: ["audit-log"],
    queryFn: async () => {
      const { data, error } = await supabase.from("audit_log").select("*").order("timestamp", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const hasActiveFilters = entityTypeFilter !== "all" || searchQuery.length > 0;

  const filtered = useMemo(() => {
    return (entries ?? []).filter((e) => {
      if (entityTypeFilter !== "all" && e.entityType !== entityTypeFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchActor = (e.actor ?? "").toLowerCase().includes(q);
        const matchAction = (e.action ?? "").toLowerCase().includes(q);
        const matchDetails = (e.details ?? "").toLowerCase().includes(q);
        if (!matchActor && !matchAction && !matchDetails) return false;
      }
      return true;
    });
  }, [entries, entityTypeFilter, searchQuery]);

  const totalResults = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / pageSize));
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const startItem = totalResults === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalResults);

  function resetFilters() {
    setEntityTypeFilter("all");
    setSearchQuery("");
    setCurrentPage(1);
  }

  return (
    <div className="space-y-4" data-testid="audit-trail-page">
      <div className="flex flex-wrap items-center gap-2" data-testid="audit-trail-header">
        <h1 className="text-xl font-semibold tracking-tight" data-testid="text-page-title">Audit Trail</h1>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search"
              className="pl-9 w-[160px]"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              data-testid="input-search-audit"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="text-sm" data-testid="filter-entity-type">
                Entity type <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => { setEntityTypeFilter("all"); setCurrentPage(1); }} data-testid="select-item-entity-all">All Entity Types</DropdownMenuItem>
              {ENTITY_TYPES.map((t) => (
                <DropdownMenuItem key={t} onClick={() => { setEntityTypeFilter(t); setCurrentPage(1); }} data-testid={`select-item-entity-${t}`}>
                  {t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" className="text-sm text-muted-foreground" onClick={resetFilters} data-testid="button-reset-view">
              Reset view
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3" data-testid="loading-skeleton">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <>
          <div className="border rounded-md" data-testid="audit-trail-table-card">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-medium text-muted-foreground" data-testid="th-timestamp">Timestamp</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground" data-testid="th-entity-type">Entity Type</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground" data-testid="th-action">Action</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground" data-testid="th-actor">Actor</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground" data-testid="th-details">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground" data-testid="text-no-entries">
                      No audit log entries found.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginated.map((entry) => (
                    <TableRow key={entry.id} data-testid={`row-audit-${entry.id}`}>
                      <TableCell className="text-sm whitespace-nowrap" data-testid={`text-timestamp-${entry.id}`}>
                        {entry.timestamp ? format(new Date(entry.timestamp), "MMM d, yyyy HH:mm:ss") : "--"}
                      </TableCell>
                      <TableCell data-testid={`badge-entity-type-${entry.id}`}>
                        <Badge variant="outline">
                          {entry.entityType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm font-medium" data-testid={`text-action-${entry.id}`}>
                        {entry.action}
                      </TableCell>
                      <TableCell className="text-sm" data-testid={`text-actor-${entry.id}`}>
                        {entry.actor}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[400px] truncate" data-testid={`text-details-${entry.id}`}>
                        {entry.details ?? "--"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground" data-testid="section-pagination">
            <span data-testid="text-pagination-info">
              {startItem} to {endItem} of {totalResults} results
            </span>
            <div className="flex items-center gap-2">
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
              <Button variant="outline" size="icon" disabled={currentPage <= 1} onClick={() => setCurrentPage((p) => p - 1)} data-testid="button-prev-page">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((p) => p + 1)} data-testid="button-next-page">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
