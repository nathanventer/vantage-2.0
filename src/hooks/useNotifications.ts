import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services";
import { subscribeTable } from "@/lib/realtime";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthReady } from "@/hooks/useAuthReady";
import { toast } from "sonner";

export const NOTIFICATIONS_QUERY_KEY = ["notifications"] as const;

type UseNotificationsOptions = {
  /** Show a toast when a new unread notification arrives (header bell). */
  enableToast?: boolean;
};

export function useNotifications(options: UseNotificationsOptions = {}) {
  const { enableToast = false } = options;
  const qc = useQueryClient();
  const { user } = useAuth();
  const authReady = useAuthReady();
  const seenIds = useRef<Set<string>>(new Set());
  const bootstrapped = useRef(false);

  const q = useQuery({
    queryKey: [...NOTIFICATIONS_QUERY_KEY, user?.id ?? "anon"],
    queryFn: api.listNotifications,
    enabled: authReady && !!user?.id,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const items = q.data ?? [];
  const unreadCount = items.filter((n) => !n.readAt).length;

  useEffect(() => {
    if (!user?.id) return;
    return subscribeTable(
      "notifications",
      () => qc.invalidateQueries({ queryKey: [...NOTIFICATIONS_QUERY_KEY] }),
      `user_id=eq.${user.id}`,
    );
  }, [qc, user?.id]);

  useEffect(() => {
    if (!enableToast || !q.data) return;
    const currentIds = new Set(q.data.map((n) => n.id));
    if (!bootstrapped.current) {
      currentIds.forEach((id) => seenIds.current.add(id));
      bootstrapped.current = true;
      return;
    }
    for (const n of q.data) {
      if (!seenIds.current.has(n.id) && !n.readAt) {
        seenIds.current.add(n.id);
        toast(n.title, {
          description: n.body,
          action: n.link
            ? {
                label: "Open",
                onClick: () => {
                  void api.markNotificationRead(n.id).then(() =>
                    qc.invalidateQueries({ queryKey: [...NOTIFICATIONS_QUERY_KEY] }),
                  );
                  window.location.href = n.link!;
                },
              }
            : undefined,
        });
      }
    }
    currentIds.forEach((id) => seenIds.current.add(id));
  }, [enableToast, q.data, qc]);

  const markOne = useMutation({
    mutationFn: api.markNotificationRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: [...NOTIFICATIONS_QUERY_KEY] }),
  });

  const markAll = useMutation({
    mutationFn: api.markAllNotificationsRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: [...NOTIFICATIONS_QUERY_KEY] }),
  });

  return {
    items,
    unreadCount,
    isLoading: q.isLoading,
    isError: q.isError,
    refetch: q.refetch,
    markOne,
    markAll,
  };
}
