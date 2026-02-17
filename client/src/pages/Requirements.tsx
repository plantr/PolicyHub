import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Requirement, RegulatorySource } from "@shared/schema";

export default function Requirements() {
  const [jurisdictionFilter, setJurisdictionFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");

  const { data: requirements, isLoading: reqLoading } = useQuery<Requirement[]>({
    queryKey: ["/api/requirements"],
  });

  const { data: sources, isLoading: srcLoading } = useQuery<RegulatorySource[]>({
    queryKey: ["/api/regulatory-sources"],
  });

  const isLoading = reqLoading || srcLoading;

  const sourceMap = new Map((sources ?? []).map((s) => [s.id, s]));

  const jurisdictions = [...new Set((sources ?? []).map((s) => s.jurisdiction))].sort();
  const categories = [...new Set((requirements ?? []).map((r) => r.category))].sort();

  const filtered = (requirements ?? []).filter((req) => {
    const source = sourceMap.get(req.sourceId);
    if (jurisdictionFilter !== "all" && source?.jurisdiction !== jurisdictionFilter) return false;
    if (categoryFilter !== "all" && req.category !== categoryFilter) return false;
    if (sourceFilter !== "all" && String(req.sourceId) !== sourceFilter) return false;
    return true;
  });

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6" data-testid="requirements-page">
      <div data-testid="requirements-header">
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Requirements Library</h1>
        <p className="text-sm text-muted-foreground" data-testid="text-page-subtitle">Regulatory obligations and requirement statements</p>
      </div>

      <div className="flex flex-wrap items-center gap-3" data-testid="filter-bar">
        <Select value={jurisdictionFilter} onValueChange={setJurisdictionFilter} data-testid="select-jurisdiction">
          <SelectTrigger className="w-[180px]" data-testid="select-trigger-jurisdiction">
            <SelectValue placeholder="Jurisdiction" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" data-testid="select-item-jurisdiction-all">All Jurisdictions</SelectItem>
            {jurisdictions.map((j) => (
              <SelectItem key={j} value={j} data-testid={`select-item-jurisdiction-${j}`}>{j}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={categoryFilter} onValueChange={setCategoryFilter} data-testid="select-category">
          <SelectTrigger className="w-[180px]" data-testid="select-trigger-category">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" data-testid="select-item-category-all">All Categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c} data-testid={`select-item-category-${c}`}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sourceFilter} onValueChange={setSourceFilter} data-testid="select-source">
          <SelectTrigger className="w-[220px]" data-testid="select-trigger-source">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" data-testid="select-item-source-all">All Sources</SelectItem>
            {(sources ?? []).map((s) => (
              <SelectItem key={s.id} value={String(s.id)} data-testid={`select-item-source-${s.id}`}>{s.shortName}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card data-testid="requirements-table-card">
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
                <TableHead className="w-[120px]" data-testid="th-code">Code</TableHead>
                <TableHead data-testid="th-title">Title</TableHead>
                <TableHead className="max-w-[300px]" data-testid="th-description">Description</TableHead>
                <TableHead data-testid="th-source">Source</TableHead>
                <TableHead data-testid="th-category">Category</TableHead>
                <TableHead data-testid="th-article">Article</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground" data-testid="text-no-requirements">
                    No requirements found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((req) => {
                  const source = sourceMap.get(req.sourceId);
                  return (
                    <TableRow key={req.id} data-testid={`row-requirement-${req.id}`}>
                      <TableCell className="font-mono text-sm font-medium" data-testid={`text-code-${req.id}`}>
                        {req.code}
                      </TableCell>
                      <TableCell className="font-medium" data-testid={`text-title-${req.id}`}>
                        {req.title}
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate text-muted-foreground text-sm" data-testid={`text-description-${req.id}`}>
                        {req.description}
                      </TableCell>
                      <TableCell className="text-sm" data-testid={`text-source-${req.id}`}>
                        {source?.shortName ?? `Source #${req.sourceId}`}
                      </TableCell>
                      <TableCell data-testid={`badge-category-${req.id}`}>
                        <Badge variant="outline">{req.category}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground" data-testid={`text-article-${req.id}`}>
                        {req.article ?? "--"}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
