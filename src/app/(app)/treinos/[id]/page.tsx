import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { WorkoutDetail } from "./workout-detail";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const workoutId = Number(id);
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(workoutId) || workoutId < 1 || workoutId > 2147483647) notFound();
  const workout = await prisma.workout.findFirst({
    where: { id: workoutId, profileId: user.id },
    select: { name: true },
  });
  return { title: workout?.name ?? "Treino" };
}

export default async function WorkoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const workoutId = Number(id);
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(workoutId) || workoutId < 1 || workoutId > 2147483647) notFound();

  const workout = await prisma.workout.findFirst({
    where: { id: workoutId, profileId: user.id },
    include: { exercises: { orderBy: { position: "asc" } } },
  });
  if (!workout) notFound();

  return (
    <div className="space-y-4">
      <Link
        href="/treinos"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" />
        Voltar aos treinos
      </Link>
      <WorkoutDetail workout={workout} />
    </div>
  );
}
