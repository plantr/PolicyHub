import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Shield, FileText, AlertTriangle, CheckCircle, Clock, XCircle, BookOpen, Target } from "lucide-react";
import type { Document, Finding, Commitment, KnowledgeBaseArticle, BusinessUnit, ControlMapping } from "@shared/schema";

function StatCard({ title, value, icon: Icon, description }: { title: string; value: string | number; icon: React.ElementType; description?: string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold" data-testid={`text-stat-${title.toLowerCase().replace(/\s+/g, "-")}`}>{value}</div>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </CardContent>
    </Card>
  );
}

function ComplianceGauge({ label, current, total }: { label: string; current: number; total: number }) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-sm text-muted-foreground">{current}/{total} ({pct}%)</span>
      </div>
      <Progress value={pct} className="h-2" />
    </div>
  );
}

export default function TrustCenter() {
  const { data: documents, isLoading: docsLoading } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
  });
  const { data: findings, isLoading: findingsLoading } = useQuery<Finding[]>({
    queryKey: ["/api/findings"],
  });
  const { data: commitmentsList, isLoading: commitmentsLoading } = useQuery<Commitment[]>({
    queryKey: ["/api/commitments"],
  });
  const { data: articles, isLoading: articlesLoading } = useQuery<KnowledgeBaseArticle[]>({
    queryKey: ["/api/knowledge-base"],
  });
  const { data: businessUnits, isLoading: buLoading } = useQuery<BusinessUnit[]>({
    queryKey: ["/api/business-units"],
  });
  const { data: mappings, isLoading: mappingsLoading } = useQuery<ControlMapping[]>({
    queryKey: ["/api/control-mappings"],
  });

  const isLoading = docsLoading || findingsLoading || commitmentsLoading || articlesLoading || buLoading || mappingsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Trust Center</h1>
          <p className="text-muted-foreground mt-1">Compliance posture overview</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="pt-6"><Skeleton className="h-16" /></CardContent></Card>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="pt-6"><Skeleton className="h-32" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  const totalDocs = (documents || []).length;
  const openFindings = (findings || []).filter(f => f.status !== "Closed" && f.status !== "Verified");
  const highFindings = openFindings.filter(f => f.severity === "High" || f.severity === "Critical");
  const overdueFindings = openFindings.filter(f => f.dueDate && new Date(f.dueDate) < new Date());
  const openCommitments = (commitmentsList || []).filter(c => c.status !== "Completed" && c.status !== "Closed");
  const completedCommitments = (commitmentsList || []).filter(c => c.status === "Completed" || c.status === "Closed");
  const overdueCommitments = openCommitments.filter(c => c.dueDate && new Date(c.dueDate) < new Date());
  const coveredMappings = (mappings || []).filter(m => m.coverageStatus === "Covered");
  const publishedArticles = (articles || []).filter(a => a.status === "Published");

  const docsWithReviewDate = (documents || []).filter(d => d.nextReviewDate);
  const docsReviewCurrent = docsWithReviewDate.filter(d => d.nextReviewDate && new Date(d.nextReviewDate) > new Date());
  const policyHealthPct = totalDocs > 0 ? Math.round((docsReviewCurrent.length / totalDocs) * 100) : 100;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-page-title">Trust Center</h1>
        <p className="text-muted-foreground mt-1">Compliance posture overview across all jurisdictions and entities</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Policy Health" value={`${policyHealthPct}%`} icon={Shield} description={`${docsReviewCurrent.length} of ${totalDocs} review-current`} />
        <StatCard title="Open Findings" value={openFindings.length} icon={AlertTriangle} description={`${highFindings.length} high/critical severity`} />
        <StatCard title="Open Commitments" value={openCommitments.length} icon={Target} description={`${overdueCommitments.length} overdue`} />
        <StatCard title="Knowledge Base" value={publishedArticles.length} icon={BookOpen} description={`${(articles || []).length} total articles`} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Policy Coverage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ComplianceGauge label="Review-Current Policies" current={docsReviewCurrent.length} total={totalDocs} />
            <ComplianceGauge label="Control Mappings Covered" current={coveredMappings.length} total={(mappings || []).length} />
            <ComplianceGauge label="Commitments Completed" current={completedCommitments.length} total={(commitmentsList || []).length} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Risk Indicators</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <span className="text-sm">High/Critical Findings</span>
              </div>
              <Badge variant={highFindings.length > 0 ? "destructive" : "secondary"} data-testid="badge-high-findings">
                {highFindings.length}
              </Badge>
            </div>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-500 dark:text-orange-400" />
                <span className="text-sm">Overdue Findings</span>
              </div>
              <Badge variant={overdueFindings.length > 0 ? "destructive" : "secondary"} data-testid="badge-overdue-findings">
                {overdueFindings.length}
              </Badge>
            </div>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-500 dark:text-orange-400" />
                <span className="text-sm">Overdue Commitments</span>
              </div>
              <Badge variant={overdueCommitments.length > 0 ? "destructive" : "secondary"} data-testid="badge-overdue-commitments">
                {overdueCommitments.length}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Findings by Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {["New", "In Progress", "Remediated", "Closed", "Verified"].map(status => {
              const count = (findings || []).filter(f => f.status === status).length;
              return (
                <div key={status} className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-sm">{status}</span>
                  <Badge variant="secondary" data-testid={`badge-findings-${status.toLowerCase().replace(/\s+/g, "-")}`}>{count}</Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Entities Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(businessUnits || []).length === 0 && <p className="text-sm text-muted-foreground">No business units configured</p>}
            {(businessUnits || []).map(bu => (
              <div key={bu.id} className="flex items-center justify-between gap-2 flex-wrap" data-testid={`row-bu-${bu.id}`}>
                <div>
                  <span className="text-sm font-medium">{bu.name}</span>
                  <span className="text-xs text-muted-foreground ml-2">{bu.jurisdiction}</span>
                </div>
                <Badge variant={bu.status === "Active" ? "secondary" : "outline"} className="text-xs">{bu.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
