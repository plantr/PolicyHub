import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, ListChecks, ShieldCheck, AlertTriangle } from "lucide-react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { Finding, BusinessUnit } from "@shared/schema";

interface Stats {
  totalDocuments: number;
  totalControls: number;
  totalSources: number;
  businessUnits: number;
  coveredCount: number;
  partiallyCoveredCount: number;
  notCoveredCount: number;
  openFindings: number;
  overdueFindings: number;
  pendingApprovals: number;
  pendingReviews: number;
}

function getSeverityVariant(severity: string) {
  switch (severity) {
    case "High": return "destructive" as const;
    case "Medium": return "default" as const;
    case "Low": return "secondary" as const;
    default: return "secondary" as const;
  }
}

function getStatusVariant(status: string) {
  switch (status) {
    case "New":
    case "Triage":
      return "outline" as const;
    case "In Remediation":
      return "default" as const;
    case "Evidence Submitted":
    case "Verified":
      return "secondary" as const;
    case "Closed":
      return "outline" as const;
    default:
      return "outline" as const;
  }
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return "--";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<Stats>({
    queryKey: ["stats"],
    queryFn: async () => {
      const res = await fetch("/api/stats");
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
  });

  const { data: findings, isLoading: findingsLoading } = useQuery<Finding[]>({
    queryKey: ["/api/findings"],
  });

  const { data: businessUnits, isLoading: busLoading } = useQuery<BusinessUnit[]>({
    queryKey: ["/api/business-units"],
  });

  const isLoading = statsLoading || findingsLoading || busLoading;

  if (isLoading) return <DashboardSkeleton />;

  const totalMapped = (stats?.coveredCount ?? 0) + (stats?.partiallyCoveredCount ?? 0) + (stats?.notCoveredCount ?? 0);
  const coverageRate = totalMapped > 0
    ? Math.round(((stats?.coveredCount ?? 0) / totalMapped) * 100)
    : 0;

  const coverageData = [
    { name: "Covered", value: stats?.coveredCount ?? 0 },
    { name: "Partially Covered", value: stats?.partiallyCoveredCount ?? 0 },
    { name: "Not Covered", value: stats?.notCoveredCount ?? 0 },
  ];
  const COVERAGE_COLORS = ["#22c55e", "#f59e0b", "#ef4444"];

  const severityCounts: Record<string, number> = { High: 0, Medium: 0, Low: 0 };
  (findings ?? []).forEach((f) => {
    if (f.severity in severityCounts) {
      severityCounts[f.severity]++;
    }
  });
  const severityData = [
    { name: "High", count: severityCounts.High },
    { name: "Medium", count: severityCounts.Medium },
    { name: "Low", count: severityCounts.Low },
  ];
  const SEVERITY_COLORS: Record<string, string> = {
    High: "#ef4444",
    Medium: "#f59e0b",
    Low: "#3b82f6",
  };

  const recentFindings = [...(findings ?? [])]
    .sort((a, b) => {
      const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return db - da;
    })
    .slice(0, 5);

  const buMap = new Map((businessUnits ?? []).map((bu) => [bu.id, bu]));

  return (
    <div className="space-y-6" data-testid="dashboard-page">
      <div data-testid="dashboard-header">
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1" data-testid="text-page-subtitle">Policy management overview</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="stats-grid">
        <StatCard
          title="Total Documents"
          value={stats?.totalDocuments ?? 0}
          icon={FileText}
          testId="stat-total-documents"
        />
        <StatCard
          title="Total Controls"
          value={stats?.totalControls ?? 0}
          icon={ListChecks}
          testId="stat-total-controls"
        />
        <StatCard
          title="Coverage Rate"
          value={`${coverageRate}%`}
          icon={ShieldCheck}
          testId="stat-coverage-rate"
        />
        <StatCard
          title="Open Findings"
          value={stats?.openFindings ?? 0}
          icon={AlertTriangle}
          testId="stat-open-findings"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" data-testid="charts-row">
        <Card data-testid="chart-coverage-distribution">
          <CardHeader>
            <CardTitle>Coverage Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={coverageData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  dataKey="value"
                >
                  {coverageData.map((_, idx) => (
                    <Cell key={idx} fill={COVERAGE_COLORS[idx]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-4 mt-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#22c55e" }} />
                <span>Covered</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#f59e0b" }} />
                <span>Partially Covered</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#ef4444" }} />
                <span>Not Covered</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="chart-findings-severity">
          <CardHeader>
            <CardTitle>Findings by Severity</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={severityData}>
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count">
                  {severityData.map((entry) => (
                    <Cell key={entry.name} fill={SEVERITY_COLORS[entry.name]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="recent-findings-table">
        <CardHeader>
          <CardTitle>Recent Findings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Title</th>
                  <th className="pb-2 pr-4 font-medium">Severity</th>
                  <th className="pb-2 pr-4 font-medium">Status</th>
                  <th className="pb-2 pr-4 font-medium">Business Unit</th>
                  <th className="pb-2 font-medium">Due Date</th>
                </tr>
              </thead>
              <tbody>
                {recentFindings.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-muted-foreground" data-testid="text-no-findings">
                      No findings recorded
                    </td>
                  </tr>
                ) : (
                  recentFindings.map((f) => (
                    <tr key={f.id} className="border-b last:border-0" data-testid={`row-finding-${f.id}`}>
                      <td className="py-3 pr-4 font-medium" data-testid={`text-finding-title-${f.id}`}>{f.title}</td>
                      <td className="py-3 pr-4">
                        <Badge variant={getSeverityVariant(f.severity)} data-testid={`badge-severity-${f.id}`}>
                          {f.severity}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant={getStatusVariant(f.status)} data-testid={`badge-status-${f.id}`}>
                          {f.status}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground" data-testid={`text-finding-bu-${f.id}`}>
                        {buMap.get(f.businessUnitId)?.name ?? `BU #${f.businessUnitId}`}
                      </td>
                      <td className="py-3 text-muted-foreground" data-testid={`text-finding-due-${f.id}`}>
                        {formatDate(f.dueDate as any)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div data-testid="business-units-section">
        <h2 className="text-lg font-semibold mb-3" data-testid="text-bu-heading">Business Units</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(businessUnits ?? []).map((bu) => (
            <Card key={bu.id} data-testid={`card-bu-${bu.id}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base" data-testid={`text-bu-name-${bu.id}`}>{bu.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p className="text-muted-foreground" data-testid={`text-bu-jurisdiction-${bu.id}`}>
                  Jurisdiction: {bu.jurisdiction}
                </p>
                <p className="text-muted-foreground" data-testid={`text-bu-type-${bu.id}`}>
                  Type: {bu.type}
                </p>
                <div className="flex flex-wrap gap-1 pt-1" data-testid={`text-bu-activities-${bu.id}`}>
                  {(bu.activities ?? []).map((act, i) => (
                    <Badge key={i} variant="secondary" data-testid={`badge-activity-${bu.id}-${i}`}>
                      {act}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
          {(businessUnits ?? []).length === 0 && (
            <p className="text-muted-foreground col-span-full text-center py-6" data-testid="text-no-bus">
              No business units found
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  testId,
}: {
  title: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  testId: string;
}) {
  return (
    <Card data-testid={testId}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-sm text-muted-foreground" data-testid={`${testId}-label`}>{title}</p>
            <p className="text-2xl font-bold mt-1" data-testid={`${testId}-value`}>{value}</p>
          </div>
          <div className="p-2 rounded-md bg-muted">
            <Icon className="w-5 h-5 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6" data-testid="dashboard-skeleton">
      <div className="space-y-2">
        <Skeleton className="h-8 w-[180px]" />
        <Skeleton className="h-4 w-[260px]" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 rounded-md" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-[360px] rounded-md" />
        <Skeleton className="h-[360px] rounded-md" />
      </div>
      <Skeleton className="h-[280px] rounded-md" />
      <Skeleton className="h-[200px] rounded-md" />
    </div>
  );
}
