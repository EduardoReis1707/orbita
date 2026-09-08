import Link from "next/link";
import { redirect } from "next/navigation";

import { getProfile, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDateShort, toISODate } from "@/lib/date";
import { bmi } from "@/lib/metrics";
import { totalVolume } from "@/lib/workouts";
import { MEASUREMENT_FIELDS, type MeasurementKey } from "@/lib/measurements";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  EvolutionCharts,
  type MeasurementPoint,
  type WeightPoint,
} from "./evolution-charts";
import { PeriodComparison, type ComparisonRow } from "./period-comparison";
import { PeriodSelector } from "./period-selector";
import {
  periodDays,
  periodLabel,
  periodStartDate,
  resolvePeriod,
} from "./period";

export const metadata = { title: "Evolução" };

export default async function EvolucaoPage({
  searchParams,
}: {
  searchParams: Promise<{ p?: string }>;
}) {
  const user = await requireUser();
  const profile = await getProfile();
  if (!profile) redirect("/onboarding");

  const period = resolvePeriod((await searchParams).p);
  const start = periodStartDate(period);
  const dateFilter = start ? { date: { gte: start } } : {};

  // Janela anterior de mesmo tamanho, para comparar "período vs período".
  const days = periodDays(period);
  const prevStart =
    start && days != null
      ? new Date(start.getTime() - days * 24 * 60 * 60 * 1000)
      : null;

  const [
    weightEntries,
    measurementEntries,
    totalWeight,
    weightPrev,
    comparisonWorkouts,
  ] = await Promise.all([
    prisma.weightEntry.findMany({
      where: { profileId: user.id, ...dateFilter },
      orderBy: { date: "asc" },
    }),
    prisma.measurementEntry.findMany({
      where: { profileId: user.id, ...dateFilter },
      orderBy: { date: "asc" },
    }),
    prisma.weightEntry.count({ where: { profileId: user.id } }),
    prevStart && start
      ? prisma.weightEntry.findMany({
          where: { profileId: user.id, date: { gte: prevStart, lt: start } },
          orderBy: { date: "asc" },
        })
      : Promise.resolve([]),
    prevStart
      ? prisma.workout.findMany({
          where: {
            profileId: user.id,
            status: "COMPLETED",
            date: { gte: prevStart },
          },
          include: {
            exercises: { select: { sets: true, reps: true, weightKg: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  const height = profile.heightCm ?? null;

  const weightData: WeightPoint[] = weightEntries.map((entry) => ({
    date: toISODate(entry.date),
    label: formatDateShort(entry.date),
    weight: entry.weightKg,
    bmi: height ? Math.round(bmi(entry.weightKg, height) * 10) / 10 : null,
  }));

  const activeMeasurementKeys = MEASUREMENT_FIELDS.map((f) => f.key).filter(
    (key) => measurementEntries.some((entry) => entry[key] != null),
  ) as MeasurementKey[];

  const measurementData: MeasurementPoint[] = measurementEntries.map((entry) => {
    const point: MeasurementPoint = {
      date: toISODate(entry.date),
      label: formatDateShort(entry.date),
    };
    for (const key of activeMeasurementKeys) {
      const value = entry[key];
      if (value != null) point[key] = value;
    }
    return point;
  });

  const hasAnyData = totalWeight > 0 || measurementEntries.length > 0;

  // --- Comparação período-a-período ---------------------------------------
  const lastWeightKg =
    weightEntries.length > 0
      ? weightEntries[weightEntries.length - 1].weightKg
      : null;
  const weightGood: "up" | "down" | "any" =
    profile.targetWeightKg != null && lastWeightKg != null
      ? profile.targetWeightKg < lastWeightKg
        ? "down"
        : profile.targetWeightKg > lastWeightKg
          ? "up"
          : "any"
      : "any";

  const weightFrom =
    weightPrev.length > 0
      ? weightPrev[weightPrev.length - 1].weightKg
      : weightEntries.length >= 2
        ? weightEntries[0].weightKg
        : null;
  const weightTo = lastWeightKg;
  const bmiFrom = height && weightFrom != null ? bmi(weightFrom, height) : null;
  const bmiTo = height && weightTo != null ? bmi(weightTo, height) : null;

  let volumeFrom: number | null = null;
  let volumeTo: number | null = null;
  let countFrom: number | null = null;
  let countTo: number | null = null;
  if (prevStart && start) {
    const current = comparisonWorkouts.filter((w) => w.date >= start);
    const previous = comparisonWorkouts.filter(
      (w) => w.date >= prevStart && w.date < start,
    );
    volumeTo = current.reduce((s, w) => s + totalVolume(w.exercises), 0);
    volumeFrom = previous.reduce((s, w) => s + totalVolume(w.exercises), 0);
    if (volumeFrom === 0 && volumeTo === 0) {
      volumeFrom = null;
      volumeTo = null;
    }
    countTo = current.length;
    countFrom = previous.length;
  }

  const comparisonRows: ComparisonRow[] = [
    {
      label: "Peso",
      from: weightFrom,
      to: weightTo,
      unit: "kg",
      digits: 1,
      goodDirection: weightGood,
      empty: "Precisa de 2 registros de peso no período",
    },
    ...(height
      ? [
          {
            label: "IMC",
            from: bmiFrom,
            to: bmiTo,
            digits: 1,
            withPct: false,
            goodDirection: weightGood,
          } satisfies ComparisonRow,
        ]
      : []),
    ...(prevStart
      ? [
          {
            label: "Volume de treino",
            from: volumeFrom,
            to: volumeTo,
            unit: "kg",
            digits: 0,
            goodDirection: "up",
            empty: "Sem treinos com carga registrada",
          } satisfies ComparisonRow,
          {
            label: "Treinos realizados",
            from: countFrom,
            to: countTo,
            digits: 0,
            goodDirection: "up",
          } satisfies ComparisonRow,
        ]
      : []),
  ];

  const comparisonCaption = prevStart
    ? `Período atual vs. os ${periodLabel(period).toLowerCase()} anteriores`
    : "Do primeiro registro até agora";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Acompanhe a tendência do seu peso, IMC e medidas ao longo do tempo.
        </p>
        <PeriodSelector current={period} />
      </div>

      {!hasAnyData ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <p className="text-sm text-muted-foreground">
              Você ainda não tem registros. Comece pelo seu peso e as suas
              medidas.
            </p>
            <Link href="/medidas" className={buttonVariants({ size: "sm" })}>
              Registrar agora
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <PeriodComparison
            title="Comparação"
            caption={comparisonCaption}
            rows={comparisonRows}
          />
          <EvolutionCharts
            weightData={weightData}
            measurementData={measurementData}
            activeMeasurementKeys={activeMeasurementKeys}
            targetWeight={profile.targetWeightKg ?? null}
            hasHeight={Boolean(height)}
          />
        </>
      )}

      <p className="text-xs text-muted-foreground">
        O IMC exibido é uma estimativa e não substitui a avaliação de um
        profissional de saúde.
      </p>
    </div>
  );
}
