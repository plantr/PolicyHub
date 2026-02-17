import { useStats } from "@/hooks/use-stats";
import { Header } from "@/components/Header";
import { PolicyStatusChart, CoverageBarChart } from "@/components/DashboardCharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldAlert, FileText, CheckCircle2, AlertTriangle } from "lucide-react";

export default function Dashboard() {
  const { data: stats, isLoading } = useStats();

  // Mock data for charts while backend implementation catches up or for pure visualization
  const statusData = [
    { name: 'Published', value: stats?.totalPolicies ? Math.floor(stats.totalPolicies * 0.6) : 0 },
    { name: 'Draft', value: stats?.totalPolicies ? Math.ceil(stats.totalPolicies * 0.3) : 0 },
    { name: 'Review', value: stats?.totalPolicies ? Math.floor(stats.totalPolicies * 0.1) : 0 },
  ];

  const coverageData = [
    { name: 'AML/CTF', covered: 85, gap: 15 },
    { name: 'Data Privacy', covered: 60, gap: 40 },
    { name: 'Conduct', covered: 92, gap: 8 },
    { name: 'Outsourcing', covered: 45, gap: 55 },
  ];

  if (isLoading) return <DashboardSkeleton />;

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">
      <Header 
        title="Compliance Overview" 
        description="Monitor your regulatory posture and policy coverage in real-time."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard 
          title="Total Policies" 
          value={stats?.totalPolicies ?? 0} 
          icon={FileText} 
          trend="+2 this month"
          color="text-blue-600"
          bg="bg-blue-50"
        />
        <StatsCard 
          title="Regulatory Requirements" 
          value={stats?.totalRequirements ?? 0} 
          icon={ShieldAlert} 
          trend="Updated yesterday"
          color="text-violet-600"
          bg="bg-violet-50"
        />
        <StatsCard 
          title="Coverage Gaps" 
          value={stats?.gapCount ?? 0} 
          icon={AlertTriangle} 
          trend="Requires attention"
          color="text-amber-600"
          bg="bg-amber-50"
        />
        <StatsCard 
          title="Open Findings" 
          value={stats?.openFindings ?? 0} 
          icon={CheckCircle2} 
          trend="-3 from last week"
          color="text-emerald-600"
          bg="bg-emerald-50"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm border-border/50 hover:shadow-md transition-shadow duration-300">
          <CardHeader>
            <CardTitle>Policy Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <PolicyStatusChart data={statusData} />
            <div className="flex justify-center gap-6 mt-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500" /> Published
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500" /> Draft
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-slate-500" /> Review
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/50 hover:shadow-md transition-shadow duration-300">
          <CardHeader>
            <CardTitle>Regulation Coverage by Domain</CardTitle>
          </CardHeader>
          <CardContent>
            <CoverageBarChart data={coverageData} />
            <div className="flex justify-center gap-6 mt-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500" /> Covered
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500" /> Gap
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatsCard({ title, value, icon: Icon, trend, color, bg }: any) {
  return (
    <Card className="border-border/50 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300">
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
            <h3 className="text-3xl font-bold font-display">{value}</h3>
          </div>
          <div className={`p-3 rounded-xl ${bg} ${color}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-4 font-medium">{trend}</p>
      </CardContent>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="p-8 space-y-8 max-w-[1600px] mx-auto">
      <div className="space-y-2">
        <Skeleton className="h-10 w-[250px]" />
        <Skeleton className="h-4 w-[400px]" />
      </div>
      <div className="grid grid-cols-4 gap-6">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
      </div>
      <div className="grid grid-cols-2 gap-6">
        <Skeleton className="h-[350px] rounded-xl" />
        <Skeleton className="h-[350px] rounded-xl" />
      </div>
    </div>
  );
}
