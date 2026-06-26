import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, FileBox, Inbox, Warehouse, Container, Boxes,
  Truck, FileText, CreditCard, BarChart3, ShieldCheck, ScrollText, UserCheck,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";
import { useRole } from "@/contexts/RoleContext";
import logoAsset from "@/assets/vantage-logo.png.asset.json";

type Item = { title: string; url: string; icon: typeof LayoutDashboard };

const COMMON: Item[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Transactions", url: "/transactions", icon: FileBox },
  { title: "Documents", url: "/documents", icon: FileText },
  { title: "Payments", url: "/payments", icon: CreditCard },
  { title: "Reports", url: "/reports", icon: BarChart3 },
];

const SOURCE: Item[] = [
  { title: "Incoming Requests", url: "/requests", icon: Inbox },
  { title: "Warehouse", url: "/warehouse", icon: Warehouse },
  { title: "Containers", url: "/containers", icon: Container },
  { title: "Cargo Handling", url: "/cargo", icon: Boxes },
  { title: "Transport", url: "/transport", icon: Truck },
];

const ADMIN: Item[] = [
  { title: "Registrations", url: "/admin/registrations", icon: UserCheck },
  { title: "Compliance", url: "/admin/compliance", icon: ShieldCheck },
  { title: "Audit Log", url: "/admin/audit", icon: ScrollText },
];

export function AppSidebar() {
  const { role } = useRole();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (url: string) => pathname === url || pathname.startsWith(url + "/");

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <Link to="/dashboard" className="flex items-center gap-2 px-2 py-2">
          <img src={logoAsset.url} alt="Vantage" className="h-8 w-8 shrink-0 rounded bg-white object-contain p-0.5" />
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="font-display text-base font-bold text-sidebar-foreground">VANTAGE</span>
              <span className="text-[10px] uppercase tracking-wider text-sidebar-foreground/60">Trade & Logistics</span>
            </div>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {COMMON.map((i) => (
                <SidebarMenuItem key={i.url}>
                  <SidebarMenuButton asChild isActive={isActive(i.url)}>
                    <Link to={i.url}>
                      <i.icon className="h-4 w-4" />
                      <span>{i.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {role === "source" && (
          <SidebarGroup>
            <SidebarGroupLabel>Operations</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {SOURCE.map((i) => (
                  <SidebarMenuItem key={i.url}>
                    <SidebarMenuButton asChild isActive={isActive(i.url)}>
                      <Link to={i.url}>
                        <i.icon className="h-4 w-4" />
                        <span>{i.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {role === "admin" && (
          <SidebarGroup>
            <SidebarGroupLabel>Governance</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {ADMIN.map((i) => (
                  <SidebarMenuItem key={i.url}>
                    <SidebarMenuButton asChild isActive={isActive(i.url)}>
                      <Link to={i.url}>
                        <i.icon className="h-4 w-4" />
                        <span>{i.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
