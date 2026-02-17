import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { RequirementMapping, Requirement, Document, BusinessUnit } from "@shared/schema";
import { ShieldCheck, AlertTriangle, XCircle, ListChecks } from "lucide-react";

function getCoverageBadgeClass(status: string) {
  switch (status) {
    case "Covered":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    case "Partially Covered":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200";
    case "Not Covered":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    default:
      return "";
  }
}

export default function GapAnalysis() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [buFilter, setBuFilter] = useState("all");

  const { data: mappings, isLoading: mappingsLoading } = useQuery<RequirementMapping[]>({
    queryKey: ["/api/requirement-mappings"],
  });
  const { data: requirements, isLoading: reqLoading } = useQuery<Requirement[]>({
    queryKey: ["/api/requirements"],
  });
  const { data: documents, isLoading: docLoading } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
  });
  const { data: businessUnits, isLoading: buLoading } = useQuery<BusinessUnit[]>({
    queryKey: ["/api/business-units"],
  });

  const isLoading = mappingsLoading || reqLoading || docLoading || buLoading;

  const reqMap = new Map((requirements ?? []).map((r) => [r.id, r]));
  const docMap = new Map((documents ?? []).map((d) => [d.id, d]));
  const buMap = new Map((businessUnits ?? []).map((b) => [b.id, b]));

  const allMappings = mappings ?? [];
  const coveredCount = allMappings.filter((m) => m.coverageStatus === "Covered").length;
  const partialCount = allMappings.filter((m) => m.coverageStatus === "Partially Covered").length;
  const notCoveredCount = allMappings.filter((m) => m.coverageStatus === "Not Covered").length;

  const filtered = allMappings.filter((m) => {
    if (statusFilter !== "all" && m.coverageStatus !== statusFilter) return false;
    if (buFilter !== "all" && String(m.businessUnitId ?? "") !== buFilter) return false;
    return true;
  });

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6" data-testid="gap-analysis-page">
      <div data-testid="gap-analysis-header">
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Gap Analysis</h1>
        <p className="text-sm text-muted-foreground" data-testid="text-page-subtitle">Requirement coverage and compliance matrix</p>
      </div>

      {isLoading ? (
        <div className="space-y-6" data-testid="gap-analysis-skeleton">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}
          </div>
          <Skeleton className="h-10 w-full" />
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="summary-cards">
            <Card data-testid="stat-covered">
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm text-muted-foreground" data-testid="stat-covered-label">Covered</p>
                    <p className="text-2xl font-bold mt-1" data-testid="stat-covered-value">{coveredCount}</p>
                  </div>
                  <div className="p-2 rounded-md bg-green-100 dark:bg-green-900">
                    <ShieldCheck className="w-5 h-5 text-green-700 dark:text-green-300" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card data-testid="stat-partial">
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm text-muted-foreground" data-testid="stat-partial-label">Partially Covered</p>
                    <p className="text-2xl font-bold mt-1" data-testid="stat-partial-value">{partialCount}</p>
                  </div>
                  <div className="p-2 rounded-md bg-amber-100 dark:bg-amber-900">
                    <AlertTriangle className="w-5 h-5 text-amber-700 dark:text-amber-300" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card data-testid="stat-not-covered">
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm text-muted-foreground" data-testid="stat-not-covered-label">Not Covered</p>
                    <p className="text-2xl font-bold mt-1" data-testid="stat-not-covered-value">{notCoveredCount}</p>
                  </div>
                  <div className="p-2 rounded-md bg-red-100 dark:bg-red-900">
                    <XCircle className="w-5 h-5 text-red-700 dark:text-red-300" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card data-testid="stat-total-mapped">
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm text-muted-foreground" data-testid="stat-total-mapped-label">Total Mapped</p>
                    <p className="text-2xl font-bold mt-1" data-testid="stat-total-mapped-value">{allMappings.length}</p>
                  </div>
                  <div className="p-2 rounded-md bg-muted">
                    <ListChecks className="w-5 h-5 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-wrap items-center gap-3" data-testid="filter-bar">
            <Select value={statusFilter} onValueChange={setStatusFilter} data-testid="select-coverage-status">
              <SelectTrigger className="w-[200px]" data-testid="select-trigger-coverage-status">
                <SelectValue placeholder="Coverage Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" data-testid="select-item-status-all">All Statuses</SelectItem>
                <SelectItem value="Covered" data-testid="select-item-status-covered">Covered</SelectItem>
                <SelectItem value="Partially Covered" data-testid="select-item-status-partial">Partially Covered</SelectItem>
                <SelectItem value="Not Covered" data-testid="select-item-status-not-covered">Not Covered</SelectItem>
              </SelectContent>
            </Select>

            <Select value={buFilter} onValueChange={setBuFilter} data-testid="select-bu">
              <SelectTrigger className="w-[200px]" data-testid="select-trigger-bu">
                <SelectValue placeholder="Business Unit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" data-testid="select-item-bu-all">All Business Units</SelectItem>
                {(businessUnits ?? []).map((bu) => (
                  <SelectItem key={bu.id} value={String(bu.id)} data-testid={`select-item-bu-${bu.id}`}>{bu.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Card data-testid="gap-analysis-table-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead data-testid="th-req-code">Requirement Code</TableHead>
                  <TableHead data-testid="th-req-title">Requirement Title</TableHead>
                  <TableHead data-testid="th-document">Document</TableHead>
                  <TableHead data-testid="th-bu">Business Unit</TableHead>
                  <TableHead data-testid="th-coverage">Coverage Status</TableHead>
                  <TableHead data-testid="th-rationale">Rationale</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground" data-testid="text-no-mappings">
                      No mappings found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((m) => {
                    const req = reqMap.get(m.requirementId);
                    const doc = docMap.get(m.documentId);
                    const bu = m.businessUnitId ? buMap.get(m.businessUnitId) : null;
                    return (
                      <TableRow key={m.id} data-testid={`row-mapping-${m.id}`}>
                        <TableCell className="font-mono text-sm font-medium" data-testid={`text-req-code-${m.id}`}>
                          {req?.code ?? `REQ-${m.requirementId}`}
                        </TableCell>
                        <TableCell className="font-medium" data-testid={`text-req-title-${m.id}`}>
                          {req?.title ?? "--"}
                        </TableCell>
                        <TableCell className="text-sm" data-testid={`text-document-${m.id}`}>
                          {doc?.title ?? `Doc #${m.documentId}`}
                        </TableCell>
                        <TableCell className="text-sm" data-testid={`text-bu-${m.id}`}>
                          {bu?.name ?? "Group"}
                        </TableCell>
                        <TableCell data-testid={`badge-coverage-${m.id}`}>
                          <Badge variant="secondary" className={`border-0 ${getCoverageBadgeClass(m.coverageStatus)}`}>
                            {m.coverageStatus}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[250px] truncate" data-testid={`text-rationale-${m.id}`}>
                          {m.rationale ?? "--"}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Card>
        </>
      )}
    </div>
  );
}
