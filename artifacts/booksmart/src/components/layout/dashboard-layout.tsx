import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { 
  Home, Lightbulb, PieChart, FileText, Users, ShoppingBag, Coins, MessageSquare, Bot, 
  Settings, User, LogOut, CheckSquare, DollarSign, List, ShieldCheck, Tags, Briefcase,
  Sun, Moon
} from "lucide-react";

interface DashboardLayoutProps {
  children: ReactNode;
  role: "user" | "cpa" | "admin";
}

export function DashboardLayout({ children, role }: DashboardLayoutProps) {
  const [location] = useLocation();
  const { signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  const navConfig = {
    user: {
      main: [
        { title: "Dashboard", url: "/user", icon: Home },
        { title: "AI Strategy", url: "/user/ai-strategy", icon: Lightbulb },
        { title: "Financial Reports", url: "/user/reports", icon: PieChart },
        { title: "Tax Filing", url: "/user/tax", icon: FileText },
        { title: "CPA Network", url: "/user/cpa-network", icon: Users },
        { title: "Orders", url: "/user/orders", icon: ShoppingBag },
        { title: "Tokens", url: "/user/token", icon: Coins },
        { title: "Chat", url: "/user/chat", icon: MessageSquare },
        { title: "AI Chat", url: "/user/ai-chat", icon: Bot },
      ],
      bottom: [
        { title: "Settings", url: "/user/settings", icon: Settings },
        { title: "Profile", url: "/user/profile", icon: User },
      ]
    },
    cpa: {
      main: [
        { title: "Dashboard", url: "/cpa", icon: Home },
        { title: "Leads", url: "/cpa/leads", icon: Users },
        { title: "Orders", url: "/cpa/orders", icon: ShoppingBag },
        { title: "Earnings", url: "/cpa/earnings", icon: DollarSign },
        { title: "Chat", url: "/cpa/chat", icon: MessageSquare },
      ],
      bottom: [
        { title: "Settings", url: "/cpa/settings", icon: Settings },
        { title: "Profile", url: "/cpa/profile", icon: User },
      ]
    },
    admin: {
      main: [
        { title: "Dashboard", url: "/admin", icon: Home },
        { title: "Users", url: "/admin/users", icon: Users },
        { title: "CPAs", url: "/admin/cpas", icon: Briefcase },
        { title: "Categories", url: "/admin/categories", icon: Tags },
        { title: "Tax Deductions", url: "/admin/tax-deductions", icon: ShieldCheck },
        { title: "Chat", url: "/admin/chat", icon: MessageSquare },
      ],
      bottom: [
        { title: "Settings", url: "/admin/settings", icon: Settings },
      ]
    }
  };

  const items = navConfig[role].main;
  const bottomItems = navConfig[role].bottom;

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
        <Sidebar className="border-r border-border bg-card">
          <SidebarContent className="flex flex-col h-full">
            <div className="p-6">
              <img src="/logo.png" alt="BookSmart" className="h-8 mb-6 object-contain" />
            </div>
            <SidebarGroup className="flex-1">
              <SidebarGroupLabel className="text-muted-foreground/70 uppercase tracking-wider text-xs">Menu</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={location === item.url || location.startsWith(item.url + "/")} className="hover:bg-primary/10 hover:text-primary transition-colors data-[active=true]:bg-primary/20 data-[active=true]:text-primary">
                        <Link href={item.url} className="flex items-center gap-3">
                          <item.icon className="h-4 w-4" />
                          <span className="font-medium">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            <div className="mt-auto pb-4">
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {bottomItems.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild isActive={location === item.url}>
                          <Link href={item.url} className="flex items-center gap-3">
                            <item.icon className="h-4 w-4" />
                            <span className="font-medium">{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                    <SidebarMenuItem>
                      <SidebarMenuButton onClick={signOut} className="text-destructive hover:bg-destructive/10 hover:text-destructive transition-colors mt-2">
                        <LogOut className="h-4 w-4" />
                        <span className="font-medium">Sign Out</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </div>
          </SidebarContent>
        </Sidebar>
        <main className="flex-1 flex flex-col overflow-hidden bg-background">
          <header className="h-16 border-b border-border flex items-center px-4 md:px-6 bg-card/50 backdrop-blur sticky top-0 z-10">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            <div className="ml-auto flex items-center gap-3">
              <div className="text-sm font-semibold tracking-wide text-primary">COMMAND CENTER</div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(isDark ? "light" : "dark")}
                className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
                title={isDark ? "Switch to light mode" : "Switch to dark mode"}
              >
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            </div>
          </header>
          <div className="flex-1 overflow-auto p-2 md:p-4">
            <div className="w-full">
              {children}
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}