import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";

// Auth
import Login from "@/pages/auth/login";
import SignUp from "@/pages/auth/sign-up";
import ForgotReset from "@/pages/auth/forgot-reset";
import VerifyEmail from "@/pages/auth/verify-email";

// Layouts
import { DashboardLayout } from "@/components/layout/dashboard-layout";

// User Pages
import UserDashboard from "@/pages/user/dashboard";
import AiStrategy from "@/pages/user/ai-strategy";
import CpaNetwork from "@/pages/user/cpa-network";
import Reports from "@/pages/user/reports";
import Tax from "@/pages/user/tax";
import Orders from "@/pages/user/orders";
import Token from "@/pages/user/token";

// CPA Pages
import CpaDashboard from "@/pages/cpa/dashboard";
import CpaLeads from "@/pages/cpa/leads";

// Admin Pages
import AdminDashboard from "@/pages/admin/dashboard";

const queryClient = new QueryClient();

// Generic placeholder generator for missing pages
const Placeholder = ({ title }: { title: string }) => (
  <div className="flex h-[60vh] items-center justify-center border-2 border-dashed border-border rounded-lg">
    <div className="text-center space-y-2">
      <h2 className="text-2xl font-bold">{title}</h2>
      <p className="text-muted-foreground">This section is currently under construction.</p>
    </div>
  </div>
);

function Router() {
  const { session, profile, isLoading } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (isLoading) return;
    if (session && location === "/") {
      if (profile?.role === "cpa") setLocation("/cpa");
      else if (profile?.role === "admin") setLocation("/admin");
      else setLocation("/user");
    } else if (!session && location === "/") {
      setLocation("/login");
    }
  }, [isLoading, session, profile, location, setLocation]);

  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/sign-up" component={SignUp} />
      <Route path="/forgot-reset" component={ForgotReset} />
      <Route path="/verify-email" component={VerifyEmail} />

      <Route path="/user*">
        <DashboardLayout role="user">
          <Switch>
            <Route path="/user" component={UserDashboard} />
            <Route path="/user/ai-strategy" component={AiStrategy} />
            <Route path="/user/cpa-network" component={CpaNetwork} />
            <Route path="/user/reports" component={Reports} />
            <Route path="/user/tax" component={Tax} />
            <Route path="/user/orders" component={Orders} />
            <Route path="/user/token" component={Token} />
            <Route path="/user/chat" component={() => <Placeholder title="Chat" />} />
            <Route path="/user/ai-chat" component={() => <Placeholder title="AI Chat" />} />
            <Route path="/user/settings" component={() => <Placeholder title="Settings" />} />
            <Route path="/user/profile" component={() => <Placeholder title="Profile" />} />
            <Route path="/user/organizations" component={() => <Placeholder title="Organizations" />} />
            <Route path="/user/subscription" component={() => <Placeholder title="Subscription" />} />
            <Route path="/user/bulk-review" component={() => <Placeholder title="Bulk Review" />} />
            <Route path="/user/rules-management" component={() => <Placeholder title="Rules Management" />} />
            <Route component={NotFound} />
          </Switch>
        </DashboardLayout>
      </Route>

      <Route path="/cpa*">
        <DashboardLayout role="cpa">
          <Switch>
            <Route path="/cpa" component={CpaDashboard} />
            <Route path="/cpa/leads" component={CpaLeads} />
            <Route path="/cpa/orders" component={() => <Placeholder title="Active Orders" />} />
            <Route path="/cpa/earnings" component={() => <Placeholder title="Earnings" />} />
            <Route path="/cpa/chat" component={() => <Placeholder title="Chat" />} />
            <Route path="/cpa/settings" component={() => <Placeholder title="Settings" />} />
            <Route path="/cpa/profile" component={() => <Placeholder title="Profile" />} />
            <Route component={NotFound} />
          </Switch>
        </DashboardLayout>
      </Route>

      <Route path="/admin*">
        <DashboardLayout role="admin">
          <Switch>
            <Route path="/admin" component={AdminDashboard} />
            <Route path="/admin/users" component={() => <Placeholder title="User Management" />} />
            <Route path="/admin/cpas" component={() => <Placeholder title="CPA Directory" />} />
            <Route path="/admin/categories" component={() => <Placeholder title="Categories" />} />
            <Route path="/admin/tax-deductions" component={() => <Placeholder title="Tax Deductions" />} />
            <Route path="/admin/settings" component={() => <Placeholder title="Platform Settings" />} />
            <Route path="/admin/chat" component={() => <Placeholder title="Global Chat" />} />
            <Route component={NotFound} />
          </Switch>
        </DashboardLayout>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <AuthProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <Toaster />
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;