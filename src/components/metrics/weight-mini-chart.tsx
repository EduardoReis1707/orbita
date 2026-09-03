"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const config: ChartConfig = {
  weight: { label: "Peso (kg)", color: "var(--chart-1)" },
};

export function WeightMiniChart({
  data,
  target,
}: {
  data: { label: string; weight: number }[];
  target?: number | null;
}) {
  if (data.length < 2) {
    return (
      <div className="flex h-[200px] items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
        Registre o peso em mais de um dia para ver a tendência.
      </div>
    );
  }

  return (
    <ChartContainer config={config} className="h-[200px] w-full">
      <LineChart data={data} margin={{ left: 4, right: 12, top: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={28}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={36}
          domain={["dataMin - 1", "dataMax + 1"]}
          tickFormatter={(value: number) => `${Math.round(value)}`}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        {target != null ? (
          <ReferenceLine
            y={target}
            stroke="var(--muted-foreground)"
            strokeDasharray="5 5"
          />
        ) : null}
        <Line
          dataKey="weight"
          type="monotone"
          stroke="var(--color-weight)"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ChartContainer>
  );
}
