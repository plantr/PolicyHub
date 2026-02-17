import { useFindings } from "@/hooks/use-findings";
import { Header } from "@/components/Header";
import { StatusBadge } from "@/components/StatusBadge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { AlertCircle, Plus } from "lucide-react";

export default function Findings() {
  const { data: findings, isLoading } = useFindings();

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">
      <Header 
        title="Audit Findings" 
        description="Track issues, non-conformities, and remediation plans."
        action={
          <Button className="gap-2 shadow-lg hover:shadow-xl transition-all">
            <Plus className="w-4 h-4" />
            Report Finding
          </Button>
        }
      />

      <Card className="border-border/50 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Business Unit</TableHead>
                <TableHead>Due Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {findings?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-40 text-center text-muted-foreground">
                    No findings reported. Good job!
                  </TableCell>
                </TableRow>
              )}
              {findings?.map((finding) => (
                <TableRow key={finding.id} className="hover:bg-muted/30 cursor-pointer">
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <AlertCircle className={`w-4 h-4 ${finding.severity === 'High' ? 'text-red-500' : 'text-amber-500'}`} />
                      {finding.title}
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={finding.severity} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={finding.status} />
                  </TableCell>
                  <TableCell>BU-{finding.businessUnitId}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {finding.dueDate ? format(new Date(finding.dueDate), 'MMM d, yyyy') : '-'}
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
