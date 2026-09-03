import { redirect } from "next/navigation";

import { getProfile, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  GOAL_METRIC_LABELS,
  computeGoalProgress,
  daysUntil,
  goalUnit,
} from "@/lib/goals";
import { buildGoalLiveValueResolver } from "@/lib/goal-live-value";
import { StatCard } from "@/components/metrics/stat-card";
import { GoalsPanel, type GoalCardData } from "./goals-panel";

export const metadata = { title: "Metas" };

export default async function MetasPage() {
  const user = await requireUser();
  const profile = await getProfile();
  if (!profile) redirect("/onboarding");

  const [goals, resolver] = await Promise.all([
    prisma.goal.findMany({
      where: { profileId: user.id },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    }),
    buildGoalLiveValueResolver(user.id),
  ]);

  const cards: GoalCardData[] = goals.map((goal) => ({
    ...goal,
    progress: computeGoalProgress(
      goal,
      resolver.liveValue(goal.metric, goal.metricKey),
    ),
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
