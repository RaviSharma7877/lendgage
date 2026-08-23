import { CheckCircle2, Clock } from "lucide-react";

import { Badge } from "@/components/ui/badge";

export function StatusBadge({ status }: { status: "SUBMITTED" | "COMPLETED" }) {
  if (status === "COMPLETED") {
    return (
      <Badge variant="success" className="gap-1">
        <CheckCircle2 className="size-3" />
        Completed
      </Badge>
    );
  }
  return (
    <Badge variant="warning" className="gap-1">
      <Clock className="size-3" />
      Submitted
    </Badge>
  );
}
