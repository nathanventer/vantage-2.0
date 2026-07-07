import type { NotificationItem } from "@/types";

/** In-memory per-user notifications for the mock backend. */
const byUser = new Map<string, NotificationItem[]>();

let counter = 100;

export function mockNotificationsFor(userId: string): NotificationItem[] {
  if (!byUser.has(userId)) {
    byUser.set(userId, seedForUser(userId));
  }
  return byUser.get(userId)!;
}

export function pushMockNotification(
  recipientId: string,
  item: Omit<NotificationItem, "id" | "createdAt"> & { id?: string; createdAt?: string },
): NotificationItem | null {
  const list = mockNotificationsFor(recipientId);
  if (item.id && list.some((n) => n.id === item.id)) return null;
  const row: NotificationItem = {
    id: item.id ?? `ntf-${++counter}`,
    title: item.title,
    body: item.body,
    kind: item.kind,
    type: item.type,
    link: item.link,
    readAt: item.readAt,
    createdAt: item.createdAt ?? new Date().toISOString(),
    senderId: item.senderId,
    senderName: item.senderName,
    metadata: item.metadata,
  };
  list.unshift(row);
  return row;
}

const BUYER = "demo-buyer";
const FINANCE = "demo-finance";
const PROVIDER = "demo-provider";
const WAREHOUSE = "demo-warehouse";
const TRANSPORT = "demo-transport";
const CUSTOMS = "demo-customs";
const ADMIN = "demo-admin";
const AUDITOR = "demo-auditor";

