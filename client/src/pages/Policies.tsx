import { usePolicies } from "@/hooks/use-policies";
import { Header } from "@/components/Header";
import { StatusBadge } from "@/components/StatusBadge";
import { CreatePolicyDialog } from "@/components/CreatePolicyDialog";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Filter, MoreHorizontal, FileText } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";

export default function Policies() {
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [search, setSearch] = useState("");
  const { data: policies, isLoading } = usePolicies({ status: statusFilter });

  // Client-side search filtering
  const filteredPolicies = policies?.filter(p => 
    p.title.toLowerCase().includes(search.toLowerCase()) || 
    p.owner.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">
      <Header 
        title="Policy Library" 
        description="Manage internal policies, standards, and procedures."
        action={<CreatePolicyDialog />}
      />

      <div className="flex gap-4 items-center bg-card p-4 rounded-xl border border-border shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
          <Input 
            className="pl-9 bg-background border-border/50" 
            placeholder="Search policies..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px] bg-background border-border/50">
            <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Statuses</SelectItem>
            <SelectItem value="Draft">Draft</SelectItem>
            <SelectItem value="In Review">In Review</SelectItem>
            <SelectItem value="Published">Published</SelectItem>
          </SelectContent>
        </Select>
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
                <TableHead className="w-[400px]">Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPolicies?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-40 text-center text-muted-foreground">
                    No policies found matching your criteria.
                  </TableCell>
                </TableRow>
              )}
              {filteredPolicies?.map((policy) => (
                <TableRow key={policy.id} className="group hover:bg-muted/30 cursor-pointer transition-colors">
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg text-primary">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-foreground">{policy.title}</div>
                        <div className="text-xs text-muted-foreground">{policy.version}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{policy.type}</TableCell>
                  <TableCell>
                    <StatusBadge status={policy.status} />
                  </TableCell>
                  <TableCell>{policy.owner}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {policy.lastUpdated ? format(new Date(policy.lastUpdated), 'MMM d, yyyy') : '-'}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
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
