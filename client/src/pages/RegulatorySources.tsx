import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink } from "lucide-react";
import type { RegulatorySource } from "@shared/schema";

const JURISDICTION_ORDER = ["UK", "Gibraltar", "Estonia/EU", "International"];

function groupByJurisdiction(sources: RegulatorySource[]) {
  const groups: Record<string, RegulatorySource[]> = {};
  for (const s of sources) {
    const key = s.jurisdiction;
    if (!groups[key]) groups[key] = [];
    groups[key].push(s);
  }
  const ordered: [string, RegulatorySource[]][] = [];
  for (const j of JURISDICTION_ORDER) {
    if (groups[j]) {
      ordered.push([j, groups[j]]);
      delete groups[j];
    }
  }
  for (const [j, list] of Object.entries(groups)) {
    ordered.push([j, list]);
  }
  return ordered;
}

export default function RegulatorySources() {
  const { data: sources, isLoading } = useQuery<RegulatorySource[]>({
    queryKey: ["/api/regulatory-sources"],
  });

  const groups = groupByJurisdiction(sources ?? []);

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6" data-testid="regulatory-sources-page">
      <div data-testid="regulatory-sources-header">
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Regulatory Sources</h1>
        <p className="text-sm text-muted-foreground" data-testid="text-page-subtitle">Applicable legislation and regulatory instruments</p>
      </div>

      {isLoading ? (
        <div className="space-y-6" data-testid="sources-skeleton">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-6 w-[160px]" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ))}
        </div>
      ) : groups.length === 0 ? (
        <p className="text-muted-foreground text-center py-12" data-testid="text-no-sources">No regulatory sources found.</p>
      ) : (
        groups.map(([jurisdiction, items]) => (
          <div key={jurisdiction} className="space-y-3" data-testid={`section-jurisdiction-${jurisdiction}`}>
            <h2 className="text-lg font-semibold" data-testid={`text-jurisdiction-heading-${jurisdiction}`}>{jurisdiction}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {items.map((source) => (
                <Card key={source.id} data-testid={`card-source-${source.id}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <CardTitle className="text-base" data-testid={`text-source-name-${source.id}`}>
                        {source.name}
                      </CardTitle>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" data-testid={`badge-short-name-${source.id}`}>{source.shortName}</Badge>
                        <Badge variant="outline" data-testid={`badge-category-${source.id}`}>{source.category}</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {source.description && (
                      <p className="text-sm text-muted-foreground" data-testid={`text-source-description-${source.id}`}>
                        {source.description}
                      </p>
                    )}
                    {source.url && (
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-primary"
                        data-testid={`link-source-url-${source.id}`}
                      >
                        <ExternalLink className="w-3 h-3" />
                        View source
                      </a>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
