import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRightIcon, InfoIcon } from "lucide-react";

import { getProfile, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDateBR } from "@/lib/date";
import {
  ageInYears,
  basalMetabolicRate,
  bmi,
  bmiBand,
  formatKcal,
  formatNumber,
  percentChange,
  totalDailyEnergyExpenditure,
  weightGoalProgress,
} from "@/lib/metrics";
import { GOAL_TYPE_LABELS } from "@/lib/profile";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { StatCard } from "@/components/metrics/stat-card";
import { HistorySection } from "./history-section";
import { MetricsActions } from "./metrics-actions";

export const metadata = { title: "Medidas" };

export default async function MedidasPage() {
  const user = await requireUser();
  const profile = await getProfile();
  if (!profile) redirect("/onboarding");

  const [weightAsc, measurementsDesc] = await Promise.all([
    prisma.weightEntry.findMany({
      where: { profileId: user.id },
      orderBy: { date: "asc" },
    }),
    prisma.measurementEntry.findMany({
      where: { profileId: user.id },
      orderBy: { date: "desc" },
    }),
  ]);

  const weightDesc = [...weightAsc].reverse();
  const current = weightAsc.at(-1) ?? null;
  const first = weightAsc[0] ?? null;

  const height = profile.heightCm ?? null;
  const age = profile.birthDate ? ageInYears(profile.birthDate) : null;

  const bmiValue =
    current && height ? bmi(current.weightKg, height) : null;
  const band = bmiValue != null ? bmiBand(bmiValue) : null;

  const bmrValue =
    current && height && profile.sex && age != null
      ? basalMetabolicRate({
          sex: profile.sex,
          weightKg: current.weightKg,
          heightCm: height,
          ageYears: age,
        })
      : null;

  const tdeeValue =
    bmrValue != null && profile.activityLevel
      ? totalDailyEnergyExpenditure(bmrValue, profile.activityLevel)
      : null;

  // Comparação com ~30 dias atrás (ou com o primeiro registro).
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const past =
    [...weightAsc].reverse().find((entry) => entry.date <= cutoff) ??
    (weightAsc.length > 1 ? first : null);
  const change =
    current && past && past.id !== current.id
      ? current.weightKg - past.weightKg
      : null;
  const changePct =
    current && past && past.id !== current.id
      ? percentChange(past.weightKg, current.weightKg)
      : null;

  const goal =
    profile.targetWeightKg != null && current && first
      ? weightGoalProgress(
          first.weightKg,
          current.weightKg,
          profile.targetWeightKg,
        )
      : null;

  const missing: string[] = [];
  if (!height) missing.push("altura");
  if (!profile.sex) missing.push("sexo");
  if (age == null) missing.push("data de nascimento");
  if (!profile.activityLevel) missing.push("nível de atividade");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-prose text-sm text-muted-foreground">
          Registre o seu peso e as suas medidas para acompanhar a evolução e ver
          as estimativas de IMC, metabolismo e gasto calórico.
        </p>
        <MetricsActions />
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard
          label="Peso atual"
          value={current ? formatNumber(current.weightKg) : "—"}
          unit={current ? "kg" : undefined}
          hint={
            current
              ? `Registro de ${formatDateBR(current.date)}`
              : "Nenhum peso registrado"
          }
        />

        <StatCard
          label="IMC"
          value={bmiValue != null ? formatNumber(bmiValue) : "—"}
          badge={band?.label}
          badgeTone={band?.tone}
          hint={
            bmiValue == null
              ? height
                ? "Registre o seu peso"
                : "Informe a sua altura no perfil"
              : "Peso ÷ altura²"
          }
        />

        <StatCard
          label="Variação"
          value={
            change == null
              ? "—"
              : `${change > 0 ? "+" : change < 0 ? "−" : ""}${formatNumber(Math.abs(change))}`
          }
          unit={change == null ? undefined : "kg"}
          hint={
            change == null
              ? "Precisa de 2 registros"
              : changePct != null
                ? `${changePct > 0 ? "+" : "−"}${formatNumber(Math.abs(changePct))}% vs. ~30 dias atrás`
                : "vs. ~30 dias atrás"
          }
        />

        <StatCard
          label="TMB estimada"
          value={bmrValue != null ? formatKcal(bmrValue) : "—"}
          hint={
            bmrValue != null
              ? "Estimativa (Mifflin-St Jeor)"
              : "Complete o perfil"
          }
        />

        <StatCard
          label="Gasto diário (GET)"
          value={tdeeValue != null ? formatKcal(tdeeValue) : "—"}
          hint={
            tdeeValue != null
              ? "Estimativa · TMB × atividade"
              : "Complete o perfil"
          }
        />

        {goal ? (
          <StatCard
            label={`Meta · ${GOAL_TYPE_LABELS[profile.goalType ?? "MAINTAIN_WEIGHT"]}`}
            value={`${goal.percent}%`}
            badgeTone="success"
            hint={
              <>
                <Progress value={goal.percent} className="mt-1 h-1.5" />
                <span className="mt-1.5 block">
                  {goal.remainingKg > 0.1
                    ? `Faltam ${formatNumber(goal.remainingKg)} kg para ${formatNumber(profile.targetWeightKg ?? 0)} kg`
                    : goal.remainingKg < -0.1
                      ? `${formatNumber(Math.abs(goal.remainingKg))} kg além da meta`
                      : "Meta atingida 🎉"}
                </span>
              </>
            }
          />
        ) : (
          <StatCard
            label="Meta de peso"
            value="—"
            hint="Defina um peso-meta no perfil"
          />
        )}
      </section>

      {missing.length > 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex items-start gap-3 py-4 text-sm">
            <InfoIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <p className="text-muted-foreground">
              Para ver a TMB e o gasto diário, complete no seu perfil:{" "}
              <span className="font-medium text-foreground">
                {missing.join(", ")}
              </span>
              .
            </p>
          </CardContent>
        </Card>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-sm font-semibold">Histórico</h2>
          <Link
            href="/evolucao"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Ver gráficos
            <ArrowRightIcon />
          </Link>
        </div>
        <HistorySection
          weightEntries={weightDesc}
          measurementEntries={measurementsDesc}
        />
      </section>

      <p className="text-xs text-muted-foreground">
        IMC, TMB e gasto diário são estimativas baseadas em fórmulas
        populacionais e não substituem a avaliação de um profissional de saúde.
      </p>
    </div>
  );
}
