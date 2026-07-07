import { Link } from "@tanstack/react-router";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatRelativeTime, initialsFromName } from "@/lib/relativeTime";
import { NOTIFICATION_TYPE_LABELS } from "@/lib/notificationLabels";
import { cn } from "@/lib/utils";
import { Check, CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
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

type NotificationListItemProps = {
  n: NotificationItem;
  onRead: () => void;
  variant?: "dropdown" | "panel";
};

export function NotificationListItem({
  n,
  onRead,
  variant = "panel",
}: NotificationListItemProps) {
  const Icon = KIND_ICON[n.kind];
  const senderLabel = n.senderName ?? "System";
  const compact = variant === "dropdown";

  const content = (
    <div
      className={cn(
        "flex gap-2.5",
        compact ? "px-3 py-2.5" : "p-4",
        !n.readAt && (compact ? "bg-inset/40" : "bg-inset/30"),
      )}
    >
      {n.senderName ? (
        <Avatar className={cn("shrink-0", compact ? "mt-0.5 h-7 w-7" : "mt-0.5 h-8 w-8")}>
          <AvatarFallback
            className={cn(
              "bg-brand-soft font-semibold text-brand",
              compact ? "text-[10px]" : "text-xs",
            )}
          >
            {initialsFromName(senderLabel)}
          </AvatarFallback>
        </Avatar>
      ) : (
        <Icon className={cn("shrink-0", compact ? "mt-1 h-4 w-4" : "mt-0.5 h-4 w-4", KIND_TONE[n.kind])} />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("truncate font-medium", compact ? "text-sm" : "text-sm")} title={n.title}>
            {n.title}
          </span>
          <span className="shrink-0 rounded-md border border-border/60 bg-background/60 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {NOTIFICATION_TYPE_LABELS[n.type]}
          </span>
          {!n.readAt && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />}
        </div>
        {n.senderName && (
          <p className={cn("truncate text-muted-foreground", compact ? "text-[11px]" : "text-xs")}>
            {n.senderName}
          </p>
        )}
        {n.body && (
          <p
            className={cn(
              "text-muted-foreground",
              compact ? "line-clamp-2 text-xs" : "line-clamp-2 text-sm",
            )}
          >
            {n.body}
          </p>
        )}
        <div
          className={cn(
            "mt-0.5 flex items-center gap-3 text-muted-foreground",
            compact ? "text-[11px]" : "text-xs",
          )}
        >
          <span>{formatRelativeTime(n.createdAt)}</span>
          {!compact && n.link && (
            <span className="text-accent">Click to open</span>
          )}
        </div>
      </div>
      {!n.readAt && compact && (
        <button
          type="button"
          aria-label="Mark read"
          className="self-start text-muted-foreground hover:text-foreground"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRead();
          }}
        >
          <Check className="h-3.5 w-3.5" />
        </button>
      )}
      {!n.readAt && !compact && (
        <Button
          variant="ghost"
          size="sm"
          className="shrink-0 self-start"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRead();
          }}
        >
          Mark read
        </Button>
      )}
    </div>
  );

  if (n.link) {
    return (
      <li className={cn("border-b border-border/40 last:border-0", !compact && "list-none")}>
        <Link to={n.link} onClick={onRead} className="block hover:bg-inset/60">
          {content}
        </Link>
      </li>
    );
  }

  return (
    <li className={cn("border-b border-border/40 last:border-0", !compact && "list-none")}>
      {content}
    </li>
  );
}
