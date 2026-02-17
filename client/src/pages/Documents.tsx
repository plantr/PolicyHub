import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { format } from "date-fns";
import type { Document, BusinessUnit } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const DOC_TYPES = ["All", "Policy", "Standard", "Procedure"];
const TAXONOMIES = ["All", "AML", "Safeguarding", "Information Security", "Compliance", "Operations"];

function getDocTypeBadgeVariant(docType: string): "default" | "secondary" | "outline" {
  switch (docType) {
    case "Policy":
      return "default";
    case "Standard":
      return "secondary";
    case "Procedure":
      return "outline";
    default:
      return "default";
  }
}

export default function Documents() {
  const [docTypeFilter, setDocTypeFilter] = useState("All");
  const [taxonomyFilter, setTaxonomyFilter] = useState("All");
  const [buFilter, setBuFilter] = useState("All");

  const { data: documents, isLoading: docsLoading } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
  });

  const { data: businessUnits, isLoading: busLoading } = useQuery<BusinessUnit[]>({
    queryKey: ["/api/business-units"],
  });

  const isLoading = docsLoading || busLoading;

  const buMap = useMemo(() => {
    const map = new Map<number, string>();
    businessUnits?.forEach((bu) => map.set(bu.id, bu.name));
    return map;
  }, [businessUnits]);

  const filteredDocuments = useMemo(() => {
    if (!documents) return [];
    return documents.filter((doc) => {
      if (docTypeFilter !== "All" && doc.docType !== docTypeFilter) return false;
      if (taxonomyFilter !== "All" && doc.taxonomy !== taxonomyFilter) return false;
      if (buFilter !== "All") {
        const buName = doc.businessUnitId ? buMap.get(doc.businessUnitId) : "Group";
        if (buName !== buFilter) return false;
      }
      return true;
    });
  }, [documents, docTypeFilter, taxonomyFilter, buFilter, buMap]);

  return (
    <div className="space-y-6" data-testid="page-documents">
      <div data-testid="section-page-header">
        <h1 className="text-2xl font-semibold" data-testid="text-page-title">Documents</h1>
        <p className="text-muted-foreground text-sm mt-1" data-testid="text-page-subtitle">
          Policy estate document library
        </p>
      </div>

      <Card className="p-4" data-testid="section-filters">
        <div className="flex flex-wrap items-center gap-3">
          <Select value={docTypeFilter} onValueChange={setDocTypeFilter}>
            <SelectTrigger className="w-[160px]" data-testid="select-doc-type-filter">
              <SelectValue placeholder="Document Type" />
            </SelectTrigger>
            <SelectContent>
              {DOC_TYPES.map((t) => (
                <SelectItem key={t} value={t} data-testid={`option-doc-type-${t.toLowerCase()}`}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={taxonomyFilter} onValueChange={setTaxonomyFilter}>
            <SelectTrigger className="w-[200px]" data-testid="select-taxonomy-filter">
              <SelectValue placeholder="Taxonomy" />
            </SelectTrigger>
            <SelectContent>
              {TAXONOMIES.map((t) => (
                <SelectItem key={t} value={t} data-testid={`option-taxonomy-${t.toLowerCase().replace(/\s+/g, "-")}`}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={buFilter} onValueChange={setBuFilter}>
            <SelectTrigger className="w-[200px]" data-testid="select-bu-filter">
              <SelectValue placeholder="Business Unit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All" data-testid="option-bu-all">All</SelectItem>
              {businessUnits?.map((bu) => (
                <SelectItem key={bu.id} value={bu.name} data-testid={`option-bu-${bu.id}`}>
                  {bu.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card data-testid="section-documents-table">
        {isLoading ? (
          <div className="p-4 space-y-3" data-testid="loading-skeleton">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead data-testid="col-title">Title</TableHead>
                <TableHead data-testid="col-type">Type</TableHead>
                <TableHead data-testid="col-taxonomy">Taxonomy</TableHead>
                <TableHead data-testid="col-owner">Owner</TableHead>
                <TableHead data-testid="col-review-frequency">Review Frequency</TableHead>
                <TableHead data-testid="col-next-review">Next Review</TableHead>
                <TableHead data-testid="col-bu">BU</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocuments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8" data-testid="text-no-documents">
                    No documents found
                  </TableCell>
                </TableRow>
              ) : (
                filteredDocuments.map((doc) => (
                  <TableRow key={doc.id} className="hover-elevate" data-testid={`row-document-${doc.id}`}>
                    <TableCell>
                      <Link href={`/documents/${doc.id}`} data-testid={`link-document-${doc.id}`}>
                        <span className="font-medium text-foreground hover:underline cursor-pointer">
                          {doc.title}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getDocTypeBadgeVariant(doc.docType)} data-testid={`badge-type-${doc.id}`}>
                        {doc.docType}
                      </Badge>
                    </TableCell>
                    <TableCell data-testid={`text-taxonomy-${doc.id}`}>{doc.taxonomy}</TableCell>
                    <TableCell data-testid={`text-owner-${doc.id}`}>{doc.owner}</TableCell>
                    <TableCell data-testid={`text-review-freq-${doc.id}`}>
                      {doc.reviewFrequency || "-"}
                    </TableCell>
                    <TableCell data-testid={`text-next-review-${doc.id}`}>
                      {doc.nextReviewDate
                        ? format(new Date(doc.nextReviewDate), "dd MMM yyyy")
                        : "-"}
                    </TableCell>
                    <TableCell data-testid={`text-bu-${doc.id}`}>
                      {doc.businessUnitId ? buMap.get(doc.businessUnitId) || "Unknown" : "Group"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
