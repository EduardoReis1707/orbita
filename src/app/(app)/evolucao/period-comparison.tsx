import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  computeDelta,
  deltaTone,
  formatDelta,
  type Delta,
} from "@/lib/comparison";
import { cn } from "@/lib/utils";

export type ComparisonRow = {
  label: string;
  /** Valor no início da referência (período anterior, ou primeiro registro). */
  from: number | null;
  /** Valor no fim (período atual). */
  to: number | null;
  unit?: string;
  digits?: number;
  withPct?: boolean;
  /** Direção "boa" da métrica, para colorir o número. */
  goodDirection?: "up" | "down" | "any";
  /** Texto quando falta dado para comparar. */
  empty?: string;
};

const toneText: Record<ReturnType<typeof deltaTone>, string> = {
  success: "text-success",
  destructive: "text-destructive",
  muted: "text-foreground",
};

function fmt(value: number, digits = 1): string {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

/**
 * Cartão de comparação período-a-período. Cada linha mostra a variação
 * (com % e cor) e os dois valores brutos, pra responder "estou melhor que
 * antes?" com números exatos.
 */
export function PeriodComparison({
  title,
  caption,
  rows,
}: {
  title: string;
  caption: string;
  rows: ComparisonRow[];
}) {
  if (rows.every((row) => row.from == null && row.to == null)) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <p className="text-xs text-muted-foreground">{caption}</p>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        {rows.map((row) => {
          const ready = row.from != null && row.to != null;
          const d: Delta | null = ready
            ? computeDelta(row.from as number, row.to as number)
            : null;
          const digits = row.digits ?? 1;
          return (
            <div key={row.label} className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">{row.label}</p>
              {d ? (
                <p
                  className={cn(
                    "mt-1 font-heading text-lg font-semibold tabular-nums",
                    toneText[deltaTone(d, row.goodDirection ?? "any")],
                  )}
                >
                  {formatDelta(d, {
                    unit: row.unit,
                    digits,
                    withPct: row.withPct ?? true,
                  })}
                </p>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">
                  {row.empty ?? "Sem dados suficientes para comparar"}
                </p>
              )}
              {ready ? (
                <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                  {fmt(row.from as number, digits)} →{" "}
                  {fmt(row.to as number, digits)}
                  {row.unit ? ` ${row.unit}` : ""}
                </p>
              ) : null}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
