import type { LucideIcon } from "lucide-react";

export function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  variant = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
  variant?: "default" | "alert" | "success";
}) {
  const variantClass =
    variant === "alert"
      ? "kpi-card kpi-card-alert"
      : variant === "success"
        ? "kpi-card kpi-card-success"
        : "kpi-card";

  return (
    <div className={variantClass}>
      <div className="flex items-start justify-between gap-3">
        <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
          {label}
        </div>
        {Icon ? (
          <div className="kpi-icon">
            <Icon className="h-4 w-4" />
          </div>
        ) : null}
      </div>
      <div className="mt-2 font-display text-2xl font-bold tracking-tight">{value}</div>
      {hint ? <div className="mt-1 text-xs text-[var(--text-muted)]">{hint}</div> : null}
    </div>
  );
}
