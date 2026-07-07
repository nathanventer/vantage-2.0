import { Link } from "@tanstack/react-router";
import { useNotifications } from "@/hooks/useNotifications";
import { NotificationListItem } from "@/components/notifications/NotificationListItem";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell } from "lucide-react";

const DROPDOWN_LIMIT = 5;

export function NotificationBell() {
  const { items, unreadCount, markOne, markAll } = useNotifications({ enableToast: true });
  const recent = items.slice(0, DROPDOWN_LIMIT);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative shrink-0 rounded-xl"
          aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold leading-none text-white tabular-nums">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2.5">
          <span className="text-sm font-semibold">Notifications</span>
          {unreadCount > 0 && (
            <button
              type="button"
              className="text-xs text-accent hover:underline"
              onClick={() => markAll.mutate()}
            >
              Mark all read
            </button>
          )}
        </div>
        <div className="max-h-80 overflow-auto">
          {recent.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">
              You&apos;re all caught up.
            </div>
          ) : (
            <ul>
              {recent.map((n) => (
                <NotificationListItem
                  key={n.id}
                  n={n}
                  variant="dropdown"
                  onRead={() => markOne.mutate(n.id)}
                />
              ))}
            </ul>
          )}
        </div>
        <div className="border-t p-1">
          <Button asChild variant="ghost" size="sm" className="w-full justify-center">
            <Link to="/dashboard" search={{ tab: "notifications" }}>
              View all
            </Link>
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
