import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Blocks, Users, MapPin, FolderOpen, Gauge } from "lucide-react";

import Dashboard from "@/pages/Dashboard";
import Documents from "@/pages/Documents";
import DocumentDetail from "@/pages/DocumentDetail";
import Requirements from "@/pages/Requirements";
import RegulatorySources from "@/pages/RegulatorySources";
import GapAnalysis from "@/pages/GapAnalysis";
import Findings from "@/pages/Findings";
import AuditTrail from "@/pages/AuditTrail";
import BusinessUnits from "@/pages/BusinessUnits";
import Audits from "@/pages/Audits";
import LookupAdmin from "@/pages/Settings";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/documents" component={Documents} />
      <Route path="/documents/:id" component={DocumentDetail} />
      <Route path="/requirements" component={Requirements} />
      <Route path="/sources" component={RegulatorySources} />
      <Route path="/gap-analysis" component={GapAnalysis} />
      <Route path="/findings" component={Findings} />
      <Route path="/audit-trail" component={AuditTrail} />
      <Route path="/audits" component={Audits} />
      <Route path="/business-units" component={BusinessUnits} />
      <Route path="/admin/entity-types">{() => <LookupAdmin slug="entity-types" icon={Blocks} />}</Route>
      <Route path="/admin/roles">{() => <LookupAdmin slug="roles" icon={Users} />}</Route>
      <Route path="/admin/jurisdictions">{() => <LookupAdmin slug="jurisdictions" icon={MapPin} />}</Route>
      <Route path="/admin/document-categories">{() => <LookupAdmin slug="document-categories" icon={FolderOpen} />}</Route>
      <Route path="/admin/finding-severities">{() => <LookupAdmin slug="finding-severities" icon={Gauge} />}</Route>
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
