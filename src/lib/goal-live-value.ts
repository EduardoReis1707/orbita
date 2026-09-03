import type { GoalMetric } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { MEASUREMENT_KEYS, type MeasurementKey } from "@/lib/measurements";

/**
 * Busca os agregados necessários e devolve uma função que resolve o valor
 * atual de uma meta automática a partir dos registros do perfil.
 */
export async function buildGoalLiveValueResolver(profileId: string) {
  const fourWeeksAgo = new Date();
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

  const [latestWeight, measurements, exerciseMax, completedCount] =
    await Promise.all([
      prisma.weightEntry.findFirst({
        where: { profileId },
        orderBy: { date: "desc" },
      }),
      prisma.measurementEntry.findMany({
        where: { profileId },
        orderBy: { date: "desc" },
      }),
      prisma.exercise.groupBy({
        by: ["name"],
        where: {
          workout: { profileId, status: "COMPLETED" },
          weightKg: { not: null },
        },
        _max: { weightKg: true },
      }),
      prisma.workout.count({
        where: {
          profileId,
          status: "COMPLETED",
          date: { gte: fourWeeksAgo },
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
