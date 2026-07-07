import { useMemo, useState, type ReactNode } from "react";
import { useNotifications } from "@/hooks/useNotifications";
import { NotificationListItem } from "@/components/notifications/NotificationListItem";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type Filter = "all" | "unread";

export function NotificationsPanel() {
  const { items, unreadCount, isLoading, isError, refetch, markOne, markAll } = useNotifications();
  const [filter, setFilter] = useState<Filter>("all");

  const visible = useMemo(() => {
    if (filter === "unread") return items.filter((n) => !n.readAt);
    return items;
  }, [filter, items]);

  return (
    <div className="rounded-xl border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border bg-muted/40 p-0.5">
            <FilterButton active={filter === "all"} onClick={() => setFilter("all")}>
              All
            </FilterButton>
            <FilterButton active={filter === "unread"} onClick={() => setFilter("unread")}>
              Unread
              {unreadCount > 0 && (
                <span className="ml-1 rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-semibold text-white tabular-nums">
                  {unreadCount}
                </span>
              )}
            </FilterButton>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={unreadCount === 0 || markAll.isPending}
          onClick={() => markAll.mutate()}
        >
          <Check className="mr-1.5 h-4 w-4" />
          Mark all as read
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2 p-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : isError ? (
        <div className="space-y-3 p-8 text-center">
          <p className="text-sm text-muted-foreground">Could not load notifications. Sign in again or retry.</p>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            Retry
          </Button>
        </div>
      ) : visible.length === 0 ? (
        <div className="p-8">
          <EmptyState
            icon={Bell}
            title={filter === "unread" ? "No unread notifications" : "No notifications"}
            description={
              filter === "unread"
                ? "You're all caught up."
                : "Activity from messages, tasks, and workflow updates will appear here."
            }
          />
        </div>
      ) : (
        <ul className="divide-y">
          {visible.map((n) => (
            <NotificationListItem
              key={n.id}
              n={n}
              variant="panel"
              onRead={() => markOne.mutate(n.id)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
