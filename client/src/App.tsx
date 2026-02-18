import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

import Dashboard from "@/pages/Dashboard";
import Documents from "@/pages/Documents";
import DocumentDetail from "@/pages/DocumentDetail";
import VersionDetail from "@/pages/VersionDetail";
import Requirements from "@/pages/Requirements";
import RegulatorySources from "@/pages/RegulatorySources";
import GapAnalysis from "@/pages/GapAnalysis";
import Findings from "@/pages/Findings";
import AuditTrail from "@/pages/AuditTrail";
import BusinessUnits from "@/pages/BusinessUnits";
import Audits from "@/pages/Audits";
import UsersPage from "@/pages/Users";
import TrustCenter from "@/pages/TrustCenter";
import CommitmentsPage from "@/pages/Commitments";
import KnowledgeBasePage from "@/pages/KnowledgeBase";
import RiskOverview from "@/pages/RiskOverview";
import RiskRegister from "@/pages/RiskRegister";
import RiskLibrary from "@/pages/RiskLibrary";
import RiskActions from "@/pages/RiskActions";
import RiskSnapshots from "@/pages/RiskSnapshots";
import RiskSettings from "@/pages/RiskSettings";
import LookupAdmin from "@/pages/Settings";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/documents" component={Documents} />
      <Route path="/documents/:id" component={DocumentDetail} />
      <Route path="/documents/:docId/versions/:verId" component={VersionDetail} />
      <Route path="/requirements" component={Requirements} />
      <Route path="/sources" component={RegulatorySources} />
      <Route path="/gap-analysis" component={GapAnalysis} />
      <Route path="/findings" component={Findings} />
      <Route path="/audit-trail" component={AuditTrail} />
      <Route path="/audits" component={Audits} />
      <Route path="/trust-center" component={TrustCenter} />
      <Route path="/commitments" component={CommitmentsPage} />
      <Route path="/knowledge-base" component={KnowledgeBasePage} />
      <Route path="/risk-management" component={RiskOverview} />
      <Route path="/risk-management/register" component={RiskRegister} />
      <Route path="/risk-management/library" component={RiskLibrary} />
      <Route path="/risk-management/actions" component={RiskActions} />
      <Route path="/risk-management/snapshots" component={RiskSnapshots} />
      <Route path="/risk-management/settings" component={RiskSettings} />
      <Route path="/business-units" component={BusinessUnits} />
      <Route path="/users" component={UsersPage} />
      <Route path="/admin/entity-types">{() => <LookupAdmin slug="entity-types" />}</Route>
      <Route path="/admin/roles">{() => <LookupAdmin slug="roles" />}</Route>
      <Route path="/admin/jurisdictions">{() => <LookupAdmin slug="jurisdictions" />}</Route>
      <Route path="/admin/document-categories">{() => <LookupAdmin slug="document-categories" />}</Route>
      <Route path="/admin/finding-severities">{() => <LookupAdmin slug="finding-severities" />}</Route>
      <Route path="/admin/document-statuses">{() => <LookupAdmin slug="document-statuses" />}</Route>
      <Route component={NotFound} />
    </Switch>
  );
}

const sidebarStyle = {
  "--sidebar-width": "16rem",
} as React.CSSProperties;

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
          <SidebarProvider style={sidebarStyle}>
            <div className="flex h-screen w-full">
              <AppSidebar />
              <div className="flex flex-col flex-1">
                <header className="flex items-center justify-between gap-2 border-b p-2">
                  <SidebarTrigger data-testid="button-sidebar-toggle" />
                  <ThemeToggle />
                </header>
                <main className="flex-1 overflow-auto p-6">
                  <Router />
                </main>
              </div>
            </div>
          </SidebarProvider>
          <Toaster />
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
