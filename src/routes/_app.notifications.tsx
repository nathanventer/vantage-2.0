import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/notifications")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard", search: { tab: "notifications" } });
  },
});
