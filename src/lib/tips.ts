import { formatNumber } from "@/lib/metrics";

export type Tip = {
  id: string;
  title: string;
  text: string;
  tone: "info" | "success" | "warning";
  href?: string;
  cta?: string;
};

export type TipsContext = {
  daysSinceWeight: number | null;
  daysSinceMeasurement: number | null;
  weightGoalPercent: number | null;
  weightGoalAchieved: boolean;
  workoutsThisWeek: number;
  weeklyAverage: number;
  activeGoalCount: number;
  yesterdayCalories: number | null;
  targetCalories: number | null;
  yesterdayProtein: number | null;
  targetProtein: number | null;
  topProgressExercise: { name: string; deltaKg: number } | null;
};

/**
 * Gera dicas de acompanhamento a partir de regras simples sobre os dados
 * registrados. Não é diagnóstico — só ajuda a manter a consistência.
 */
export function buildTips(ctx: TipsContext): Tip[] {
  const tips: Tip[] = [];

  if (ctx.daysSinceWeight != null && ctx.daysSinceWeight >= 10) {
    tips.push({
      id: "weight-stale",
      title: "Faz tempo sem pesar",
      text: `Você não registra o peso há ${ctx.daysSinceWeight} dias. Uma pesagem por semana já dá uma boa tendência.`,
      tone: "warning",
      href: "/medidas",
      cta: "Registrar peso",
    });
  }

  if (ctx.weightGoalAchieved) {
    tips.push({
      id: "weight-goal-done",
      title: "Peso-meta alcançado! 🎉",
      text: "Você chegou ao peso que definiu. Que tal revisar a meta ou definir uma nova?",
      tone: "success",
      href: "/metas",
      cta: "Ver metas",
    });
  } else if (
    ctx.weightGoalPercent != null &&
    ctx.weightGoalPercent >= 25 &&
    ctx.weightGoalPercent < 100
  ) {
    tips.push({
      id: "weight-goal-progress",
      title: "Você está avançando",
      text: `Já percorreu ${ctx.weightGoalPercent}% do caminho até o seu peso-meta. Mantendo o ritmo, chega lá.`,
      tone: "success",
      href: "/evolucao",
      cta: "Ver evolução",
    });
  }

  if (ctx.weeklyAverage >= 1) {
    if (ctx.workoutsThisWeek + 1 < ctx.weeklyAverage) {
      tips.push({
        id: "frequency-down",
        title: "Semana mais fraca de treino",
        text: `Você treinou ${ctx.workoutsThisWeek}× esta semana, abaixo da sua média de ${formatNumber(ctx.weeklyAverage)}/semana.`,
        tone: "warning",
        href: "/treinos",
        cta: "Ver treinos",
      });
    } else if (ctx.workoutsThisWeek >= Math.round(ctx.weeklyAverage)) {
      tips.push({
        id: "frequency-ok",
        title: "Frequência em dia",
        text: `${ctx.workoutsThisWeek} treinos esta semana — você está mantendo a média.`,
        tone: "success",
      });
    }
  }

  if (ctx.daysSinceMeasurement != null && ctx.daysSinceMeasurement >= 30) {
    tips.push({
      id: "measurement-stale",
      title: "Hora de medir de novo",
      text: `Faz ${ctx.daysSinceMeasurement} dias que você não registra as circunferências. Elas mostram mudanças que a balança não pega.`,
      tone: "info",
      href: "/medidas",
      cta: "Registrar medidas",
    });
  }

  if (ctx.topProgressExercise && ctx.topProgressExercise.deltaKg >= 2.5) {
    tips.push({
      id: "exercise-progress",
      title: "Carga subindo",
      text: `Sua carga em ${ctx.topProgressExercise.name} aumentou ${formatNumber(ctx.topProgressExercise.deltaKg)} kg no último mês. Boa progressão!`,
      tone: "success",
      href: "/treinos",
      cta: "Ver por exercício",
    });
  }

  if (
    ctx.targetCalories != null &&
    ctx.yesterdayCalories != null &&
    ctx.yesterdayCalories > 0 &&
    ctx.yesterdayCalories < ctx.targetCalories * 0.6
  ) {
    tips.push({
      id: "calories-low",
      title: "Consumo de ontem baixo",
      text: `Ontem você registrou ${formatNumber(ctx.yesterdayCalories, 0)} kcal, bem abaixo da meta de ${ctx.targetCalories}. Pode ter faltado lançar alguma refeição.`,
      tone: "info",
      href: "/alimentacao",
      cta: "Conferir alimentação",
    });
  }

  if (
    ctx.targetProtein != null &&
    ctx.yesterdayProtein != null &&
    ctx.yesterdayCalories != null &&
    ctx.yesterdayCalories > 0 &&
    ctx.yesterdayProtein < ctx.targetProtein * 0.8
  ) {
    tips.push({
      id: "protein-low",
      title: "Proteína abaixo da meta",
      text: `Ontem foram ${formatNumber(ctx.yesterdayProtein, 0)} g de proteína, contra a meta de ${ctx.targetProtein} g.`,
      tone: "info",
      href: "/alimentacao",
    });
  }

  if (ctx.activeGoalCount === 0) {
    tips.push({
      id: "no-goals",
      title: "Defina uma meta",
      text: "Metas ajudam a manter o foco. Você pode criar uma de peso, medida, carga ou frequência.",
      tone: "info",
      href: "/metas",
      cta: "Criar meta",
    });
  }

  if (tips.length === 0) {
    tips.push({
      id: "keep-going",
      title: "Continue registrando",
      text: "Quanto mais dados você registra, mais úteis ficam os acompanhamentos aqui.",
      tone: "info",
    });
  }

  return tips;
}
