import { useEffect, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services";
import { subscribeTable } from "@/lib/realtime";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, Check, CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type {
  NotificationEvent,
  NotificationItem,
  NotificationKind,
  NotificationPreferences,
} from "@/types";

export const Route = createFileRoute("/_app/notifications")({
  head: () => ({ meta: [{ title: "Notifications — Vantage" }] }),
  component: NotificationsPage,
});

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

const EVENT_LABELS: Record<NotificationEvent, string> = {
  registration: "Registration & approvals",
  quote: "Quotes & sourcing",
  payment: "Payments & settlement",
  shipment: "Shipment milestones",
  document: "Documents & signatures",
  exception: "Exceptions & alerts",
};

function NotificationsPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["notifications"], queryFn: api.listNotifications });
  const prefsQ = useQuery({
    queryKey: ["notif-prefs"],
    queryFn: api.getNotificationPreferences,
  });
  const items = q.data ?? [];

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
    <div>
      <PageHeader
        title="Notifications"
        description="Activity across your transactions, payments and compliance."
        actions={
          <Button variant="outline" size="sm" onClick={() => markAll.mutate()}>
            <Check className="mr-1.5 h-4 w-4" /> Mark all read
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="rounded-xl border bg-card">
            {q.isLoading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-14" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={Bell}
                  title="No notifications"
                  description="You're all caught up."
                />
              </div>
            ) : (
              <ul className="divide-y">
                {items.map((n) => (
                  <Row key={n.id} n={n} onRead={() => markOne.mutate(n.id)} />
                ))}
              </ul>
            )}
          </div>
        </div>

        <aside>
          <div className="rounded-xl border bg-card p-5">
            <h3 className="mb-3 font-display font-semibold">Preferences</h3>
            {prefsQ.isLoading || !prefsQ.data ? (
              <Skeleton className="h-64" />
            ) : (
              <PrefsForm prefs={prefsQ.data} />
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function Row({ n, onRead }: { n: NotificationItem; onRead: () => void }) {
  const Icon = KIND_ICON[n.kind];
  return (
    <li className={cn("flex items-start gap-3 p-4", !n.readAt && "bg-inset/30")}>
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", KIND_TONE[n.kind])} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium" title={n.title}>
            {n.title}
          </span>
          {!n.readAt && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />}
        </div>
        {n.body && <p className="text-sm text-muted-foreground">{n.body}</p>}
        <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
          <span>{new Date(n.createdAt).toLocaleString("en-ZA")}</span>
          {n.link && (
            <Link to={n.link} className="text-accent hover:underline" onClick={onRead}>
              Open
            </Link>
          )}
        </div>
      </div>
      {!n.readAt && (
        <Button variant="ghost" size="sm" onClick={onRead}>
          Mark read
        </Button>
      )}
    </li>
  );
}

function PrefsForm({ prefs }: { prefs: NotificationPreferences }) {
  const qc = useQueryClient();
  const [local, setLocal] = useState<NotificationPreferences>(prefs);

  const save = useMutation({
    mutationFn: (p: NotificationPreferences) => api.updateNotificationPreferences(p),
    onSuccess: () => {
      toast.success("Preferences saved");
      qc.invalidateQueries({ queryKey: ["notif-prefs"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to save"),
  });

  const update = (event: NotificationEvent, channel: "inApp" | "email", value: boolean) => {
    setLocal((prev) => ({ ...prev, [event]: { ...prev[event], [channel]: value } }));
  };

  const events = Object.keys(EVENT_LABELS) as NotificationEvent[];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-3 text-[11px] uppercase tracking-wide text-muted-foreground">
        <span>Event</span>
        <span className="w-12 text-center">In-app</span>
        <span className="w-12 text-center">Email</span>
      </div>
      {events.map((e) => (
        <div key={e} className="grid grid-cols-[1fr_auto_auto] items-center gap-x-3">
          <span className="text-sm">{EVENT_LABELS[e]}</span>
          <div className="flex w-12 justify-center">
            <Switch
              checked={local[e].inApp}
              onCheckedChange={(v) => update(e, "inApp", v)}
              aria-label={`${EVENT_LABELS[e]} in-app`}
            />
          </div>
          <div className="flex w-12 justify-center">
            <Switch
              checked={local[e].email}
              onCheckedChange={(v) => update(e, "email", v)}
              aria-label={`${EVENT_LABELS[e]} email`}
            />
          </div>
        </div>
      ))}
      <Button
        size="sm"
        className="w-full"
        disabled={save.isPending}
        onClick={() => save.mutate(local)}
      >
        {save.isPending ? "Saving…" : "Save preferences"}
      </Button>
    </div>
  );
}
