import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CalendarIcon,
  DumbbellIcon,
  RulerIcon,
  ScaleIcon,
  TargetIcon,
  UtensilsIcon,
} from "lucide-react";

import { getProfile, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDateBR, formatDateShort, todayISO, parseISODate } from "@/lib/date";
import { bmi, bmiBand, formatNumber } from "@/lib/metrics";
import { computeGoalProgress, GOAL_METRIC_LABELS, goalUnit } from "@/lib/goals";
import { buildGoalLiveValueResolver } from "@/lib/goal-live-value";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatCard } from "@/components/metrics/stat-card";
import { WeightMiniChart } from "@/components/metrics/weight-mini-chart";
import { cn } from "@/lib/utils";

export const metadata = { title: "Painel" };

export default async function PainelPage() {
  const user = await requireUser();
  const profile = await getProfile();
  if (!profile) redirect("/onboarding");

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  weekStart.setHours(0, 0, 0, 0);
  const ninetyAgo = new Date(now);
  ninetyAgo.setDate(now.getDate() - 90);
  const today = parseISODate(todayISO()) as Date;

  const [
    weights90,
    latestWeight,
    weekWorkoutCount,
    upcoming,
    recentWorkouts,
    todayMeals,
    activeGoals,
    recentWeights,
    recentMeasurements,
    resolver,
  ] = await Promise.all([
    prisma.weightEntry.findMany({
      where: { profileId: user.id, date: { gte: ninetyAgo } },
      orderBy: { date: "asc" },
    }),
    prisma.weightEntry.findFirst({
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
    prisma.workout.findMany({
      where: { profileId: user.id, status: "PLANNED", date: { gte: today } },
      orderBy: { date: "asc" },
      take: 3,
    }),
    prisma.workout.findMany({
      where: { profileId: user.id, status: "COMPLETED" },
      orderBy: { date: "desc" },
      take: 3,
    }),
    prisma.meal.findMany({
      where: { profileId: user.id, date: today },
      include: { items: { select: { calories: true } } },
    }),
    prisma.goal.findMany({
      where: { profileId: user.id, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
    }),
    prisma.weightEntry.findMany({
      where: { profileId: user.id },
      orderBy: { date: "desc" },
      take: 3,
    }),
    prisma.measurementEntry.findMany({
      where: { profileId: user.id },
      orderBy: { date: "desc" },
      take: 2,
    }),
    buildGoalLiveValueResolver(user.id),
  ]);

  const firstName = profile.fullName.split(/\s+/)[0];
  const height = profile.heightCm ?? null;

  const bmiValue =
    latestWeight && height ? bmi(latestWeight.weightKg, height) : null;
  const band = bmiValue != null ? bmiBand(bmiValue) : null;

  const caloriesToday = todayMeals
    .flatMap((meal) => meal.items)
    .reduce((sum, item) => sum + (item.calories ?? 0), 0);

  const goalCards = activeGoals
    .map((goal) => ({
      goal,
      progress: computeGoalProgress(
        goal,
        resolver.liveValue(goal.metric, goal.metricKey),
      ),
    }))
    .sort((a, b) => b.progress.percent - a.progress.percent)
    .slice(0, 3);

  const chartData = weights90.map((entry) => ({
    label: formatDateShort(entry.date),
    weight: entry.weightKg,
  }));

  type TimelineItem = {
    key: string;
    date: Date;
    icon: typeof ScaleIcon;
    text: string;
    href: string;
  };

  const timeline: TimelineItem[] = [
    ...recentWeights.map((entry) => ({
      key: `w${entry.id}`,
      date: entry.date,
      icon: ScaleIcon,
      text: `Peso registrado: ${formatNumber(entry.weightKg)} kg`,
      href: "/medidas",
    })),
    ...recentWorkouts.map((workout) => ({
      key: `t${workout.id}`,
      date: workout.date,
      icon: DumbbellIcon,
      text: `Treino: ${workout.name}`,
      href: `/treinos/${workout.id}`,
    })),
    ...recentMeasurements.map((entry) => ({
      key: `m${entry.id}`,
      date: entry.date,
      icon: RulerIcon,
      text: "Medidas registradas",
      href: "/medidas",
    })),
  ]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 8);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-xl font-semibold">
          Olá, {firstName}! 👋
        </h1>
        <p className="text-sm text-muted-foreground">
          Aqui está o resumo da sua evolução.
        </p>
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Peso atual"
          value={latestWeight ? formatNumber(latestWeight.weightKg) : "—"}
          unit={latestWeight ? "kg" : undefined}
          hint={
            latestWeight
              ? formatDateBR(latestWeight.date)
              : "Nenhum registro"
          }
        />
        <StatCard
          label="IMC"
          value={bmiValue != null ? formatNumber(bmiValue) : "—"}
          badge={band?.label}
          badgeTone={band?.tone}
          hint={bmiValue == null ? "Informe altura e peso" : undefined}
        />
        <StatCard
          label="Treinos na semana"
          value={weekWorkoutCount}
          hint="Realizados desde segunda"
        />
        <StatCard
          label="Calorias hoje"
          value={caloriesToday > 0 ? formatNumber(caloriesToday, 0) : "—"}
          unit={
            profile.targetCalories
              ? `/ ${profile.targetCalories} kcal`
              : caloriesToday > 0
                ? "kcal"
                : undefined
          }
          hint={
            profile.targetCalories == null
              ? "Sem meta definida"
              : caloriesToday > profile.targetCalories
                ? "Acima da meta"
                : `Faltam ${formatNumber(profile.targetCalories - caloriesToday, 0)} kcal`
          }
        />
      </section>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Evolução do peso</CardTitle>
          <Link
            href="/evolucao"
            className="text-xs font-medium text-primary hover:underline"
          >
            Ver mais
          </Link>
        </CardHeader>
        <CardContent>
          <WeightMiniChart
            data={chartData}
            target={profile.targetWeightKg ?? null}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Progresso das metas</CardTitle>
            <Link
              href="/metas"
              className="text-xs font-medium text-primary hover:underline"
            >
              Ver todas
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {goalCards.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma meta ativa.{" "}
                <Link href="/metas" className="text-primary hover:underline">
                  Criar meta
                </Link>
              </p>
            ) : (
              goalCards.map(({ goal, progress }) => (
                <div key={goal.id}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="truncate">{goal.title}</span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {progress.percent}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        progress.achieved ? "bg-success" : "bg-primary",
                      )}
                      style={{ width: `${Math.max(2, progress.percent)}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {GOAL_METRIC_LABELS[goal.metric]}
                    {progress.current != null
                      ? ` · atual ${formatNumber(progress.current)}${goalUnit(goal.metric) ? ` ${goalUnit(goal.metric)}` : ""}`
                      : ""}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Próximos treinos</CardTitle>
            <Link
              href="/treinos"
              className="text-xs font-medium text-primary hover:underline"
            >
              Ver treinos
            </Link>
          </CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum treino planejado. Crie um treino com a data futura e a
                situação &ldquo;Planejado&rdquo;.
              </p>
            ) : (
              <ul className="space-y-2">
                {upcoming.map((workout) => (
                  <li key={workout.id}>
                    <Link
                      href={`/treinos/${workout.id}`}
                      className="flex items-center gap-2 rounded-lg border p-2.5 text-sm hover:bg-accent"
                    >
                      <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
                      <span className="line-clamp-2 flex-1 break-words">
                        {workout.name}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatDateBR(workout.date)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Últimos registros</CardTitle>
        </CardHeader>
        <CardContent>
          {timeline.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Seus registros mais recentes aparecerão aqui.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {timeline.map((item) => (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    className="flex items-center gap-3 text-sm hover:underline"
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <item.icon className="size-4 text-muted-foreground" />
                    </span>
                    <span className="line-clamp-2 flex-1 break-words">
                      {item.text}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatDateBR(item.date)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/medidas?novo=peso"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <ScaleIcon />
          Registrar peso
        </Link>
        <Link
          href="/treinos?novo=1"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <DumbbellIcon />
          Novo treino
        </Link>
        <Link
          href="/alimentacao?novo=refeicao"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <UtensilsIcon />
          Registrar refeição
        </Link>
        <Link
          href="/metas?novo=1"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <TargetIcon />
          Nova meta
        </Link>
      </div>
    </div>
  );
}
