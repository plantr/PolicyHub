import { useCoverage } from "@/hooks/use-coverage";
import { Header } from "@/components/Header";
import { StatusBadge } from "@/components/StatusBadge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldCheck, AlertOctagon } from "lucide-react";

export default function GapAnalysis() {
  const { data: coverage, isLoading } = useCoverage();

  // In a real app, you would join tables here or fetch joined data
  // Assuming coverage contains policyId and requirementId
  // For this shell, we'll just display the raw list or mock joins visually

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">
      <Header 
        title="Gap Analysis" 
        description="Traceability matrix between Requirements and Policies."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-xl flex items-center gap-4">
          <div className="p-3 bg-emerald-100 rounded-lg text-emerald-700">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm text-emerald-800 font-medium">Fully Covered</div>
            <div className="text-2xl font-bold text-emerald-900">85%</div>
          </div>
        </div>
        <div className="bg-red-50 border border-red-100 p-6 rounded-xl flex items-center gap-4">
          <div className="p-3 bg-red-100 rounded-lg text-red-700">
            <AlertOctagon className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm text-red-800 font-medium">Critical Gaps</div>
            <div className="text-2xl font-bold text-red-900">12</div>
          </div>
        </div>
      </div>

      <Card className="border-border/50 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Requirement ID</TableHead>
                <TableHead>Policy Reference</TableHead>
                <TableHead>Coverage Status</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coverage?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="h-40 text-center text-muted-foreground">
                    No mapping data available.
                  </TableCell>
                </TableRow>
              )}
              {coverage?.map((item) => (
                <TableRow key={item.id} className="hover:bg-muted/30">
                  <TableCell className="font-mono text-sm">REQ-{item.requirementId}</TableCell>
                  <TableCell className="text-primary font-medium">POL-{item.policyId}</TableCell>
                  <TableCell>
                    <StatusBadge status={item.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm max-w-md truncate">
                    {item.notes || '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
