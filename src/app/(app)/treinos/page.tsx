import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDateBR, formatDateShort, toISODate } from "@/lib/date";
import { formatNumber } from "@/lib/metrics";
import { totalVolume } from "@/lib/workouts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatCard } from "@/components/metrics/stat-card";
import {
  ExerciseProgression,
  type ProgressionPoint,
} from "./exercise-progression";
import { WorkoutsPanel, type WorkoutCardData } from "./workouts-panel";

export const metadata = { title: "Treinos" };

const KEY_SEP = "|@|";

export default async function TreinosPage() {
  const user = await requireUser();

  const workouts = await prisma.workout.findMany({
    where: { profileId: user.id },
    orderBy: { date: "desc" },
    include: { exercises: true },
  });

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const fourWeeksAgo = new Date();
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

  const completed = workouts.filter((w) => w.status === "COMPLETED");
  const completedThisMonth = completed.filter((w) => w.date >= monthStart);
  const completedLast4Weeks = completed.filter((w) => w.date >= fourWeeksAgo);

  const volumeThisMonth = completedThisMonth.reduce(
    (sum, w) => sum + totalVolume(w.exercises),
    0,
  );
  const weeklyFrequency = completedLast4Weeks.length / 4;
  const lastCompleted = completed[0] ?? null;

  const workoutCards: WorkoutCardData[] = workouts.map((workout) => {
    const { exercises, ...rest } = workout;
    return {
      ...rest,
      exerciseCount: exercises.length,
      volume: totalVolume(exercises),
    };
  });

  // Evolução por exercício: carga máxima por dia, por nome de exercício.
  const exerciseRows = await prisma.exercise.findMany({
    where: {
      workout: { profileId: user.id, status: "COMPLETED" },
      weightKg: { not: null },
    },
    select: {
      name: true,
      weightKg: true,
      workout: { select: { date: true } },
    },
    orderBy: { workout: { date: "asc" } },
  });

  const maxByNameDate = new Map<string, number>();
  for (const row of exerciseRows) {
    const key = `${row.name}${KEY_SEP}${toISODate(row.workout.date)}`;
    maxByNameDate.set(
      key,
      Math.max(maxByNameDate.get(key) ?? 0, row.weightKg ?? 0),
    );
  }

  const progressionPoints: ProgressionPoint[] = [...maxByNameDate].map(
    ([key, weightKg]) => {
      const [name, iso] = key.split(KEY_SEP);
      return {
        name,
        date: iso,
        label: formatDateShort(new Date(`${iso}T00:00:00.000Z`)),
        weightKg,
      };
    },
  );

  const exerciseNames = [
    ...new Set(progressionPoints.map((point) => point.name)),
  ].sort((a, b) => a.localeCompare(b, "pt-BR"));

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Registre os seus treinos e exercícios e acompanhe a frequência e a
        evolução das cargas.
      </p>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Treinos no mês"
          value={completedThisMonth.length}
          hint={now.toLocaleDateString("pt-BR", {
            month: "long",
            year: "numeric",
          })}
        />
        <StatCard
          label="Frequência"
          value={formatNumber(weeklyFrequency)}
          unit="/semana"
          hint="Média das últimas 4 semanas"
        />
        <StatCard
          label="Volume no mês"
          value={volumeThisMonth > 0 ? formatNumber(volumeThisMonth, 0) : "—"}
          unit={volumeThisMonth > 0 ? "kg" : undefined}
          hint="Σ séries × reps × carga"
        />
        <StatCard
          label="Último treino"
          value={lastCompleted ? formatDateBR(lastCompleted.date) : "—"}
          hint={lastCompleted?.name ?? "Nenhum treino realizado"}
        />
      </section>

      <Tabs defaultValue="treinos">
        <TabsList>
          <TabsTrigger value="treinos">
            Treinos ({workouts.length})
          </TabsTrigger>
          <TabsTrigger value="exercicio">Por exercício</TabsTrigger>
        </TabsList>
        <TabsContent value="treinos" className="mt-3">
          <WorkoutsPanel workouts={workoutCards} />
        </TabsContent>
        <TabsContent value="exercicio" className="mt-3">
          <ExerciseProgression
            names={exerciseNames}
            points={progressionPoints}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
