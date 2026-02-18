import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Shield, AlertTriangle, TrendingUp, Activity } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import type { Risk } from "@shared/schema";

function getRatingColor(rating: string) {
  switch (rating) {
    case "Critical":
      return "text-red-500 dark:text-red-400";
    case "High":
      return "text-orange-500 dark:text-orange-400";
    case "Medium":
      return "text-yellow-600 dark:text-yellow-400";
    case "Low":
      return "text-green-600 dark:text-green-400";
    default:
      return "text-muted-foreground";
  }
}

function getRatingBadgeVariant(rating: string) {
  switch (rating) {
    case "Critical":
    case "High":
      return "destructive" as const;
    case "Medium":
      return "default" as const;
    case "Low":
      return "secondary" as const;
    default:
      return "secondary" as const;
  }
}

function getHeatmapColor(score: number) {
  if (score >= 20) return "bg-red-500/80 dark:bg-red-600/80 text-white";
  if (score >= 12) return "bg-orange-400/80 dark:bg-orange-500/80 text-white";
  if (score >= 6) return "bg-yellow-400/80 dark:bg-yellow-500/80 text-black dark:text-white";
  return "bg-green-400/80 dark:bg-green-500/80 text-black dark:text-white";
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return "--";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const STATUS_COLORS: Record<string, string> = {
  Identified: "#3b82f6",
  Assessing: "#8b5cf6",
  Mitigating: "#f59e0b",
  Accepted: "#22c55e",
  Closed: "#6b7280",
};

export default function RiskOverview() {
  const { data: risks, isLoading: risksLoading } = useQuery<Risk[]>({
    queryKey: ["/api/risks"],
  });

  if (risksLoading) return <RiskOverviewSkeleton />;

  const allRisks = risks ?? [];

  const criticalCount = allRisks.filter((r) => r.inherentRating === "Critical").length;
  const highCount = allRisks.filter((r) => r.inherentRating === "High").length;
  const mediumCount = allRisks.filter((r) => r.inherentRating === "Medium").length;
  const lowCount = allRisks.filter((r) => r.inherentRating === "Low").length;

  const statusCounts: Record<string, number> = {
    Identified: 0,
    Assessing: 0,
    Mitigating: 0,
    Accepted: 0,
    Closed: 0,
  };
  allRisks.forEach((r) => {
    if (r.status in statusCounts) {
      statusCounts[r.status]++;
    } else {
      statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
    }
  });

  const statusData = Object.entries(statusCounts)
    .filter(([, count]) => count > 0)
    .map(([name, value]) => ({ name, value }));

  const heatmapData: Record<string, number> = {};
  allRisks.forEach((r) => {
    const key = `${r.inherentLikelihood}-${r.inherentImpact}`;
    heatmapData[key] = (heatmapData[key] || 0) + 1;
  });

  const recentRisks = [...allRisks]
    .sort((a, b) => {
      const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return db - da;
    })
    .slice(0, 5);

  return (
    <div className="space-y-6" data-testid="risk-overview-page">
      <div data-testid="risk-overview-header">
        <h1
          className="text-2xl font-semibold tracking-tight"
          data-testid="text-page-title"
        >
          Risk Management Overview
        </h1>
        <p
          className="text-sm text-muted-foreground mt-1"
          data-testid="text-page-subtitle"
        >
          Risk register summary and heatmap
        </p>
      </div>

      <div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4"
        data-testid="risk-stats-grid"
      >
        <Card data-testid="stat-total-risks">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground" data-testid="stat-total-risks-label">
                  Total Risks
                </p>
                <p className="text-2xl font-bold mt-1" data-testid="stat-total-risks-value">
                  {allRisks.length}
                </p>
              </div>
              <div className="p-2 rounded-md bg-muted">
                <Shield className="w-5 h-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="stat-critical-risks">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground" data-testid="stat-critical-risks-label">
                  Critical
                </p>
                <p
                  className="text-2xl font-bold mt-1 text-red-500 dark:text-red-400"
                  data-testid="stat-critical-risks-value"
                >
                  {criticalCount}
                </p>
              </div>
              <div className="p-2 rounded-md bg-red-100 dark:bg-red-900/30">
                <AlertTriangle className="w-5 h-5 text-red-500 dark:text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="stat-high-risks">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground" data-testid="stat-high-risks-label">
                  High
                </p>
                <p
                  className="text-2xl font-bold mt-1 text-orange-500 dark:text-orange-400"
                  data-testid="stat-high-risks-value"
                >
                  {highCount}
                </p>
              </div>
              <div className="p-2 rounded-md bg-orange-100 dark:bg-orange-900/30">
                <TrendingUp className="w-5 h-5 text-orange-500 dark:text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="stat-medium-risks">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground" data-testid="stat-medium-risks-label">
                  Medium
                </p>
                <p
                  className="text-2xl font-bold mt-1 text-yellow-600 dark:text-yellow-400"
                  data-testid="stat-medium-risks-value"
                >
                  {mediumCount}
                </p>
              </div>
              <div className="p-2 rounded-md bg-yellow-100 dark:bg-yellow-900/30">
                <Activity className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="stat-low-risks">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground" data-testid="stat-low-risks-label">
                  Low
                </p>
                <p
                  className="text-2xl font-bold mt-1 text-green-600 dark:text-green-400"
                  data-testid="stat-low-risks-value"
                >
                  {lowCount}
                </p>
              </div>
              <div className="p-2 rounded-md bg-green-100 dark:bg-green-900/30">
                <Shield className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" data-testid="charts-row">
        <Card data-testid="chart-risk-status">
          <CardHeader>
            <CardTitle>Risk Distribution by Status</CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.length === 0 ? (
              <p className="text-center text-muted-foreground py-8" data-testid="text-no-status-data">
                No risk data available
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {statusData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={STATUS_COLORS[entry.name] || "#6b7280"}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card data-testid="chart-risk-heatmap">
          <CardHeader>
            <CardTitle>Inherent Risk Heatmap</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <div className="flex flex-col justify-between py-1 pr-1">
                <span className="text-xs text-muted-foreground text-right">5</span>
                <span className="text-xs text-muted-foreground text-right">4</span>
                <span className="text-xs text-muted-foreground text-right">3</span>
                <span className="text-xs text-muted-foreground text-right">2</span>
                <span className="text-xs text-muted-foreground text-right">1</span>
              </div>
              <div className="flex-1">
                <div
                  className="grid grid-cols-5 gap-1"
                  data-testid="heatmap-grid"
                >
                  {[5, 4, 3, 2, 1].map((likelihood) =>
                    [1, 2, 3, 4, 5].map((impact) => {
                      const score = likelihood * impact;
                      const count = heatmapData[`${likelihood}-${impact}`] || 0;
                      return (
                        <div
                          key={`${likelihood}-${impact}`}
                          className={`aspect-square flex items-center justify-center rounded-md text-xs font-medium ${getHeatmapColor(score)}`}
                          data-testid={`heatmap-cell-${likelihood}-${impact}`}
                          title={`Likelihood: ${likelihood}, Impact: ${impact}, Score: ${score}, Count: ${count}`}
                        >
                          {count > 0 ? count : ""}
                        </div>
                      );
                    })
                  )}
                </div>
                <div className="flex justify-between mt-1 px-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <span key={i} className="text-xs text-muted-foreground">
                      {i}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between mt-3">
              <span className="text-xs text-muted-foreground italic">
                Likelihood (Y) vs Impact (X)
              </span>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-sm bg-green-400 dark:bg-green-500" />
                  <span className="text-xs text-muted-foreground">Low</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-sm bg-yellow-400 dark:bg-yellow-500" />
                  <span className="text-xs text-muted-foreground">Medium</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-sm bg-orange-400 dark:bg-orange-500" />
                  <span className="text-xs text-muted-foreground">High</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-sm bg-red-500 dark:bg-red-600" />
                  <span className="text-xs text-muted-foreground">Critical</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="recent-risks-table">
        <CardHeader>
          <CardTitle>Recent Risks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Inherent Rating</TableHead>
                  <TableHead>Residual Rating</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentRisks.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center text-muted-foreground py-6"
                      data-testid="text-no-risks"
                    >
                      No risks recorded
                    </TableCell>
                  </TableRow>
                ) : (
                  recentRisks.map((r) => (
                    <TableRow key={r.id} data-testid={`row-risk-${r.id}`}>
                      <TableCell
                        className="font-medium"
                        data-testid={`text-risk-title-${r.id}`}
                      >
                        {r.title}
                      </TableCell>
                      <TableCell data-testid={`text-risk-category-${r.id}`}>
                        {r.category}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            r.status === "Closed" ? "secondary" : "default"
                          }
                          data-testid={`badge-risk-status-${r.id}`}
                        >
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`font-medium ${getRatingColor(r.inherentRating)}`}
                          data-testid={`text-risk-inherent-${r.id}`}
                        >
                          {r.inherentRating} ({r.inherentScore})
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={getRatingBadgeVariant(r.residualRating)}
                          data-testid={`badge-risk-residual-${r.id}`}
                        >
                          {r.residualRating} ({r.residualScore})
                        </Badge>
                      </TableCell>
                      <TableCell
                        className="text-muted-foreground"
                        data-testid={`text-risk-owner-${r.id}`}
                      >
                        {r.owner}
                      </TableCell>
                      <TableCell
                        className="text-muted-foreground"
                        data-testid={`text-risk-created-${r.id}`}
                      >
                        {formatDate(r.createdAt as any)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function RiskOverviewSkeleton() {
  return (
    <div className="space-y-6" data-testid="risk-overview-skeleton">
      <div className="space-y-2">
        <Skeleton className="h-8 w-[260px]" />
        <Skeleton className="h-4 w-[200px]" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-24 rounded-md" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-[360px] rounded-md" />
        <Skeleton className="h-[360px] rounded-md" />
      </div>
      <Skeleton className="h-[280px] rounded-md" />
    </div>
  );
}