function seedForUser(userId: string): NotificationItem[] {
  const now = Date.now();
  const ago = (ms: number) => new Date(now - ms).toISOString();

  const seeds: Record<string, NotificationItem[]> = {
    [BUYER]: [
      {
        id: "ntf-buyer-1",
        type: "status_update",
        title: "Quote received",
        body: "Southern Cross quoted TXN-1002 — R128,800 all-in.",
        kind: "info",
        link: "/transactions",
        senderId: PROVIDER,
        senderName: "Sarah Naidoo",
        createdAt: ago(36e5),
      },
      {
        id: "ntf-buyer-2",
        type: "message",
        title: "Message from Sarah Naidoo",
        body: "Vessel ETA updated for TXN-1001 — please confirm warehouse slot.",
        kind: "info",
        link: "/transactions",
        senderId: PROVIDER,
        senderName: "Sarah Naidoo",
        createdAt: ago(18e5),
      },
      {
        id: "ntf-buyer-3",
        type: "status_update",
        title: "Customs inspection hold",
        body: "SARS hold on TXN-1004 — documentation review required.",
        kind: "warning",
        link: "/transactions",
        senderId: CUSTOMS,
        senderName: "SC Customs Agent",
        readAt: ago(8e6),
        createdAt: ago(9e6),
      },
      {
        id: "ntf-buyer-4",
        type: "approval_request",
        title: "POD approval requested",
        body: "Southern Cross uploaded POD for TXN-1003.",
        kind: "info",
        link: "/transactions",
        senderId: PROVIDER,
        senderName: "Sarah Naidoo",
        createdAt: ago(5e6),
      },
    ],
    [FINANCE]: [
      {
        id: "ntf-finance-1",
        type: "status_update",
        title: "Invoice generated",
        body: "INV-5001 issued for TXN-1001.",
        kind: "success",
        link: "/payments",
        senderId: PROVIDER,
        senderName: "Sarah Naidoo",
        createdAt: ago(42e5),
      },
      {
        id: "ntf-finance-2",
        type: "message",
        title: "Message from Michael Dlamini",
        body: "Please approve payment for TXN-1001 this week.",
        kind: "info",
        link: "/payments",
        senderId: BUYER,
        senderName: "Michael Dlamini",
        createdAt: ago(25e5),
      },
      {
        id: "ntf-finance-3",
        type: "status_update",
        title: "Payment verified",
        body: "INV-5001 (R203,000) settled.",
        kind: "success",
        link: "/payments",
        readAt: ago(4e6),
        createdAt: ago(5e6),
      },
      {
        id: "ntf-finance-4",
        type: "approval_request",
        title: "Settlement approval",
        body: "Finance sign-off required for TXN-1002 freight charges.",
        kind: "info",
        link: "/payments",
        senderId: BUYER,
        senderName: "Michael Dlamini",
        createdAt: ago(12e5),
      },
    ],
    [PROVIDER]: [
      {
        id: "ntf-provider-1",
        type: "task_assigned",
        title: "Task assigned by Michael Dlamini",
        body: "Review customs docs for TXN-1004 before Friday.",
        kind: "info",
        link: "/transactions",
        senderId: BUYER,
        senderName: "Michael Dlamini",
        createdAt: ago(42e5),
      },
      {
        id: "ntf-provider-2",
        type: "message",
        title: "Message from Michael Dlamini",
        body: "Can you confirm container availability for TXN-1002?",
        kind: "info",
        link: "/transactions",
        senderId: BUYER,
        senderName: "Michael Dlamini",
        createdAt: ago(25e5),
      },
      {
        id: "ntf-provider-3",
        type: "status_update",
        title: "Quote accepted",
        body: "Ubuntu accepted your quote on TXN-1001.",
        kind: "success",
        link: "/transactions",
        senderId: BUYER,
        senderName: "Michael Dlamini",
        createdAt: ago(7e6),
      },
      {
        id: "ntf-provider-4",
        type: "status_update",
        title: "Transport scheduled",
        body: "TXN-1002 moved to transport — vehicle CA 123-456.",
        kind: "info",
        link: "/transactions",
        readAt: ago(6e6),
        createdAt: ago(65e5),
      },
    ],
    [WAREHOUSE]: [
      {
        id: "ntf-warehouse-1",
        type: "task_assigned",
        title: "Task assigned by Michael Dlamini",
        body: "Prepare inbound slot for TXN-1002 textiles.",
        kind: "info",
        link: "/warehouse",
        senderId: BUYER,
        senderName: "Michael Dlamini",
        createdAt: ago(38e5),
      },
      {
        id: "ntf-warehouse-2",
        type: "status_update",
        title: "Goods received",
        body: "TXN-1001 cargo checked into JHB DC.",
        kind: "info",
        link: "/warehouse",
        senderId: PROVIDER,
        senderName: "Sarah Naidoo",
        createdAt: ago(22e5),
      },
      {
        id: "ntf-warehouse-3",
        type: "status_update",
        title: "Warehouse capacity alert",
        body: "DC at 82% — plan overflow for peak week.",
        kind: "warning",
        link: "/warehouse",
        readAt: ago(6e5),
        createdAt: ago(8e5),
      },
    ],
    [TRANSPORT]: [
      {
        id: "ntf-transport-1",
        type: "message",
        title: "Message from Michael Dlamini",
        body: "Confirm delivery window for TXN-1003.",
        kind: "info",
        link: "/transport",
        senderId: BUYER,
        senderName: "Michael Dlamini",
        createdAt: ago(33e5),
      },
      {
        id: "ntf-transport-2",
        type: "task_assigned",
        title: "Task assigned by Sarah Naidoo",
        body: "Schedule last-mile for TXN-1002.",
        kind: "info",
        link: "/transport",
        senderId: PROVIDER,
        senderName: "Sarah Naidoo",
        createdAt: ago(19e5),
      },
      {
        id: "ntf-transport-3",
        type: "status_update",
        title: "Trip dispatched",
        body: "CA 123-456 departed Durban port.",
        kind: "info",
        link: "/transport",
        createdAt: ago(7e5),
      },
      {
        id: "ntf-transport-4",
        type: "status_update",
        title: "POD captured",
        body: "Driver uploaded POD for TXN-1003.",
        kind: "success",
        link: "/transport",
        readAt: ago(2e6),
        createdAt: ago(25e5),
      },
    ],
    [CUSTOMS]: [
      {
        id: "ntf-customs-1",
        type: "approval_request",
        title: "Clearance approval needed",
        body: "TXN-1004 SARS hold — upload amended docs.",
        kind: "warning",
        link: "/transactions",
        senderId: BUYER,
        senderName: "Michael Dlamini",
        createdAt: ago(40e5),
      },
      {
        id: "ntf-customs-2",
        type: "message",
        title: "Message from Sarah Naidoo",
        body: "SARS query on TXN-1004 — need HS code confirmation.",
        kind: "info",
        link: "/transactions",
        senderId: PROVIDER,
        senderName: "Sarah Naidoo",
        createdAt: ago(21e5),
      },
      {
        id: "ntf-customs-3",
        type: "status_update",
        title: "Clearance released",
        body: "TXN-1003 customs cleared.",
        kind: "success",
        link: "/transactions",
        readAt: ago(12e5),
        createdAt: ago(15e5),
      },
    ],
    [ADMIN]: [
      {
        id: "ntf-admin-1",
        type: "approval_request",
        title: "Registration pending review",
        body: "New demand company awaiting approval.",
        kind: "warning",
        link: "/admin/registrations",
        createdAt: ago(12e5),
      },
      {
        id: "ntf-admin-2",
        type: "message",
        title: "Message from Michael Dlamini",
        body: "Please expedite TXN-1004 customs clearance.",
        kind: "info",
        link: "/transactions",
        senderId: BUYER,
        senderName: "Michael Dlamini",
        createdAt: ago(4e6),
      },
      {
        id: "ntf-admin-3",
        type: "status_update",
        title: "Demo dataset loaded",
        body: "125 TradeHub shipments are available.",
        kind: "info",
        link: "/transactions",
        readAt: ago(864e5),
        createdAt: ago(9e8),
      },
    ],
    [AUDITOR]: [
      {
        id: "ntf-auditor-1",
        type: "status_update",
        title: "Audit export ready",
        body: "Weekly compliance audit bundle is available.",
        kind: "info",
        link: "/admin/audit",
        senderId: ADMIN,
        senderName: "Platform Admin",
        createdAt: ago(28e5),
      },
      {
        id: "ntf-auditor-2",
        type: "status_update",
        title: "Exception flagged",
        body: "Delay reported on TXN-1004 customs step.",
        kind: "warning",
        link: "/transactions",
        senderId: CUSTOMS,
        senderName: "SC Customs Agent",
        createdAt: ago(16e5),
      },
      {
        id: "ntf-auditor-3",
        type: "status_update",
        title: "Pulse demo active",
        body: "Rate intelligence dashboards are unlocked.",
        kind: "info",
        link: "/pulse",
        readAt: ago(864e5),
        createdAt: ago(9e8),
      },
      {
        id: "ntf-auditor-4",
        type: "message",
        title: "Message from Platform Admin",
        body: "Review Q2 compliance sample for Ubuntu imports.",
        kind: "info",
        link: "/admin/compliance",
        senderId: ADMIN,
        senderName: "Platform Admin",
        createdAt: ago(5e6),
      },
    ],
  };

  return (
    seeds[userId] ?? [
      {
        id: `ntf-${userId}-welcome`,
        type: "status_update",
        title: "Welcome to Vantage",
        body: "Your notification centre will show cross-account activity here.",
        kind: "info",
        createdAt: ago(36e5),
      },
    ]
  );
}
