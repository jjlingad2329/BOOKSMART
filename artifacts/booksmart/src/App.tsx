import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { AuthGuard } from "@/components/auth-guard";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import NotFound from "@/pages/not-found";

// Auth
import Login from "@/pages/auth/login";
import SignUp from "@/pages/auth/sign-up";
import ForgotReset from "@/pages/auth/forgot-reset";
import VerifyEmail from "@/pages/auth/verify-email";

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

// Wrap a page in AuthGuard + DashboardLayout
function UserPage({ component: Page }: { component: React.ComponentType }) {
  return (
    <AuthGuard requiredRole="user">
      <DashboardLayout role="user">
        <Page />
      </DashboardLayout>
    </AuthGuard>
  );
}

function CpaPage({ component: Page }: { component: React.ComponentType }) {
  return (
    <AuthGuard requiredRole="cpa">
      <DashboardLayout role="cpa">
        <Page />
      </DashboardLayout>
    </AuthGuard>
  );
}

function AdminPage({ component: Page }: { component: React.ComponentType }) {
  return (
    <AuthGuard requiredRole="admin">
      <DashboardLayout role="admin">
        <Page />
      </DashboardLayout>
    </AuthGuard>
  );
}

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
      {/* Auth */}
      <Route path="/login" component={Login} />
      <Route path="/sign-up" component={SignUp} />
      <Route path="/forgot-reset" component={ForgotReset} />
      <Route path="/verify-email" component={VerifyEmail} />

      {/* User */}
      <Route path="/user">{() => <UserPage component={UserDashboard} />}</Route>
      <Route path="/user/ai-strategy">{() => <UserPage component={AiStrategy} />}</Route>
      <Route path="/user/ai-chat">{() => <UserPage component={AiChat} />}</Route>
      <Route path="/user/chat">{() => <UserPage component={Chat} />}</Route>
      <Route path="/user/cpa-network">{() => <UserPage component={CpaNetwork} />}</Route>
      <Route path="/user/reports">{() => <UserPage component={Reports} />}</Route>
      <Route path="/user/tax">{() => <UserPage component={Tax} />}</Route>
      <Route path="/user/orders">{() => <UserPage component={Orders} />}</Route>
      <Route path="/user/token">{() => <UserPage component={Token} />}</Route>
      <Route path="/user/settings">{() => <UserPage component={Settings} />}</Route>
      <Route path="/user/profile">{() => <UserPage component={Profile} />}</Route>
      <Route path="/user/organizations">{() => <UserPage component={Organizations} />}</Route>
      <Route path="/user/subscription">{() => <UserPage component={Subscription} />}</Route>
      <Route path="/user/bulk-review">{() => <UserPage component={BulkReview} />}</Route>
      <Route path="/user/rules-management">{() => <UserPage component={RulesManagement} />}</Route>

      {/* CPA */}
      <Route path="/cpa">{() => <CpaPage component={CpaDashboard} />}</Route>
      <Route path="/cpa/leads">{() => <CpaPage component={CpaLeads} />}</Route>
      <Route path="/cpa/orders">{() => <CpaPage component={CpaOrders} />}</Route>
      <Route path="/cpa/earnings">{() => <CpaPage component={CpaEarnings} />}</Route>
      <Route path="/cpa/chat">{() => <CpaPage component={CpaChat} />}</Route>
      <Route path="/cpa/settings">{() => <CpaPage component={CpaSettings} />}</Route>
      <Route path="/cpa/profile">{() => <CpaPage component={CpaProfile} />}</Route>

      {/* Admin */}
      <Route path="/admin">{() => <AdminPage component={AdminDashboard} />}</Route>
      <Route path="/admin/users">{() => <AdminPage component={AdminUsers} />}</Route>
      <Route path="/admin/cpas">{() => <AdminPage component={AdminCpas} />}</Route>
      <Route path="/admin/categories">{() => <AdminPage component={AdminCategories} />}</Route>
      <Route path="/admin/tax-deductions">{() => <AdminPage component={AdminTaxDeductions} />}</Route>
      <Route path="/admin/settings">{() => <AdminPage component={AdminSettings} />}</Route>
      <Route path="/admin/chat">{() => <AdminPage component={AdminChat} />}</Route>

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
