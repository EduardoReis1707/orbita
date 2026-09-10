import type { GoalMetric } from "@prisma/client";

import { parseISODate, todayISO } from "@/lib/date";

import { prisma } from "@/lib/prisma";
import { MEASUREMENT_KEYS, type MeasurementKey } from "@/lib/measurements";

/**
 * Busca os agregados necessários e devolve uma função que resolve o valor
 * atual de uma meta automática a partir dos registros do perfil.
 */
export async function buildGoalLiveValueResolver(profileId: string) {
  const today = parseISODate(todayISO())!;
  // 28 dias civis incluindo hoje; nao inclui o 29o dia.
  const fourWeeksAgo = new Date(today);
  fourWeeksAgo.setUTCDate(today.getUTCDate() - 27);

  const [latestWeight, measurements, exerciseMax, completedCount] =
    await Promise.all([
      prisma.weightEntry.findFirst({
        where: { profileId, date: { lte: today } },
        orderBy: { date: "desc" },
      }),
      prisma.measurementEntry.findMany({
        where: { profileId, date: { lte: today } },
        orderBy: { date: "desc" },
      }),
      prisma.exercise.groupBy({
        by: ["name"],
        where: {
          workout: { profileId, status: "COMPLETED", date: { lte: today } },
          weightKg: { not: null },
        },
        _max: { weightKg: true },
      }),
      prisma.workout.count({
        where: {
          profileId,
          status: "COMPLETED",
          date: { gte: fourWeeksAgo, lte: today },
        },
      }),
    ]);

  const latestByMeasurement: Partial<Record<MeasurementKey, number>> = {};
  let latestBodyFat: number | null = null;
  for (const entry of measurements) {
    for (const key of MEASUREMENT_KEYS) {
      if (latestByMeasurement[key] == null && entry[key] != null) {
        latestByMeasurement[key] = entry[key] as number;
      }
    }
    if (latestBodyFat == null && entry.bodyFatPct != null) {
      latestBodyFat = entry.bodyFatPct;
    }
  }

  const exerciseMaxByName = new Map<string, number>(
    exerciseMax.map((row) => [row.name, row._max.weightKg ?? 0]),
  );
  const weeklyFrequency = completedCount / 4;

  return {
    weeklyFrequency,
    liveValue(metric: GoalMetric, metricKey: string | null): number | null {
      switch (metric) {
        case "WEIGHT":
          return latestWeight?.weightKg ?? null;
        case "BODY_FAT":
          return latestBodyFat;
        case "MEASUREMENT":
          return metricKey
            ? (latestByMeasurement[metricKey as MeasurementKey] ?? null)
            : null;
        case "EXERCISE_LOAD":
          return metricKey ? (exerciseMaxByName.get(metricKey) ?? null) : null;
        case "WORKOUT_FREQUENCY":
          return weeklyFrequency;
        default:
          return null;
      }
    },
  };
}
