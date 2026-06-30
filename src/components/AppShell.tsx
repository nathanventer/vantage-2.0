import type { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { UserMenu } from "@/components/UserMenu";
import { NotificationBell } from "@/components/NotificationBell";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-dvh w-full bg-background">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 flex-nowrap items-center gap-3 border-b glass px-4 sm:px-6">
            <SidebarTrigger aria-label="Toggle sidebar" />
            <div className="relative hidden max-w-md flex-1 md:block">
              <Search
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                placeholder="Search transactions, containers, vessels…"
                className="h-9 rounded-full pl-9"
                aria-label="Search"
              />
            </div>
            <div className="ml-auto flex shrink-0 items-center justify-end gap-0.5">
              <NotificationBell />
              <UserMenu />
            </div>
          </header>
          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-[1280px]">{children}</div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
