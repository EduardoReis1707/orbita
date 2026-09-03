import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CircleAlertIcon,
  CircleCheckIcon,
  InfoIcon,
  LightbulbIcon,
} from "lucide-react";

import { getProfile, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { weightGoalProgress } from "@/lib/metrics";
import { buildTips, type TipsContext } from "@/lib/tips";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Dicas" };

const DAY = 86_400_000;

function daysSince(date: Date | null | undefined): number | null {
  if (!date) return null;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return Math.floor((start.getTime() - new Date(date).getTime()) / DAY);
}

export default async function DicasPage() {
  const user = await requireUser();
  const profile = await getProfile();
  if (!profile) redirect("/onboarding");

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  weekStart.setHours(0, 0, 0, 0);
  const fourWeeksAgo = new Date(now);
  fourWeeksAgo.setDate(now.getDate() - 28);
  const sixtyAgo = new Date(now);
  sixtyAgo.setDate(now.getDate() - 60);
  const thirtyAgo = new Date(now);
  thirtyAgo.setDate(now.getDate() - 30);
  const yesterday = new Date();
  yesterday.setHours(0, 0, 0, 0);
  yesterday.setDate(yesterday.getDate() - 1);

  const [
    firstWeight,
    lastWeight,
    lastMeasurement,
    workoutsThisWeek,
    workoutsLast4Weeks,
    activeGoalCount,
    yesterdayMeals,
    recentExercises,
  ] = await Promise.all([
    prisma.weightEntry.findFirst({
      where: { profileId: user.id },
      orderBy: { date: "asc" },
    }),
    prisma.weightEntry.findFirst({
      where: { profileId: user.id },
      orderBy: { date: "desc" },
    }),
    prisma.measurementEntry.findFirst({
      where: { profileId: user.id },
      orderBy: { date: "desc" },
    }),
    prisma.workout.count({
      where: {
        profileId: user.id,
        status: "COMPLETED",
        date: { gte: weekStart },
      },
    }),
    prisma.workout.count({
      where: {
        profileId: user.id,
        status: "COMPLETED",
        date: { gte: fourWeeksAgo },
      },
    }),
    prisma.goal.count({
      where: { profileId: user.id, status: "ACTIVE" },
    }),
    prisma.meal.findMany({
      where: { profileId: user.id, date: yesterday },
      include: { items: { select: { calories: true, proteinG: true } } },
    }),
    prisma.exercise.findMany({
      where: {
        workout: {
          profileId: user.id,
          status: "COMPLETED",
          date: { gte: sixtyAgo },
        },
        weightKg: { not: null },
      },
      select: { name: true, weightKg: true, workout: { select: { date: true } } },
    }),
  ]);

  const weightGoal =
    profile.targetWeightKg != null && firstWeight && lastWeight
      ? weightGoalProgress(
          firstWeight.weightKg,
          lastWeight.weightKg,
          profile.targetWeightKg,
        )
      : null;

  const yesterdayItems = yesterdayMeals.flatMap((meal) => meal.items);
  const yesterdayCalories = yesterdayItems.reduce(
    (sum, item) => sum + (item.calories ?? 0),
    0,
  );
  const yesterdayProtein = yesterdayItems.reduce(
    (sum, item) => sum + (item.proteinG ?? 0),
    0,
  );

  // Progressão de carga: maior aumento de máximo entre 30-60 dias e últimos 30.
  const recentMax = new Map<string, number>();
  const priorMax = new Map<string, number>();
  for (const ex of recentExercises) {
    const target =
      new Date(ex.workout.date) >= thirtyAgo ? recentMax : priorMax;
    target.set(
      ex.name,
      Math.max(target.get(ex.name) ?? 0, ex.weightKg ?? 0),
    );
  }
  let topProgressExercise: { name: string; deltaKg: number } | null = null;
  for (const [name, recent] of recentMax) {
    const prior = priorMax.get(name);
    if (prior != null && recent > prior) {
      const delta = recent - prior;
      if (!topProgressExercise || delta > topProgressExercise.deltaKg) {
        topProgressExercise = { name, deltaKg: Math.round(delta * 10) / 10 };
      }
    }
  }

  const ctx: TipsContext = {
    daysSinceWeight: daysSince(lastWeight?.date),
    daysSinceMeasurement: daysSince(lastMeasurement?.date),
    weightGoalPercent: weightGoal?.percent ?? null,
    weightGoalAchieved: weightGoal
      ? Math.abs(weightGoal.remainingKg) <= 0.1
      : false,
    workoutsThisWeek,
    weeklyAverage: workoutsLast4Weeks / 4,
    activeGoalCount,
    yesterdayCalories: yesterdayMeals.length > 0 ? yesterdayCalories : null,
    targetCalories: profile.targetCalories,
    yesterdayProtein: yesterdayMeals.length > 0 ? yesterdayProtein : null,
    targetProtein: profile.targetProteinG,
    topProgressExercise,
  };

  const tips = buildTips(ctx);

  const toneStyles = {
    info: { border: "border-primary/20", icon: InfoIcon, iconClass: "text-primary" },
    success: {
      border: "border-success/30",
      icon: CircleCheckIcon,
      iconClass: "text-success",
    },
    warning: {
      border: "border-warning/40",
      icon: CircleAlertIcon,
      iconClass: "text-warning",
    },
  } as const;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2">
        <LightbulbIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Observações geradas automaticamente a partir dos seus registros. São
          um acompanhamento, não um diagnóstico — não substituem a orientação de
          profissionais.
        </p>
      </div>

      <div className="space-y-3">
        {tips.map((tip) => {
          const tone = toneStyles[tip.tone];
          const ToneIcon = tone.icon;
          return (
            <Card key={tip.id} className={cn("py-0", tone.border)}>
              <CardContent className="flex gap-3 p-4">
                <ToneIcon
                  className={cn("mt-0.5 size-4 shrink-0", tone.iconClass)}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{tip.title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {tip.text}
                  </p>
                  {tip.href ? (
                    <Link
                      href={tip.href}
                      className={cn(
                        buttonVariants({ variant: "outline", size: "sm" }),
                        "mt-2",
                      )}
                    >
                      {tip.cta ?? "Abrir"}
                    </Link>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
