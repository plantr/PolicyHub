import { useRequirements } from "@/hooks/use-requirements";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen } from "lucide-react";

export default function Requirements() {
  const { data: requirements, isLoading } = useRequirements();

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">
      <Header 
        title="Regulatory Requirements" 
        description="External regulations and laws that must be adhered to."
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
                <TableHead className="w-[150px]">Code</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-[200px]">Source</TableHead>
                <TableHead className="w-[150px]">Category</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requirements?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="h-40 text-center text-muted-foreground">
                    No requirements loaded.
                  </TableCell>
                </TableRow>
              )}
              {requirements?.map((req) => (
                <TableRow key={req.id} className="hover:bg-muted/30">
                  <TableCell className="font-mono text-sm font-medium text-primary">
                    {req.code}
                  </TableCell>
                  <TableCell className="max-w-[500px]">{req.description}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-muted-foreground" />
                      {req.source}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center px-2 py-1 rounded-md bg-muted text-xs font-medium text-muted-foreground">
                      {req.category}
                    </span>
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
