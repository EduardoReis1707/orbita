"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";

import { MEASUREMENT_FIELDS, type MeasurementKey } from "@/lib/measurements";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

export type WeightPoint = {
  date: string;
  label: string;
  weight: number;
  bmi: number | null;
};

export type MeasurementPoint = {
  date: string;
  label: string;
} & Partial<Record<MeasurementKey, number>>;

const MEASUREMENT_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

const axis = {
  tickLine: false,
  axisLine: false,
  tickMargin: 8,
} as const;

export function EvolutionCharts({
  weightData,
  measurementData,
  activeMeasurementKeys,
  targetWeight,
  hasHeight,
}: {
  weightData: WeightPoint[];
  measurementData: MeasurementPoint[];
  activeMeasurementKeys: MeasurementKey[];
  targetWeight: number | null;
  hasHeight: boolean;
}) {
  const weightConfig: ChartConfig = {
    weight: { label: "Peso (kg)", color: "var(--chart-1)" },
    target: { label: "Meta", color: "var(--muted-foreground)" },
  };

  const bmiConfig: ChartConfig = {
    bmi: { label: "IMC", color: "var(--chart-2)" },
  };

  const measurementConfig = Object.fromEntries(
    activeMeasurementKeys.map((key, index) => {
      const field = MEASUREMENT_FIELDS.find((f) => f.key === key);
      return [
        key,
        {
          label: field?.label ?? key,
          color: MEASUREMENT_COLORS[index % MEASUREMENT_COLORS.length],
        },
      ];
    }),
  ) as ChartConfig;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Peso ao longo do tempo</CardTitle>
          <CardDescription>
            {weightData.length} registro{weightData.length === 1 ? "" : "s"} no
            período
          </CardDescription>
        </CardHeader>
        <CardContent>
          {weightData.length === 0 ? (
            <EmptyChart text="Sem registros de peso neste período." />
          ) : (
            <ChartContainer
              config={weightConfig}
              className="h-[240px] w-full"
            >
              <LineChart
                data={weightData}
                margin={{ left: 4, right: 12, top: 8 }}
              >
                <CartesianGrid vertical={false} />
                <XAxis dataKey="label" {...axis} minTickGap={24} />
                <YAxis
                  {...axis}
                  width={38}
                  domain={["dataMin - 1", "dataMax + 1"]}
                  tickFormatter={(v: number) => `${Math.round(v)}`}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                {targetWeight != null ? (
                  <ReferenceLine
                    y={targetWeight}
                    stroke="var(--color-target)"
                    strokeDasharray="5 5"
                  />
                ) : null}
                <Line
                  dataKey="weight"
                  type="monotone"
                  stroke="var(--color-weight)"
                  strokeWidth={2}
                  dot={weightData.length <= 30}
                />
              </LineChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {hasHeight ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">IMC ao longo do tempo</CardTitle>
            <CardDescription>Calculado a partir do peso e da altura</CardDescription>
          </CardHeader>
          <CardContent>
            {weightData.length === 0 ? (
              <EmptyChart text="Sem dados para calcular o IMC neste período." />
            ) : (
              <ChartContainer config={bmiConfig} className="h-[220px] w-full">
                <LineChart
                  data={weightData}
                  margin={{ left: 4, right: 12, top: 8 }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="label" {...axis} minTickGap={24} />
                  <YAxis
                    {...axis}
                    width={34}
                    domain={["dataMin - 1", "dataMax + 1"]}
                    tickFormatter={(v: number) => v.toFixed(0)}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ReferenceLine
                    y={18.5}
                    stroke="var(--border)"
                    strokeDasharray="3 3"
                  />
                  <ReferenceLine
                    y={25}
                    stroke="var(--border)"
                    strokeDasharray="3 3"
                  />
                  <Line
                    dataKey="bmi"
                    type="monotone"
                    stroke="var(--color-bmi)"
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                </LineChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      ) : null}

      {activeMeasurementKeys.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Medidas (cm)</CardTitle>
            <CardDescription>Circunferências registradas no período</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={measurementConfig}
              className="h-[260px] w-full"
            >
              <LineChart
                data={measurementData}
                margin={{ left: 4, right: 12, top: 8 }}
              >
                <CartesianGrid vertical={false} />
                <XAxis dataKey="label" {...axis} minTickGap={24} />
                <YAxis {...axis} width={38} />
                <ChartTooltip content={<ChartTooltipContent />} />
                {activeMeasurementKeys.map((key) => (
                  <Line
                    key={key}
                    dataKey={key}
                    type="monotone"
                    stroke={`var(--color-${key})`}
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ChartContainer>
            {/* Legenda própria: quebra em várias linhas no mobile em vez de
                estourar o card e cortar os rótulos. */}
            <ul className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
              {activeMeasurementKeys.map((key, index) => {
                const field = MEASUREMENT_FIELDS.find((f) => f.key === key);
                return (
                  <li
                    key={key}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground"
                  >
                    <span
                      className="size-2 shrink-0 rounded-[2px]"
                      style={{
                        backgroundColor:
                          MEASUREMENT_COLORS[index % MEASUREMENT_COLORS.length],
                      }}
                    />
                    {field?.label ?? key}
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function EmptyChart({ text }: { text: string }) {
  return (
    <div className="flex h-[200px] items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
      {text}
    </div>
  );
}
