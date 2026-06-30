import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services";
import { subscribeTable } from "@/lib/realtime";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell, Check, CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NotificationItem, NotificationKind } from "@/types";

const KIND_ICON: Record<NotificationKind, typeof Info> = {
  info: Info,
  success: CircleCheck,
  warning: TriangleAlert,
  error: CircleAlert,
};
const KIND_TONE: Record<NotificationKind, string> = {
  info: "text-info",
  success: "text-ok",
  warning: "text-warn",
  error: "text-err",
};

export function NotificationBell() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["notifications"], queryFn: api.listNotifications });
  const items = q.data ?? [];
  const unread = items.filter((n) => !n.readAt).length;

  // Live updates (supabase backend); no-op under mock.
  useEffect(() => {
    return subscribeTable("notifications", () =>
      qc.invalidateQueries({ queryKey: ["notifications"] }),
    );
  }, [qc]);

  const markAll = useMutation({
    mutationFn: api.markAllNotificationsRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
  const markOne = useMutation({
    mutationFn: api.markNotificationRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative shrink-0 rounded-xl"
          aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold leading-none text-white tabular-nums">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2.5">
          <span className="text-sm font-semibold">Notifications</span>
          {unread > 0 && (
            <button
              className="text-xs text-accent hover:underline"
              onClick={() => markAll.mutate()}
            >
              Mark all read
            </button>
          )}
        </div>
        <div className="max-h-80 overflow-auto">
          {items.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">
              You&apos;re all caught up.
            </div>
          ) : (
            <ul>
              {items.slice(0, 12).map((n) => (
                <NotificationRow key={n.id} n={n} onRead={() => markOne.mutate(n.id)} />
              ))}
            </ul>
          )}
        </div>
        <div className="border-t p-1">
          <Button asChild variant="ghost" size="sm" className="w-full justify-center">
            <Link to="/notifications">View all</Link>
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NotificationRow({ n, onRead }: { n: NotificationItem; onRead: () => void }) {
  const Icon = KIND_ICON[n.kind];
  const body = (
    <div className={cn("flex gap-2.5 px-3 py-2.5", !n.readAt && "bg-inset/40")}>
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", KIND_TONE[n.kind])} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium" title={n.title}>
          {n.title}
        </div>
        {n.body && <div className="line-clamp-2 text-xs text-muted-foreground">{n.body}</div>}
        <div className="mt-0.5 text-[11px] text-muted-foreground">
          {new Date(n.createdAt).toLocaleString("en-ZA")}
        </div>
      </div>
      {!n.readAt && (
        <button
          aria-label="Mark read"
          className="self-start text-muted-foreground hover:text-foreground"
          onClick={(e) => {
            e.preventDefault();
            onRead();
          }}
        >
          <Check className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
  return (
    <li className="border-b border-border/40 last:border-0">
      {n.link ? (
        <Link to={n.link} onClick={onRead} className="block hover:bg-inset/60">
          {body}
        </Link>
      ) : (
        body
      )}
    </li>
  );
}
