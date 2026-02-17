import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import type { AuditLogEntry } from "@shared/schema";

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
  const [entityTypeFilter, setEntityTypeFilter] = useState("all");

  const { data: entries, isLoading } = useQuery<AuditLogEntry[]>({
    queryKey: ["/api/audit-log"],
  });

  const filtered = (entries ?? []).filter((e) => {
    if (entityTypeFilter !== "all" && e.entityType !== entityTypeFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6" data-testid="audit-trail-page">
      <div data-testid="audit-trail-header">
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">Audit Trail</h1>
        <p className="text-sm text-muted-foreground mt-1" data-testid="text-page-subtitle">Immutable record of all governance actions</p>
      </div>

      <div className="flex flex-wrap items-center gap-3" data-testid="filter-bar">
        <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter} data-testid="select-entity-type">
          <SelectTrigger className="w-[220px]" data-testid="select-trigger-entity-type">
            <SelectValue placeholder="Entity Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" data-testid="select-item-entity-all">All Entity Types</SelectItem>
            {ENTITY_TYPES.map((t) => (
              <SelectItem key={t} value={t} data-testid={`select-item-entity-${t}`}>
                {t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card data-testid="audit-trail-table-card">
        {isLoading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead data-testid="th-timestamp">Timestamp</TableHead>
                <TableHead data-testid="th-entity-type">Entity Type</TableHead>
                <TableHead data-testid="th-action">Action</TableHead>
                <TableHead data-testid="th-actor">Actor</TableHead>
                <TableHead data-testid="th-details">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground" data-testid="text-no-entries">
                    No audit log entries found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((entry) => (
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
        )}
      </Card>
    </div>
  );
}
