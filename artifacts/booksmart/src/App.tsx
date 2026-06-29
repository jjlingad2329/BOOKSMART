import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";
import { AuthGuard } from "@/components/auth-guard";

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
import AiChat from "@/pages/user/ai-chat";
import Chat from "@/pages/user/chat";
import CpaNetwork from "@/pages/user/cpa-network";
import Reports from "@/pages/user/reports";
import Tax from "@/pages/user/tax";
import Orders from "@/pages/user/orders";
import Token from "@/pages/user/token";
import Settings from "@/pages/user/settings";
import Profile from "@/pages/user/profile";
import Organizations from "@/pages/user/organizations";
import Subscription from "@/pages/user/subscription";
import BulkReview from "@/pages/user/bulk-review";
import RulesManagement from "@/pages/user/rules-management";

// CPA Pages
import CpaDashboard from "@/pages/cpa/dashboard";
import CpaLeads from "@/pages/cpa/leads";
import CpaOrders from "@/pages/cpa/orders";
import CpaEarnings from "@/pages/cpa/earnings";
import CpaChat from "@/pages/cpa/chat";
import CpaSettings from "@/pages/cpa/settings";
import CpaProfile from "@/pages/cpa/profile";

// Admin Pages
import AdminDashboard from "@/pages/admin/dashboard";
import AdminUsers from "@/pages/admin/users";
import AdminCpas from "@/pages/admin/cpas";
import AdminCategories from "@/pages/admin/categories";
import AdminTaxDeductions from "@/pages/admin/tax-deductions";
import AdminSettings from "@/pages/admin/settings";
import AdminChat from "@/pages/admin/chat";

const queryClient = new QueryClient();

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
        <AuthGuard requiredRole="user">
          <DashboardLayout role="user">
            <Switch>
              <Route path="/user" component={UserDashboard} />
              <Route path="/user/ai-strategy" component={AiStrategy} />
              <Route path="/user/ai-chat" component={AiChat} />
              <Route path="/user/chat" component={Chat} />
              <Route path="/user/cpa-network" component={CpaNetwork} />
              <Route path="/user/reports" component={Reports} />
              <Route path="/user/tax" component={Tax} />
              <Route path="/user/orders" component={Orders} />
              <Route path="/user/token" component={Token} />
              <Route path="/user/settings" component={Settings} />
              <Route path="/user/profile" component={Profile} />
              <Route path="/user/organizations" component={Organizations} />
              <Route path="/user/subscription" component={Subscription} />
              <Route path="/user/bulk-review" component={BulkReview} />
              <Route path="/user/rules-management" component={RulesManagement} />
              <Route component={NotFound} />
            </Switch>
          </DashboardLayout>
        </AuthGuard>
      </Route>

      <Route path="/cpa*">
        <AuthGuard requiredRole="cpa">
          <DashboardLayout role="cpa">
            <Switch>
              <Route path="/cpa" component={CpaDashboard} />
              <Route path="/cpa/leads" component={CpaLeads} />
              <Route path="/cpa/orders" component={CpaOrders} />
              <Route path="/cpa/earnings" component={CpaEarnings} />
              <Route path="/cpa/chat" component={CpaChat} />
              <Route path="/cpa/settings" component={CpaSettings} />
              <Route path="/cpa/profile" component={CpaProfile} />
              <Route component={NotFound} />
            </Switch>
          </DashboardLayout>
        </AuthGuard>
      </Route>

      <Route path="/admin*">
        <AuthGuard requiredRole="admin">
          <DashboardLayout role="admin">
            <Switch>
              <Route path="/admin" component={AdminDashboard} />
              <Route path="/admin/users" component={AdminUsers} />
              <Route path="/admin/cpas" component={AdminCpas} />
              <Route path="/admin/categories" component={AdminCategories} />
              <Route path="/admin/tax-deductions" component={AdminTaxDeductions} />
              <Route path="/admin/settings" component={AdminSettings} />
              <Route path="/admin/chat" component={AdminChat} />
              <Route component={NotFound} />
            </Switch>
          </DashboardLayout>
        </AuthGuard>
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
