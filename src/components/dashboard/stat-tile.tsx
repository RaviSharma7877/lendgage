import type { LucideIcon } from "lucide-react";

export function StatTile({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="bg-card rounded-xl border p-5">
      <div className="flex items-start justify-between">
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{label}</p>
        <Icon className="text-muted-foreground size-4" />
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
      {hint && <p className="text-muted-foreground mt-1 text-xs">{hint}</p>}
    </div>
  );
}
