import Link from "next/link";
import { redirect } from "next/navigation";

import { getProfile, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  formatDateBR,
  parseISODate,
  toISODate,
  todayISO,
} from "@/lib/date";
import {
  ageInYears,
  basalMetabolicRate,
  formatNumber,
  totalDailyEnergyExpenditure,
} from "@/lib/metrics";
import { sumFoodItems, suggestTargets } from "@/lib/nutrition";
import { Card, CardContent } from "@/components/ui/card";
import { MacroSummary } from "@/components/nutrition/macro-summary";
import { DayNav } from "./day-nav";
import { DayView } from "./day-view";
import { EditTargetsButton } from "./edit-targets-button";

export const metadata = { title: "Alimentação" };

export default async function AlimentacaoPage({
  searchParams,
}: {
  searchParams: Promise<{ d?: string }>;
}) {
  const user = await requireUser();
  const profile = await getProfile();
  if (!profile) redirect("/onboarding");

  const requested = (await searchParams).d;
  const parsedRequested = requested ? parseISODate(requested) : null;
  const date =
    parsedRequested && parsedRequested <= new Date()
      ? requested!
      : todayISO();
  const dayDate = parseISODate(date) as Date;

  const fourteenDaysAgo = parseISODate(date) as Date;
  fourteenDaysAgo.setUTCDate(fourteenDaysAgo.getUTCDate() - 13);

  const [dayMeals, recentMeals, latestWeight] = await Promise.all([
    prisma.meal.findMany({
      where: { profileId: user.id, date: dayDate },
      include: { items: { orderBy: { position: "asc" } } },
    }),
    prisma.meal.findMany({
      where: {
        profileId: user.id,
        date: { gte: fourteenDaysAgo, lte: dayDate },
      },
      include: { items: { select: { calories: true } } },
    }),
    prisma.weightEntry.findFirst({
      where: { profileId: user.id },
      orderBy: { date: "desc" },
    }),
  ]);

  const dayTotals = sumFoodItems(dayMeals.flatMap((meal) => meal.items));

  const targets = {
    calories: profile.targetCalories,
    proteinG: profile.targetProteinG,
    carbsG: profile.targetCarbsG,
    fatG: profile.targetFatG,
  };

  // Sugestão de metas a partir do GET (se o perfil e o peso permitirem).
  const age = profile.birthDate ? ageInYears(profile.birthDate) : null;
  const bmr =
    latestWeight && profile.heightCm && profile.sex && age != null
      ? basalMetabolicRate({
          sex: profile.sex,
          weightKg: latestWeight.weightKg,
          heightCm: profile.heightCm,
          ageYears: age,
        })
      : null;
  const tdee =
    bmr != null && profile.activityLevel
      ? totalDailyEnergyExpenditure(bmr, profile.activityLevel)
      : null;
  const suggestion =
    tdee != null
      ? suggestTargets(
          tdee,
          profile.goalType,
          latestWeight?.weightKg ?? null,
        )
      : null;

  // Últimos dias com refeições.
  const byDay = new Map<string, number>();
  for (const meal of recentMeals) {
    const key = toISODate(meal.date);
    const kcal = meal.items.reduce((sum, i) => sum + (i.calories ?? 0), 0);
    byDay.set(key, (byDay.get(key) ?? 0) + kcal);
  }
  const recentDays = [...byDay.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .filter(([key]) => key !== date)
    .slice(0, 7);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <DayNav date={date} />
        <EditTargetsButton
          current={{
            calories: profile.targetCalories,
            proteinG: profile.targetProteinG,
            carbsG: profile.targetCarbsG,
            fatG: profile.targetFatG,
          }}
          suggestion={suggestion}
        />
      </div>

      <section className="space-y-3">
        <h2 className="font-heading text-sm font-semibold">
          Resumo do dia
        </h2>
        <MacroSummary totals={dayTotals} targets={targets} />
        {targets.calories == null ? (
          <p className="text-xs text-muted-foreground">
            Defina metas de nutrição para comparar o consumo com um alvo diário.
          </p>
        ) : null}
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-sm font-semibold">Refeições</h2>
        <DayView date={date} meals={dayMeals} />
      </section>

      {recentDays.length > 0 ? (
        <section className="space-y-2">
          <h2 className="font-heading text-sm font-semibold">Últimos dias</h2>
          <Card className="py-0">
            <CardContent className="divide-y p-0">
              {recentDays.map(([key, kcal]) => (
                <Link
                  key={key}
                  href={`/alimentacao?d=${key}`}
                  className="flex items-center justify-between px-4 py-2.5 text-sm hover:bg-accent"
                >
                  <span>{formatDateBR(parseISODate(key) as Date)}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {formatNumber(kcal, 0)} kcal
                  </span>
                </Link>
              ))}
            </CardContent>
          </Card>
        </section>
      ) : null}

      <p className="text-xs text-muted-foreground">
        Os valores nutricionais são estimativas informadas por você e não
        substituem a orientação de um nutricionista.
      </p>
    </div>
  );
}
