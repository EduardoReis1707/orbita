import { prisma } from "@/lib/prisma";
import {
  ageInYears,
  basalMetabolicRate,
  bmi,
  bmiBand,
  totalDailyEnergyExpenditure,
  weightGoalProgress,
} from "@/lib/metrics";
import {
  ACTIVITY_LEVEL_LABELS,
  GOAL_TYPE_LABELS,
  SEX_LABELS,
} from "@/lib/profile";
import { computeGoalProgress, GOAL_METRIC_LABELS } from "@/lib/goals";
import { buildGoalLiveValueResolver } from "@/lib/goal-live-value";
import { todayISO } from "@/lib/date";

export const ASSISTANT_SYSTEM_PROMPT = `Você é o assistente do "Auxiliar de Treino", um app pessoal de acompanhamento de treino, alimentação, metas e evolução física.

Responda em português do Brasil, de forma curta, prática e direta. Use os dados do usuário fornecidos no contexto para dar respostas relevantes (ex.: sugerir substituições de alimentos com macros parecidos, comentar a frequência de treino, ajudar a ajustar metas).

Você tem ferramentas para agir pelo usuário:
- registrar_peso, registrar_medidas, registrar_treino, registrar_refeicao, criar_meta — quando o usuário pedir para registrar, anotar, adicionar ou criar algo, chame a ferramenta correspondente em vez de só descrever o que fazer.
- consultar_dados — chame quando precisar de números atuais (peso, treinos recentes, calorias do dia, progresso das metas) que não estejam no contexto abaixo.

Regras:
- Ao usar uma ferramenta de registro, confirme por escrito, em uma frase, o que foi salvo e com quais valores.
- Se faltar um dado obrigatório para a ferramenta (ex.: o peso, o nome do exercício), pergunte antes de chamar.
- Quando o usuário não disser a data, use a data de hoje (informada no contexto).
- Você dá orientações gerais de treino e nutrição. Deixe claro, quando fizer sentido, que isso não substitui a avaliação de um nutricionista, médico ou educador físico.
- Não faça diagnóstico médico nem prescreva medicamentos, dietas clínicas ou protocolos para condições de saúde.
- Se faltar informação para responder bem, faça uma pergunta objetiva antes.
- Não invente números do usuário que não estejam no contexto ou no retorno das ferramentas.
- Seja conciso: normalmente 1 a 4 parágrafos curtos ou uma lista breve.`;

/** Monta um resumo compacto dos dados do usuário para o system prompt. */
export async function buildAssistantContext(
  profileId: string,
): Promise<string> {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  weekStart.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [profile, firstWeight, lastWeight, weekWorkouts, todayMeals, goals, resolver] =
    await Promise.all([
      prisma.profile.findUnique({ where: { id: profileId } }),
      prisma.weightEntry.findFirst({
        where: { profileId },
        orderBy: { date: "asc" },
      }),
      prisma.weightEntry.findFirst({
        where: { profileId },
        orderBy: { date: "desc" },
      }),
      prisma.workout.count({
        where: {
          profileId,
          status: "COMPLETED",
          date: { gte: weekStart },
        },
      }),
      prisma.meal.findMany({
        where: { profileId, date: today },
        include: { items: { select: { calories: true, proteinG: true } } },
      }),
      prisma.goal.findMany({
        where: { profileId, status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      buildGoalLiveValueResolver(profileId),
    ]);

  if (!profile) return "Sem dados de perfil.";

  const lines: string[] = ["## Dados do usuário", `- Data de hoje: ${todayISO()}`];

  const age = profile.birthDate ? ageInYears(profile.birthDate) : null;
  lines.push(
    `- Nome: ${profile.fullName}`,
    `- Objetivo: ${profile.goalType ? GOAL_TYPE_LABELS[profile.goalType] : "não definido"}`,
  );
  if (profile.sex) lines.push(`- Sexo: ${SEX_LABELS[profile.sex]}`);
  if (age != null) lines.push(`- Idade: ${age} anos`);
  if (profile.heightCm) lines.push(`- Altura: ${profile.heightCm} cm`);
  if (profile.activityLevel) {
    lines.push(
      `- Nível de atividade: ${ACTIVITY_LEVEL_LABELS[profile.activityLevel]}`,
    );
  }

  if (lastWeight) {
    const line = [`- Peso atual: ${lastWeight.weightKg} kg`];
    if (profile.heightCm) {
      const value = bmi(lastWeight.weightKg, profile.heightCm);
      line.push(`(IMC ${value.toFixed(1)}, ${bmiBand(value).label})`);
    }
    lines.push(line.join(" "));
  }
  if (profile.targetWeightKg) {
    lines.push(`- Peso-meta: ${profile.targetWeightKg} kg`);
    if (firstWeight && lastWeight) {
      const p = weightGoalProgress(
        firstWeight.weightKg,
        lastWeight.weightKg,
        profile.targetWeightKg,
      );
      lines.push(`- Progresso rumo ao peso-meta: ${p.percent}%`);
    }
  }

  if (
    lastWeight &&
    profile.heightCm &&
    profile.sex &&
    age != null &&
    profile.activityLevel
  ) {
    const bmr = basalMetabolicRate({
      sex: profile.sex,
      weightKg: lastWeight.weightKg,
      heightCm: profile.heightCm,
      ageYears: age,
    });
    lines.push(
      `- TMB estimada: ${Math.round(bmr)} kcal/dia`,
      `- Gasto diário estimado (GET): ${Math.round(
        totalDailyEnergyExpenditure(bmr, profile.activityLevel),
      )} kcal/dia`,
    );
  }

  if (profile.targetCalories) {
    lines.push(
      `- Metas de nutrição: ${profile.targetCalories} kcal, ${profile.targetProteinG ?? "?"} g proteína, ${profile.targetCarbsG ?? "?"} g carbo, ${profile.targetFatG ?? "?"} g gordura`,
    );
  }

  const items = todayMeals.flatMap((m) => m.items);
  if (items.length > 0) {
    const kcal = items.reduce((s, i) => s + (i.calories ?? 0), 0);
    const protein = items.reduce((s, i) => s + (i.proteinG ?? 0), 0);
    lines.push(
      `- Consumo de hoje até agora: ${Math.round(kcal)} kcal, ${Math.round(protein)} g de proteína`,
    );
  }

  lines.push(`- Treinos realizados nesta semana: ${weekWorkouts}`);

  if (goals.length > 0) {
    lines.push("- Metas ativas:");
    for (const goal of goals) {
      const progress = computeGoalProgress(
        goal,
        resolver.liveValue(goal.metric, goal.metricKey),
      );
      lines.push(
        `  - ${goal.title} (${GOAL_METRIC_LABELS[goal.metric]}): ${progress.percent}%`,
      );
    }
  }

  return lines.join("\n");
}
