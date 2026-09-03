import { formatNumber } from "@/lib/metrics";
import type { MacroTotals } from "@/lib/nutrition";
import { cn } from "@/lib/utils";

type Targets = {
  calories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
};

const ROWS: {
  key: keyof MacroTotals;
  targetKey: keyof Targets;
  label: string;
  unit: string;
}[] = [
  { key: "calories", targetKey: "calories", label: "Calorias", unit: "kcal" },
  { key: "proteinG", targetKey: "proteinG", label: "Proteína", unit: "g" },
  { key: "carbsG", targetKey: "carbsG", label: "Carboidrato", unit: "g" },
  { key: "fatG", targetKey: "fatG", label: "Gordura", unit: "g" },
];

export function MacroSummary({
  totals,
  targets,
}: {
  totals: MacroTotals;
  targets: Targets;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {ROWS.map((row) => {
        const consumed = totals[row.key];
        const target = targets[row.targetKey];
        const pct = target && target > 0 ? (consumed / target) * 100 : null;
        const over = pct != null && pct > 105;

        return (
          <div key={row.key} className="rounded-lg border p-3">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                {row.label}
              </span>
              <span className="text-sm tabular-nums">
                <span className="font-semibold">
                  {formatNumber(consumed, 0)}
                </span>
                {target ? (
                  <span className="text-muted-foreground">
                    {" "}
                    / {formatNumber(target, 0)} {row.unit}
                  </span>
                ) : (
                  <span className="text-muted-foreground"> {row.unit}</span>
                )}
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  over ? "bg-warning" : "bg-primary",
                )}
                style={{
                  width: `${pct == null ? 0 : Math.min(100, Math.max(2, pct))}%`,
                }}
              />
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {target == null
                ? "Sem meta definida"
                : over
                  ? `${formatNumber(consumed - target, 0)} ${row.unit} acima da meta`
                  : `Faltam ${formatNumber(Math.max(target - consumed, 0), 0)} ${row.unit}`}
            </p>
          </div>
        );
      })}
    </div>
  );
}
