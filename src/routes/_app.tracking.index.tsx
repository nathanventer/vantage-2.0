import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_app/tracking/")({
  head: () => ({ meta: [{ title: "Tracking — Vantage" }] }),
  component: TrackingIndex,
});

/** /tracking → open the most interesting trip (first in-transit, else first). */
function TrackingIndex() {
  const navigate = useNavigate();
  const { data } = useQuery({ queryKey: ["tp"], queryFn: api.listTrips });

  useEffect(() => {
    if (!data) return;
    const target = data.find((t) => t.status === "In Transit") ?? data[0];
    if (target) {
      navigate({ to: "/tracking/$tripId", params: { tripId: target.id }, replace: true });
    }
  }, [data, navigate]);

  return <Skeleton className="h-[80vh]" />;
}
