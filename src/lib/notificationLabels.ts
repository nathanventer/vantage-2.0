import type { NotificationType } from "@/types";

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  task_assigned: "Task",
  message: "Message",
  status_update: "Status",
  approval_request: "Approval",
};
