import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { Camera, Trash2, ChevronDown, ChevronUp, TrendingUp } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { RiskSnapshot } from "@shared/schema";

export default function RiskSnapshots() {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingSnapshot, setDeletingSnapshot] = useState<RiskSnapshot | null>(null);
  const { toast } = useToast();

  const { data: snapshots, isLoading } = useQuery<RiskSnapshot[]>({
    queryKey: ["risk-snapshots"],
    queryFn: async () => {
      const { data, error } = await supabase.from("risk_snapshots").select("*");
      if (error) throw error;
      return data ?? [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const name = `Snapshot ${format(new Date(), "yyyy-MM-dd")}`;
      return apiRequest("POST", "/api/risk-snapshots", { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["risk-snapshots"] });
      toast({ title: "Snapshot created" });
    },
    onError: () => toast({ title: "Error creating snapshot", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/risk-snapshots/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["risk-snapshots"] });
      toast({ title: "Snapshot deleted" });
      setDeleteConfirmOpen(false);
      setDeletingSnapshot(null);
    },
    onError: () => toast({ title: "Error deleting snapshot", variant: "destructive" }),
  });

  const sorted = [...(snapshots || [])].sort(
    (a, b) => new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime()
  );

  const chartData = sorted.map((s) => ({
    date: format(new Date(s.createdAt!), "dd MMM"),
    Critical: s.criticalCount,
    High: s.highCount,
    Medium: s.mediumCount,
    Low: s.lowCount,
  }));

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Risk Snapshots</h1>
            <p className="text-muted-foreground mt-1">Point-in-time records of risk posture</p>
          </div>
        </div>
        <Card><CardContent className="pt-6"><Skeleton className="h-64" /></CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Risk Snapshots</h1>
          <p className="text-muted-foreground mt-1">Point-in-time records of risk posture</p>
        </div>
        <Button
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending}
          data-testid="button-take-snapshot"
        >
          <Camera className="mr-2 h-4 w-4" />
          {createMutation.isPending ? "Taking..." : "Take Snapshot"}
        </Button>
      </div>

      {chartData.length >= 2 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold">Risk Trend</h2>
            </div>
            <div className="h-[300px]" data-testid="chart-risk-trend">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                      color: "hsl(var(--card-foreground))",
                    }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="Critical" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="High" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="Medium" stroke="#eab308" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="Low" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Total Risks</TableHead>
                <TableHead>Critical</TableHead>
                <TableHead>High</TableHead>
                <TableHead>Medium</TableHead>
                <TableHead>Low</TableHead>
                <TableHead>Open Actions</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    No snapshots taken yet. Click "Take Snapshot" to capture the current risk posture.
                  </TableCell>
                </TableRow>
              )}
              {[...sorted].reverse().map((s) => {
                const expanded = expandedId === s.id;
                const snapshotData = s.snapshotData as Record<string, unknown> | null;
                const risksByStatus = snapshotData?.risksByStatus as Record<string, number> | undefined;
                const risksByCategory = snapshotData?.risksByCategory as Record<string, number> | undefined;

                return (
                  <TableRow
                    key={s.id}
                    className="cursor-pointer"
                    onClick={() => setExpandedId(expanded ? null : s.id)}
                    data-testid={`row-snapshot-${s.id}`}
                  >
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {expanded ? <ChevronUp className="h-3 w-3 shrink-0" /> : <ChevronDown className="h-3 w-3 shrink-0" />}
                        <span className="font-medium" data-testid={`text-snapshot-name-${s.id}`}>{s.name}</span>
                      </div>
                      {expanded && snapshotData && (
                        <div className="mt-3 space-y-3 text-sm">
                          {risksByStatus && Object.keys(risksByStatus).length > 0 && (
                            <div>
                              <p className="font-medium text-muted-foreground mb-1">Risks by Status</p>
                              <div className="flex items-center gap-2 flex-wrap">
                                {Object.entries(risksByStatus).map(([status, count]) => (
                                  <Badge key={status} variant="outline">{status}: {count}</Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          {risksByCategory && Object.keys(risksByCategory).length > 0 && (
                            <div>
                              <p className="font-medium text-muted-foreground mb-1">Risks by Category</p>
                              <div className="flex items-center gap-2 flex-wrap">
                                {Object.entries(risksByCategory).map(([cat, count]) => (
                                  <Badge key={cat} variant="secondary">{cat}: {count}</Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          {s.createdBy && (
                            <p className="text-muted-foreground">Created by: {s.createdBy}</p>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell data-testid={`text-snapshot-date-${s.id}`}>
                      {s.createdAt ? format(new Date(s.createdAt), "dd MMM yyyy HH:mm") : "-"}
                    </TableCell>
                    <TableCell data-testid={`text-snapshot-total-${s.id}`}>
                      <Badge variant="outline">{s.totalRisks}</Badge>
                    </TableCell>
                    <TableCell data-testid={`text-snapshot-critical-${s.id}`}>
                      <Badge variant={s.criticalCount > 0 ? "destructive" : "secondary"}>{s.criticalCount}</Badge>
                    </TableCell>
                    <TableCell data-testid={`text-snapshot-high-${s.id}`}>
                      <Badge variant={s.highCount > 0 ? "destructive" : "secondary"}>{s.highCount}</Badge>
                    </TableCell>
                    <TableCell data-testid={`text-snapshot-medium-${s.id}`}>
                      <Badge variant={s.mediumCount > 0 ? "default" : "secondary"}>{s.mediumCount}</Badge>
                    </TableCell>
                    <TableCell data-testid={`text-snapshot-low-${s.id}`}>
                      <Badge variant="secondary">{s.lowCount}</Badge>
                    </TableCell>
                    <TableCell data-testid={`text-snapshot-actions-${s.id}`}>
                      {s.openActions}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingSnapshot(s);
                          setDeleteConfirmOpen(true);
                        }}
                        data-testid={`button-delete-snapshot-${s.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Snapshot</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingSnapshot?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)} data-testid="button-cancel-delete">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingSnapshot && deleteMutation.mutate(deletingSnapshot.id)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}