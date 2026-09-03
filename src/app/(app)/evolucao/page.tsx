import Link from "next/link";
import { redirect } from "next/navigation";

import { getProfile, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDateShort, toISODate } from "@/lib/date";
import { bmi } from "@/lib/metrics";
import { MEASUREMENT_FIELDS, type MeasurementKey } from "@/lib/measurements";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  EvolutionCharts,
  type MeasurementPoint,
  type WeightPoint,
} from "./evolution-charts";
import { PeriodSelector } from "./period-selector";
import { periodStartDate, resolvePeriod } from "./period";

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

  const [weightEntries, measurementEntries, totalWeight] = await Promise.all([
    prisma.weightEntry.findMany({
      where: { profileId: user.id, ...dateFilter },
      orderBy: { date: "asc" },
    }),
    prisma.measurementEntry.findMany({
      where: { profileId: user.id, ...dateFilter },
      orderBy: { date: "asc" },
    }),
    prisma.weightEntry.count({ where: { profileId: user.id } }),
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
        <EvolutionCharts
          weightData={weightData}
          measurementData={measurementData}
          activeMeasurementKeys={activeMeasurementKeys}
          targetWeight={profile.targetWeightKg ?? null}
          hasHeight={Boolean(height)}
        />
      )}

      <p className="text-xs text-muted-foreground">
        O IMC exibido é uma estimativa e não substitui a avaliação de um
        profissional de saúde.
      </p>
    </div>
  );
}
