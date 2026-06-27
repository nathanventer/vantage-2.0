import type { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Bell, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex h-dvh w-full overflow-hidden bg-background">
        <AppSidebar />
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <header className="sticky top-0 z-30 flex h-14 flex-nowrap items-center gap-3 border-b bg-card px-4 sm:px-6">
            <SidebarTrigger aria-label="Toggle sidebar" className="ml-1" />
            <div className="relative hidden flex-1 max-w-md md:block">
              <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search transactions, containers, vessels…" className="h-9 rounded-full pl-9" aria-label="Search" />
            </div>
            <div className="flex-1 md:hidden" />
            <RoleSwitcher />
            <ThemeToggle />
            <Button variant="ghost" size="icon" aria-label="Notifications">
              <Bell className="h-4 w-4" />
            </Button>
          </header>
          <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-[1280px]">{children}</div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
