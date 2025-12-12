import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import StrategyPage from "@/pages/StrategyPage";
import LogsPage from "@/pages/LogsPage";
import RiskPage from "@/pages/RiskPage";
import SettingsPage from "@/pages/SettingsPage";
import ConnectPage from "@/pages/ConnectPage";
import { ThemeToggle } from "@/components/ThemeToggle";

function Router() {
  return (
    <Switch>
      {/* Default route is now the Dashboard */}
      <Route path="/" component={Dashboard} />
      <Route path="/trades" component={Dashboard} />
      <Route path="/strategy" component={StrategyPage} />
      <Route path="/logs" component={LogsPage} />
      <Route path="/risk" component={RiskPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/connect" component={ConnectPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeToggle className="fixed top-4 right-4 z-50" />
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;