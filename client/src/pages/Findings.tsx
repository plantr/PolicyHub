import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { AlertTriangle, Clock, FileWarning, ListChecks, ChevronDown, ChevronUp } from "lucide-react";
import type { Finding, BusinessUnit } from "@shared/schema";

function getSeverityVariant(severity: string) {
  switch (severity) {
    case "High": return "destructive" as const;
    case "Medium": return "default" as const;
    case "Low": return "secondary" as const;
    default: return "secondary" as const;
  }
}

function isOverdue(finding: Finding) {
  if (!finding.dueDate) return false;
  if (finding.status === "Closed" || finding.status === "Verified") return false;
  return new Date(finding.dueDate) < new Date();
}

export default function Findings() {
  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [buFilter, setBuFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: findings, isLoading: findingsLoading } = useQuery<Finding[]>({
    queryKey: ["/api/findings"],
  });
  const { data: businessUnits, isLoading: buLoading } = useQuery<BusinessUnit[]>({
    queryKey: ["/api/business-units"],
  });

  const isLoading = findingsLoading || buLoading;

  const buMap = new Map((businessUnits ?? []).map((b) => [b.id, b]));
  const allFindings = findings ?? [];

  const totalFindings = allFindings.length;
  const openCount = allFindings.filter((f) => f.status !== "Closed" && f.status !== "Verified").length;
  const highCount = allFindings.filter((f) => f.severity === "High").length;
  const overdueCount = allFindings.filter(isOverdue).length;

  const filtered = allFindings.filter((f) => {
    if (severityFilter !== "all" && f.severity !== severityFilter) return false;
    if (statusFilter !== "all" && f.status !== statusFilter) return false;
    if (buFilter !== "all" && String(f.businessUnitId) !== buFilter) return false;
    return true;
  });

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6" data-testid="findings-page">
      <div data-testid="findings-header">
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Findings & Remediation</h1>
        <p className="text-sm text-muted-foreground" data-testid="text-page-subtitle">Audit findings and remediation tracking</p>
      </div>

      {isLoading ? (
        <div className="space-y-6" data-testid="findings-skeleton">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}
          </div>
          <Skeleton className="h-10 w-full" />
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="summary-cards">
            <Card data-testid="stat-total-findings">
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm text-muted-foreground" data-testid="stat-total-findings-label">Total Findings</p>
                    <p className="text-2xl font-bold mt-1" data-testid="stat-total-findings-value">{totalFindings}</p>
                  </div>
                  <div className="p-2 rounded-md bg-muted">
                    <ListChecks className="w-5 h-5 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card data-testid="stat-open">
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm text-muted-foreground" data-testid="stat-open-label">Open</p>
                    <p className="text-2xl font-bold mt-1" data-testid="stat-open-value">{openCount}</p>
                  </div>
                  <div className="p-2 rounded-md bg-muted">
                    <FileWarning className="w-5 h-5 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card data-testid="stat-high-severity">
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm text-muted-foreground" data-testid="stat-high-severity-label">High Severity</p>
                    <p className="text-2xl font-bold mt-1" data-testid="stat-high-severity-value">{highCount}</p>
                  </div>
                  <div className="p-2 rounded-md bg-red-100 dark:bg-red-900">
                    <AlertTriangle className="w-5 h-5 text-red-700 dark:text-red-300" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card data-testid="stat-overdue">
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm text-muted-foreground" data-testid="stat-overdue-label">Overdue</p>
                    <p className="text-2xl font-bold mt-1" data-testid="stat-overdue-value">{overdueCount}</p>
                  </div>
                  <div className="p-2 rounded-md bg-amber-100 dark:bg-amber-900">
                    <Clock className="w-5 h-5 text-amber-700 dark:text-amber-300" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-wrap items-center gap-3" data-testid="filter-bar">
            <Select value={severityFilter} onValueChange={setSeverityFilter} data-testid="select-severity">
              <SelectTrigger className="w-[160px]" data-testid="select-trigger-severity">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" data-testid="select-item-severity-all">All Severity</SelectItem>
                <SelectItem value="High" data-testid="select-item-severity-high">High</SelectItem>
                <SelectItem value="Medium" data-testid="select-item-severity-medium">Medium</SelectItem>
                <SelectItem value="Low" data-testid="select-item-severity-low">Low</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter} data-testid="select-status">
              <SelectTrigger className="w-[200px]" data-testid="select-trigger-status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" data-testid="select-item-status-all">All Statuses</SelectItem>
                <SelectItem value="New" data-testid="select-item-status-new">New</SelectItem>
                <SelectItem value="Triage" data-testid="select-item-status-triage">Triage</SelectItem>
                <SelectItem value="In Remediation" data-testid="select-item-status-remediation">In Remediation</SelectItem>
                <SelectItem value="Evidence Submitted" data-testid="select-item-status-evidence">Evidence Submitted</SelectItem>
                <SelectItem value="Verified" data-testid="select-item-status-verified">Verified</SelectItem>
                <SelectItem value="Closed" data-testid="select-item-status-closed">Closed</SelectItem>
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

          <Card data-testid="findings-table-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" data-testid="th-expand"></TableHead>
                  <TableHead data-testid="th-title">Title</TableHead>
                  <TableHead data-testid="th-source">Source</TableHead>
                  <TableHead data-testid="th-severity">Severity</TableHead>
                  <TableHead data-testid="th-status">Status</TableHead>
                  <TableHead data-testid="th-bu">Business Unit</TableHead>
                  <TableHead data-testid="th-owner">Owner</TableHead>
                  <TableHead data-testid="th-due-date">Due Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-muted-foreground" data-testid="text-no-findings">
                      No findings found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((f) => {
                    const overdue = isOverdue(f);
                    const expanded = expandedId === f.id;
                    return (
                      <>
                        <TableRow
                          key={f.id}
                          className={`cursor-pointer ${overdue ? "bg-red-50 dark:bg-red-950/30" : ""}`}
                          onClick={() => setExpandedId(expanded ? null : f.id)}
                          data-testid={`row-finding-${f.id}`}
                        >
                          <TableCell data-testid={`button-expand-${f.id}`}>
                            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </TableCell>
                          <TableCell className="font-medium" data-testid={`text-title-${f.id}`}>
                            {f.title}
                            {overdue && <span className="ml-2 text-xs text-red-600 dark:text-red-400 font-medium">OVERDUE</span>}
                          </TableCell>
                          <TableCell className="text-sm" data-testid={`text-source-${f.id}`}>{f.source}</TableCell>
                          <TableCell data-testid={`badge-severity-${f.id}`}>
                            <Badge variant={getSeverityVariant(f.severity)}>{f.severity}</Badge>
                          </TableCell>
                          <TableCell data-testid={`badge-status-${f.id}`}>
                            <Badge variant="outline">{f.status}</Badge>
                          </TableCell>
                          <TableCell className="text-sm" data-testid={`text-bu-${f.id}`}>
                            {buMap.get(f.businessUnitId)?.name ?? `BU #${f.businessUnitId}`}
                          </TableCell>
                          <TableCell className="text-sm" data-testid={`text-owner-${f.id}`}>{f.owner}</TableCell>
                          <TableCell className="text-sm text-muted-foreground" data-testid={`text-due-date-${f.id}`}>
                            {f.dueDate ? format(new Date(f.dueDate), "MMM d, yyyy") : "--"}
                          </TableCell>
                        </TableRow>
                        {expanded && (
                          <TableRow key={`detail-${f.id}`} data-testid={`detail-panel-${f.id}`}>
                            <TableCell colSpan={8} className="bg-muted/30 p-6">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div className="space-y-3">
                                  <div>
                                    <p className="font-medium text-muted-foreground mb-1" data-testid={`label-description-${f.id}`}>Description</p>
                                    <p data-testid={`text-description-${f.id}`}>{f.description ?? "--"}</p>
                                  </div>
                                  <div>
                                    <p className="font-medium text-muted-foreground mb-1" data-testid={`label-root-cause-${f.id}`}>Root Cause</p>
                                    <p data-testid={`text-root-cause-${f.id}`}>{f.rootCause ?? "--"}</p>
                                  </div>
                                </div>
                                <div className="space-y-3">
                                  <div>
                                    <p className="font-medium text-muted-foreground mb-1" data-testid={`label-remediation-${f.id}`}>Remediation Plan</p>
                                    <p data-testid={`text-remediation-${f.id}`}>{f.remediationPlan ?? "--"}</p>
                                  </div>
                                  <div className="flex flex-wrap gap-4">
                                    {f.requirementId && (
                                      <div>
                                        <p className="font-medium text-muted-foreground mb-1">Related Requirement</p>
                                        <p data-testid={`text-related-req-${f.id}`}>REQ #{f.requirementId}</p>
                                      </div>
                                    )}
                                    {f.documentId && (
                                      <div>
                                        <p className="font-medium text-muted-foreground mb-1">Related Document</p>
                                        <p data-testid={`text-related-doc-${f.id}`}>Doc #{f.documentId}</p>
                                      </div>
                                    )}
                                    {f.approver && (
                                      <div>
                                        <p className="font-medium text-muted-foreground mb-1">Approver</p>
                                        <p data-testid={`text-approver-${f.id}`}>{f.approver}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
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
