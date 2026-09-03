import { redirect } from "next/navigation";
import type { GoalMetric } from "@prisma/client";

import { getProfile, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  GOAL_METRIC_LABELS,
  computeGoalProgress,
  daysUntil,
  goalUnit,
} from "@/lib/goals";
import { MEASUREMENT_KEYS, type MeasurementKey } from "@/lib/measurements";
import { StatCard } from "@/components/metrics/stat-card";
import { GoalsPanel, type GoalCardData } from "./goals-panel";

export const metadata = { title: "Metas" };

export default async function MetasPage() {
  const user = await requireUser();
  const profile = await getProfile();
  if (!profile) redirect("/onboarding");

  const fourWeeksAgo = new Date();
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

  const [goals, latestWeight, measurements, exerciseMax, completedCount] =
    await Promise.all([
      prisma.goal.findMany({
        where: { profileId: user.id },
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      }),
      prisma.weightEntry.findFirst({
        where: { profileId: user.id },
        orderBy: { date: "desc" },
      }),
      prisma.measurementEntry.findMany({
        where: { profileId: user.id },
        orderBy: { date: "desc" },
      }),
      prisma.exercise.groupBy({
        by: ["name"],
        where: {
          workout: { profileId: user.id, status: "COMPLETED" },
          weightKg: { not: null },
        },
        _max: { weightKg: true },
      }),
      prisma.workout.count({
        where: {
          profileId: user.id,
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

  function liveValue(metric: GoalMetric, metricKey: string | null): number | null {
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
  }

  const cards: GoalCardData[] = goals.map((goal) => ({
    ...goal,
    progress: computeGoalProgress(goal, liveValue(goal.metric, goal.metricKey)),
    daysLeft: daysUntil(goal.deadline),
    unit: goalUnit(goal.metric),
    metricLabel: GOAL_METRIC_LABELS[goal.metric],
  }));

  const active = cards.filter((g) => g.status === "ACTIVE");
  const achieved = cards.filter((g) => g.status === "ACHIEVED");
  const avgProgress =
    active.length > 0
      ? Math.round(
          active.reduce((sum, g) => sum + g.progress.percent, 0) /
            active.length,
        )
      : null;

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Defina metas de peso, medidas, carga ou frequência. O progresso é
        calculado a partir dos seus registros.
      </p>

      <section className="grid grid-cols-3 gap-3">
        <StatCard label="Metas ativas" value={active.length} />
        <StatCard
          label="Progresso médio"
          value={avgProgress == null ? "—" : `${avgProgress}%`}
          hint="Das metas ativas"
        />
        <StatCard label="Concluídas" value={achieved.length} />
      </section>

      <GoalsPanel goals={cards} />
    </div>
  );
}
