import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

type StatCardProps = {
  label: string;
  value: ReactNode;
  unit?: string;
  hint?: ReactNode;
  /** Rótulo curto de status (ex.: faixa do IMC, tendência). */
  badge?: ReactNode;
  badgeTone?: "success" | "warning" | "destructive" | "muted";
  className?: string;
};

const toneClasses: Record<NonNullable<StatCardProps["badgeTone"]>, string> = {
  success: "bg-success/10 text-success",
  warning: "bg-warning/15 text-warning-foreground",
  destructive: "bg-destructive/10 text-destructive",
  muted: "bg-muted text-muted-foreground",
};

export function StatCard({
  label,
  value,
  unit,
  hint,
  badge,
  badgeTone = "muted",
  className,
}: StatCardProps) {
  return (
    <Card className={cn("gap-0 py-4", className)}>
      <CardContent className="px-4">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <div className="mt-1 flex items-baseline gap-1">
          <span className="font-heading text-2xl font-semibold tabular-nums">
            {value}
          </span>
          {unit ? (
            <span className="text-sm text-muted-foreground">{unit}</span>
          ) : null}
        </div>
        {badge ? (
          <span
            className={cn(
              "mt-2 inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
              toneClasses[badgeTone],
            )}
          >
            {badge}
          </span>
        ) : null}
        {hint ? (
          <p className="mt-2 text-xs text-muted-foreground">{hint}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
