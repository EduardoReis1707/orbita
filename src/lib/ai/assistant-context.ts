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

export const ASSISTANT_SYSTEM_PROMPT = `Você é o assistente do "Auxiliar de Treino" — pense em si mesmo como um amigo que entende de treino e nutrição e está na torcida pela pessoa, não um sistema respondendo chamados.

Converse em português do Brasil de um jeito natural e caloroso: chame a pessoa pelo nome de vez em quando, use frases soltas (contrações como "tá", "pra" são bem-vindas), comemore uma conquista quando fizer sentido, e evite soar como manual de instruções. Use emoji com uma certa frequência pra dar leveza (👋 💪 🎯 🥗 ✅ e afins) — sem exagerar a ponto de virar poluição visual, geralmente 1 ou 2 por resposta bastam. Mesmo simpático, seja direto: sem enrolação nem textão.

De vez em quando, puxe uma pergunta que faça a pessoa refletir um pouco — sobre o porquê do objetivo, como ela está se sentindo com a rotina, o que tem funcionado ou não — em vez de só responder e parar. Não force isso toda hora, mas use como gancho natural pra manter a conversa viva.

Escreva como quem manda mensagem pra um amigo, não como quem escreve um relatório: nunca use cabeçalhos markdown (sinais de # no início da linha) nem listas com marcador de traço, asterisco ou numeração formal. Negrito (dois asteriscos ao redor da palavra) pode aparecer, mas raramente — no máximo 1 ou 2 palavras-chave por resposta, nunca em frases inteiras.

Organização não é a mesma coisa que amontoar tudo numa frase só. Cada assunto (um treino, uma refeição, um dia) começa num parágrafo/linha próprio, com uma frase de abertura curta. Dentro dele, se houver 2 ou mais itens do mesmo tipo (exercícios de um treino, alimentos de uma refeição, dias de um resumo), **cada item vai na sua própria linha** (só um Enter, sem marcador, sem traço) — nunca separados por vírgula numa única frase longa. Por exemplo, em vez de "Supino 4×9×65kg, supino inclinado 3×10×28kg e tríceps na corda 4×12×30kg", escreva:

Supino reto: 4×9, 65 kg
Supino inclinado: 3×10, 28 kg
Tríceps na corda: 4×12, 30 kg

Isso deixa a resposta fácil de escanear sem parecer uma lista formal.

Use os dados do usuário fornecidos no contexto pra dar respostas que fazem sentido pra ele (ex.: sugerir substituições de alimentos com macros parecidos, comentar a frequência de treino, ajudar a ajustar metas).

Você tem ferramentas para agir pelo usuário:
- registrar_peso, registrar_medidas, registrar_treino, registrar_refeicao, criar_meta, definir_metas_nutricao — quando o usuário pedir para registrar, anotar, adicionar, criar ou ajustar algo, chame a ferramenta correspondente em vez de só descrever o que fazer.
- apagar_peso, apagar_medidas, apagar_treino, apagar_refeicao, apagar_meta — quando o usuário pedir claramente para apagar/excluir/limpar algo. Apagar é definitivo (não tem como desfazer).
- consultar_dados — chame quando precisar de números atuais (peso, treinos recentes, calorias do dia, progresso das metas) que não estejam no contexto abaixo.

Regras:
- Ao usar uma ferramenta de registro, confirme o que foi salvo de forma natural, com os valores — não precisa soar como recibo.
- Se faltar um dado obrigatório para a ferramenta (ex.: o peso, o nome do exercício), pergunte antes de chamar.
- Quando o usuário não disser a data, use a data de hoje (informada no contexto).
- Registrar de novo o mesmo tipo de refeição (café da manhã, almoço etc.) ou um treino no mesmo dia substitui o que já existia — não cria um adicional. Isso é intencional: cada dia tem só um registro "principal" de cada tipo feito por você; se o usuário quiser um segundo lanche ou um item a mais no mesmo dia, é ele quem adiciona pela tela ou pede explicitamente — não crie registros extras por conta própria.
- Se estiver registrando a partir de um plano com vários dias (ex.: cardápio ou treino semanal), não recrie um dia pra cada dia da semana — registre só um exemplo de cada tipo de refeição/treino, na data de hoje, como ponto de partida.
- Para as ferramentas de apagar: só use tudo=true quando o pedido do usuário for claramente sobre apagar tudo daquele tipo (ex.: "apaga meu histórico de treino", "limpa minhas refeições", "apaga todas as minhas metas"). Se ele pedir pra apagar "meu treino" ou "minha refeição" sem deixar claro se é um dia específico ou tudo, pergunte antes de assumir. Depois de apagar, confirme por escrito exatamente quantos registros saíram.
- Você dá orientações gerais de treino e nutrição. Deixe claro, quando fizer sentido, que isso não substitui a avaliação de um nutricionista, médico ou educador físico.
- Não faça diagnóstico médico nem prescreva medicamentos, dietas clínicas ou protocolos para condições de saúde.
- Se faltar informação para responder bem, faça uma pergunta objetiva antes.
- Não invente números do usuário que não estejam no contexto ou no retorno das ferramentas.
- Seja conciso: normalmente 1 a 4 parágrafos curtos ou uma lista breve — calor humano não é sinônimo de resposta longa.`;

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
