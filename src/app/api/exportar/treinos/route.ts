import { NextResponse, type NextRequest } from "next/server";

import { getProfile, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toISODate, todayISO } from "@/lib/date";
import { downloadHeaders, toCsv } from "@/lib/export";
import { renderWorkoutsPdf } from "@/lib/pdf/workouts-pdf";
import { WORKOUT_STATUS_LABELS } from "@/lib/workouts";

export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const user = await requireUser();
  const requested = request.nextUrl.searchParams.get("formato");
  const format =
    requested === "csv" || requested === "pdf" ? requested : "json";

  const workouts = await prisma.workout.findMany({
    where: { profileId: user.id },
    orderBy: { date: "asc" },
    include: { exercises: { orderBy: { position: "asc" } } },
  });

  const stamp = todayISO();

  if (format === "pdf") {
    const profile = await getProfile();
    const buffer = await renderWorkoutsPdf(
      workouts.map((workout) => ({
        name: workout.name,
        date: workout.date,
        status: workout.status,
        muscleGroups: workout.muscleGroups,
        durationMin: workout.durationMin,
        note: workout.note,
        exercises: workout.exercises.map((exercise) => ({
          name: exercise.name,
          sets: exercise.sets,
          reps: exercise.reps,
          weightKg: exercise.weightKg,
          restSec: exercise.restSec,
          note: exercise.note,
        })),
      })),
      { userName: profile?.fullName ?? "", generatedAt: new Date() },
    );
    return new NextResponse(new Uint8Array(buffer), {
      headers: downloadHeaders(`treinos-${stamp}.pdf`, "application/pdf"),
    });
  }

  if (format === "csv") {
    const rows = workouts.flatMap((workout) =>
      (workout.exercises.length > 0
        ? workout.exercises
        : [null]
      ).map((exercise) => ({
        data: toISODate(workout.date),
        treino: workout.name,
        situacao: WORKOUT_STATUS_LABELS[workout.status],
        grupos: workout.muscleGroups.join(" | "),
        duracao_min: workout.durationMin ?? "",
        observacao_treino: workout.note ?? "",
        exercicio: exercise?.name ?? "",
        series: exercise?.sets ?? "",
        repeticoes: exercise?.reps ?? "",
        carga_kg: exercise?.weightKg ?? "",
        descanso_s: exercise?.restSec ?? "",
        observacao_exercicio: exercise?.note ?? "",
      })),
    );

    const csv = toCsv(rows, [
      ["data", "Data"],
      ["treino", "Treino"],
      ["situacao", "Situação"],
      ["grupos", "Grupos musculares"],
      ["duracao_min", "Duração (min)"],
      ["observacao_treino", "Observação do treino"],
      ["exercicio", "Exercício"],
      ["series", "Séries"],
      ["repeticoes", "Repetições"],
      ["carga_kg", "Carga (kg)"],
      ["descanso_s", "Descanso (s)"],
      ["observacao_exercicio", "Observação do exercício"],
    ]);

    return new NextResponse(csv, {
      headers: downloadHeaders(`treinos-${stamp}.csv`, "text/csv"),
    });
  }

  const payload = {
    exportadoEm: new Date().toISOString(),
    tipo: "treinos",
    treinos: workouts.map((workout) => ({
      nome: workout.name,
      data: toISODate(workout.date),
      situacao: workout.status,
      gruposMusculares: workout.muscleGroups,
      duracaoMin: workout.durationMin,
      observacao: workout.note,
      exercicios: workout.exercises.map((exercise) => ({
        nome: exercise.name,
        series: exercise.sets,
        repeticoes: exercise.reps,
        cargaKg: exercise.weightKg,
        descansoSeg: exercise.restSec,
        observacao: exercise.note,
      })),
    })),
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: downloadHeaders(`treinos-${stamp}.json`, "application/json"),
  });
}
