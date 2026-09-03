import Link from "next/link";
import {
  DumbbellIcon,
  FileTextIcon,
  TargetIcon,
  UtensilsIcon,
} from "lucide-react";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDateBR, toISODate } from "@/lib/date";
import { WORKOUT_STATUS_LABELS } from "@/lib/workouts";
import { DOCUMENT_CATEGORY_LABELS } from "@/lib/documents";
import { Card, CardContent } from "@/components/ui/card";
import { SearchBox } from "./search-box";

export const metadata = { title: "Busca" };

type ResultGroup = {
  key: string;
  label: string;
  icon: typeof DumbbellIcon;
  items: { href: string; primary: string; secondary?: string }[];
};

export default async function BuscaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requireUser();
  const query = (await searchParams).q?.trim() ?? "";
  const enabled = query.length >= 2;

  let groups: ResultGroup[] = [];
  let total = 0;

  if (enabled) {
    const like = { contains: query, mode: "insensitive" as const };
    const [workouts, exercises, foodItems, goals, documents] =
      await Promise.all([
        prisma.workout.findMany({
          where: { profileId: user.id, name: like },
          orderBy: { date: "desc" },
          take: 8,
        }),
        prisma.exercise.findMany({
          where: { workout: { profileId: user.id }, name: like },
          orderBy: { id: "desc" },
          take: 8,
          include: { workout: { select: { id: true, name: true, date: true } } },
        }),
        prisma.foodItem.findMany({
          where: { meal: { profileId: user.id }, name: like },
          orderBy: { id: "desc" },
          take: 8,
          include: { meal: { select: { date: true } } },
        }),
        prisma.goal.findMany({
          where: { profileId: user.id, title: like },
          orderBy: { createdAt: "desc" },
          take: 8,
        }),
        prisma.fileDocument.findMany({
          where: { profileId: user.id, name: like },
          orderBy: { createdAt: "desc" },
          take: 8,
        }),
      ]);

    groups = [
      {
        key: "workouts",
        label: "Treinos",
        icon: DumbbellIcon,
        items: workouts.map((w) => ({
          href: `/treinos/${w.id}`,
          primary: w.name,
          secondary: `${formatDateBR(w.date)} · ${WORKOUT_STATUS_LABELS[w.status]}`,
        })),
      },
      {
        key: "exercises",
        label: "Exercícios",
        icon: DumbbellIcon,
        items: exercises.map((e) => ({
          href: `/treinos/${e.workout.id}`,
          primary: e.name,
          secondary: `${e.workout.name} · ${formatDateBR(e.workout.date)}`,
        })),
      },
      {
        key: "food",
        label: "Alimentos",
        icon: UtensilsIcon,
        items: foodItems.map((f) => ({
          href: `/alimentacao?d=${toISODate(f.meal.date)}`,
          primary: f.name,
          secondary: `${f.quantity ? `${f.quantity} · ` : ""}${formatDateBR(f.meal.date)}`,
        })),
      },
      {
        key: "goals",
        label: "Metas",
        icon: TargetIcon,
        items: goals.map((g) => ({
          href: "/metas",
          primary: g.title,
          secondary: g.description ?? undefined,
        })),
      },
      {
        key: "documents",
        label: "Arquivos",
        icon: FileTextIcon,
        items: documents.map((d) => ({
          href: `/arquivos/${d.id}/download`,
          primary: d.name,
          secondary: DOCUMENT_CATEGORY_LABELS[d.category],
        })),
      },
    ].filter((group) => group.items.length > 0);

    total = groups.reduce((sum, group) => sum + group.items.length, 0);
  }

  return (
    <div className="space-y-5">
      <SearchBox initialQuery={query} />

      {!enabled ? (
        <p className="text-sm text-muted-foreground">
          Digite ao menos 2 caracteres para buscar.
        </p>
      ) : total === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nada encontrado para <span className="font-medium">{query}</span>.
        </p>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <section key={group.key} className="space-y-2">
              <h2 className="flex items-center gap-1.5 font-heading text-sm font-semibold">
                <group.icon className="size-4 text-muted-foreground" />
                {group.label} ({group.items.length})
              </h2>
              <Card className="py-0">
                <CardContent className="divide-y p-0">
                  {group.items.map((item, index) => (
                    <Link
                      key={`${group.key}-${index}`}
                      href={item.href}
                      className="block px-4 py-2.5 text-sm hover:bg-accent"
                    >
                      <p className="font-medium">{item.primary}</p>
                      {item.secondary ? (
                        <p className="text-xs text-muted-foreground">
                          {item.secondary}
                        </p>
                      ) : null}
                    </Link>
                  ))}
                </CardContent>
              </Card>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
