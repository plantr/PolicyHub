import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar } from "@/components/Sidebar";

import Dashboard from "@/pages/Dashboard";
import Policies from "@/pages/Policies";
import Requirements from "@/pages/Requirements";
import GapAnalysis from "@/pages/GapAnalysis";
import Findings from "@/pages/Findings";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans antialiased">
      <Sidebar />
      <main className="flex-1 overflow-y-auto h-screen bg-slate-50/50">
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/policies" component={Policies} />
          <Route path="/requirements" component={Requirements} />
          <Route path="/gap-analysis" component={GapAnalysis} />
          <Route path="/findings" component={Findings} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
