"use client";

import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import { formatNumber } from "@/lib/metrics";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

export type ProgressionPoint = {
  name: string;
  date: string;
  label: string;
  weightKg: number;
};

const chartConfig: ChartConfig = {
  weightKg: { label: "Carga (kg)", color: "var(--chart-1)" },
};

export function ExerciseProgression({
  names,
  points,
}: {
  names: string[];
  points: ProgressionPoint[];
}) {
  const [selected, setSelected] = useState(names[0] ?? "");

  const data = useMemo(
    () => points.filter((point) => point.name === selected),
    [points, selected],
  );

  if (names.length === 0) {
    return (
      <p className="rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
        Registre exercícios com carga em treinos realizados para acompanhar a
        evolução aqui.
      </p>
    );
  }

  const weights = data.map((point) => point.weightKg);
  const max = weights.length ? Math.max(...weights) : null;
  const min = weights.length ? Math.min(...weights) : null;
  const last = weights.at(-1) ?? null;

  return (
    <div className="space-y-4">
      <div className="max-w-xs">
        <Select
          value={selected}
          onValueChange={(value) => setSelected(value ?? "")}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {names.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Mini label="Carga atual" value={last} />
        <Mini label="Melhor carga" value={max} />
        <Mini
          label="Progresso"
          value={min != null && last != null ? last - min : null}
          signed
        />
      </div>

      <Card>
        <CardContent className="pt-4">
          {data.length < 2 ? (
            <div className="flex h-[220px] items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
              Precisa de pelo menos 2 registros deste exercício.
            </div>
          ) : (
            <ChartContainer config={chartConfig} className="h-[240px] w-full">
              <LineChart data={data} margin={{ left: 4, right: 12, top: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={24}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  width={40}
                  domain={["dataMin - 5", "dataMax + 5"]}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  dataKey="weightKg"
                  type="monotone"
                  stroke="var(--color-weightKg)"
                  strokeWidth={2}
                  dot={data.length <= 20}
                />
              </LineChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Mini({
  label,
  value,
  signed = false,
}: {
  label: string;
  value: number | null;
  signed?: boolean;
}) {
  return (
    <Card className="gap-0 py-3">
      <CardContent className="px-3">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 font-heading text-lg font-semibold tabular-nums">
          {value == null
            ? "—"
            : `${signed && value > 0 ? "+" : signed && value < 0 ? "−" : ""}${formatNumber(Math.abs(value))} kg`}
        </p>
      </CardContent>
    </Card>
  );
}
