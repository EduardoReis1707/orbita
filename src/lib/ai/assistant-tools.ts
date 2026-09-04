import { revalidatePath } from "next/cache";
import type { GoalMetric, MealType, WorkoutStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { formatDateBR, parseISODate, toISODate } from "@/lib/date";
import { bmi, bmiBand } from "@/lib/metrics";
import {
  computeGoalProgress,
  GOAL_METRIC_LABELS,
  goalUnit,
} from "@/lib/goals";
import { buildGoalLiveValueResolver } from "@/lib/goal-live-value";
import {
  MEAL_TYPE_LABELS,
  MEAL_TYPE_ORDER,
  sumFoodItems,
} from "@/lib/nutrition";
import {
  MEASUREMENT_FIELDS,
  type MeasurementKey,
} from "@/lib/measurements";
import { ACTIVITY_LEVEL_LABELS, GOAL_TYPE_LABELS } from "@/lib/profile";
import { MUSCLE_GROUPS } from "@/lib/workouts";
import {
  clampInt,
  clampNumber,
  normalize,
  numberInRange,
  parseDateOrToday,
  pickEnum,
  round1,
  trimTo,
} from "@/lib/ai/coerce";

/**
 * Ferramentas ("function calling") que o assistente do chat pode executar para
 * registrar dados do usuário. Espelham as regras de validação das telas de
 * medidas, treinos, alimentação e metas (os respectivos `actions.ts` e
 * `import-actions.ts`). Toda escrita usa o `profileId` da sessão — o modelo
 * nunca informa de quem é o dado.
 */

export type ToolContext = { profileId: string };

export type ToolResult = {
  /** true = ação concluída; false = nada foi gravado (motivo em `summary`). */
  ok: boolean;
  /** frase curta em pt-BR: vira o "chip" no chat e volta para o modelo. */
  summary: string;
  /** payload estruturado devolvido ao modelo (ex.: leitura de dados). */
  data?: Record<string, unknown>;
};

type ToolArgs = Record<string, unknown>;

export type AssistantTool = {
  name: string;
  description: string;
  /** JSON Schema estilo Anthropic (convertido para o Gemini em runtime). */
  parameters?: Record<string, unknown>;
  execute: (args: ToolArgs, ctx: ToolContext) => Promise<ToolResult>;
};

// --- helpers de schema ------------------------------------------------------

const optDate = {
  type: ["string", "null"],
  description:
    "Data no formato AAAA-MM-DD. Se o usuário não disser, use null (será hoje).",
};
const optText = (description: string) => ({
  type: ["string", "null"],
  description,
});
const num = (description: string) => ({ type: "number", description });
const optNum = (description: string) => ({
  type: ["number", "null"],
  description,
});

/**
 * Um campo é obrigatório quando seu `type` é uma string simples (`num`,
 * `{type:"string",...}`); é opcional quando `type` é `[X, "null"]` (`optDate`,
 * `optText`, `optNum`). A Groq valida `tools` de forma estrita: uma chave em
 * `required` tem que aparecer no JSON gerado, mesmo que anulável — por isso
 * só entram aqui os campos de verdade obrigatórios, nunca os opcionais.
 */
function objectSchema(properties: Record<string, unknown>) {
  const required = Object.entries(properties)
    .filter(([, schema]) => typeof (schema as { type?: unknown }).type === "string")
    .map(([key]) => key);
  return {
    type: "object",
    additionalProperties: false,
    required,
    properties,
  };
}

// --- helpers de formatação -----------------------------------------------

const nf1 = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const kg = (value: number) => `${nf1.format(value)} kg`;
const cm = (value: number) => `${nf1.format(value)} cm`;

function revalidate(paths: string[]): void {
  for (const path of paths) revalidatePath(path);
}

// --- mapeamentos de rótulo -> enum do banco -----------------------------

const MEAL_TYPE_BY_LABEL = new Map<string, MealType>();
for (const type of MEAL_TYPE_ORDER) {
  MEAL_TYPE_BY_LABEL.set(normalize(MEAL_TYPE_LABELS[type]), type);
  MEAL_TYPE_BY_LABEL.set(normalize(type), type);
}
MEAL_TYPE_BY_LABEL.set("cafe", "BREAKFAST");
MEAL_TYPE_BY_LABEL.set("lanche", "AFTERNOON_SNACK");

function mapMealType(value: unknown): MealType {
  if (typeof value !== "string") return "OTHER";
  return MEAL_TYPE_BY_LABEL.get(normalize(value)) ?? "OTHER";
}

const GOAL_METRIC_BY_LABEL = new Map<string, GoalMetric>();
for (const metric of Object.keys(GOAL_METRIC_LABELS) as GoalMetric[]) {
  GOAL_METRIC_BY_LABEL.set(normalize(GOAL_METRIC_LABELS[metric]), metric);
  GOAL_METRIC_BY_LABEL.set(normalize(metric), metric);
}
for (const [alias, metric] of [
  ["peso", "WEIGHT"],
  ["gordura", "BODY_FAT"],
  ["percentual de gordura", "BODY_FAT"],
  ["circunferencia", "MEASUREMENT"],
  ["medida", "MEASUREMENT"],
  ["carga", "EXERCISE_LOAD"],
  ["exercicio", "EXERCISE_LOAD"],
  ["frequencia", "WORKOUT_FREQUENCY"],
  ["frequencia de treino", "WORKOUT_FREQUENCY"],
  ["personalizada", "CUSTOM"],
  ["outra", "CUSTOM"],
] as const) {
  GOAL_METRIC_BY_LABEL.set(alias, metric);
}

function mapGoalMetric(value: unknown): GoalMetric | null {
  if (typeof value !== "string") return null;
  return GOAL_METRIC_BY_LABEL.get(normalize(value)) ?? null;
}

const WORKOUT_STATUS_BY_LABEL: Record<string, WorkoutStatus> = {
  planejado: "PLANNED",
  planned: "PLANNED",
  "a fazer": "PLANNED",
  realizado: "COMPLETED",
  feito: "COMPLETED",
  concluido: "COMPLETED",
  completed: "COMPLETED",
  "nao feito": "SKIPPED",
  pulado: "SKIPPED",
  skipped: "SKIPPED",
};

function mapWorkoutStatus(value: unknown): WorkoutStatus {
  if (typeof value !== "string") return "COMPLETED";
  return WORKOUT_STATUS_BY_LABEL[normalize(value)] ?? "COMPLETED";
}

/** args de medida (pt) -> coluna do banco. */
const MEASUREMENT_ARG_TO_KEY: Record<string, MeasurementKey> = {
  pescoco: "neckCm",
  torax: "chestCm",
  peito: "chestCm",
  cintura: "waistCm",
  quadril: "hipCm",
  braco: "armCm",
  coxa: "thighCm",
  panturrilha: "calfCm",
};

const MEASUREMENT_LABEL = new Map<MeasurementKey, string>(
  MEASUREMENT_FIELDS.map((field) => [field.key, field.label]),
);

function mapMeasurementKey(value: unknown): MeasurementKey | null {
  if (typeof value !== "string") return null;
  const norm = normalize(value);
  if (MEASUREMENT_ARG_TO_KEY[norm]) return MEASUREMENT_ARG_TO_KEY[norm];
  const byLabel = MEASUREMENT_FIELDS.find(
    (field) => normalize(field.label) === norm,
  );
  if (byLabel) return byLabel.key;
  return MEASUREMENT_FIELDS.some((field) => field.key === value)
    ? (value as MeasurementKey)
    : null;
}

// --- ferramentas ---------------------------------------------------------

const registrarPeso: AssistantTool = {
  name: "registrar_peso",
  description:
    "Registra (ou atualiza) o peso corporal do usuário em uma data. Um registro por dia.",
  parameters: objectSchema({
    data: optDate,
    pesoKg: num("Peso em quilogramas, entre 20 e 400."),
    nota: optText("Observação curta, ou null."),
  }),
  async execute(args, ctx) {
    const date = parseDateOrToday(args.data);
    const weightKg = numberInRange(args.pesoKg, 20, 400, 1);
    if (weightKg == null) {
      return {
        ok: false,
        summary: "Não registrei o peso: informe um valor entre 20 e 400 kg.",
      };
    }
    const note = trimTo(args.nota, 500);
    await prisma.weightEntry.upsert({
      where: { profileId_date: { profileId: ctx.profileId, date } },
      create: { profileId: ctx.profileId, date, weightKg, note },
      update: { weightKg, note: note ?? undefined },
    });
    revalidate(["/medidas", "/evolucao", "/painel"]);
    return {
      ok: true,
      summary: `Peso de ${kg(weightKg)} registrado em ${formatDateBR(date)}.`,
      data: { date: toISODate(date), weightKg },
    };
  },
};

const registrarMedidas: AssistantTool = {
  name: "registrar_medidas",
  description:
    "Registra (ou atualiza) circunferências corporais e/ou percentual de gordura em uma data. Informe ao menos um valor.",
  parameters: objectSchema({
    data: optDate,
    pescoco: optNum("Pescoço em cm (10–300)."),
    torax: optNum("Peito/tórax em cm (10–300)."),
    cintura: optNum("Cintura em cm (10–300)."),
    quadril: optNum("Quadril em cm (10–300)."),
    braco: optNum("Braço em cm (10–300)."),
    coxa: optNum("Coxa em cm (10–300)."),
    panturrilha: optNum("Panturrilha em cm (10–300)."),
    percentualGordura: optNum("Percentual de gordura (1–70)."),
    nota: optText("Observação curta, ou null."),
  }),
  async execute(args, ctx) {
    const date = parseDateOrToday(args.data);
    const values: Partial<Record<MeasurementKey | "bodyFatPct", number>> = {};
    const registered: string[] = [];
    const rejected: string[] = [];

    for (const [arg, key] of Object.entries(MEASUREMENT_ARG_TO_KEY)) {
      if (!(arg in args) || args[arg] == null) continue;
      const value = numberInRange(args[arg], 10, 300, 1);
      if (value != null && values[key] == null) {
        values[key] = value;
        registered.push(`${MEASUREMENT_LABEL.get(key)} ${cm(value)}`);
      } else if (value == null) {
        rejected.push(`${MEASUREMENT_LABEL.get(key)} (fora de 10–300 cm)`);
      }
    }
    if ("percentualGordura" in args && args.percentualGordura != null) {
      const bodyFat = numberInRange(args.percentualGordura, 1, 70, 1);
      if (bodyFat != null) {
        values.bodyFatPct = bodyFat;
        registered.push(`gordura ${nf1.format(bodyFat)}%`);
      } else {
        rejected.push("percentual de gordura (fora de 1–70%)");
      }
    }

    if (registered.length === 0) {
      return {
        ok: false,
        summary:
          rejected.length > 0
            ? `Não registrei nenhuma medida: valor(es) fora da faixa esperada — ${rejected.join(", ")}.`
            : "Não registrei as medidas: informe ao menos uma circunferência válida ou o percentual de gordura.",
      };
    }

    const note = trimTo(args.nota, 500);
    await prisma.measurementEntry.upsert({
      where: { profileId_date: { profileId: ctx.profileId, date } },
      create: { profileId: ctx.profileId, date, note, ...values },
      update: { note: note ?? undefined, ...values },
    });
    revalidate(["/medidas", "/evolucao", "/painel"]);
    const rejectedNote =
      rejected.length > 0 ? ` (ignorado por estar fora da faixa: ${rejected.join(", ")})` : "";
    return {
      ok: true,
      summary: `Medidas de ${formatDateBR(date)} registradas: ${registered.join(", ")}.${rejectedNote}`,
      data: { date: toISODate(date), ...values },
    };
  },
};

const registrarTreino: AssistantTool = {
  name: "registrar_treino",
  description:
    "Registra um treino do usuário, opcionalmente com os exercícios realizados.",
  parameters: objectSchema({
    nome: {
      type: "string",
      description: 'Nome do treino, ex.: "Treino de pernas".',
    },
    data: optDate,
    duracaoMin: optNum("Duração em minutos (1–600)."),
    status: optText(
      'Um de: "realizado" (padrão), "planejado", "não feito".',
    ),
    gruposMusculares: {
      type: ["array", "null"],
      description: `Grupos musculares. Use apenas: ${MUSCLE_GROUPS.join(", ")}.`,
      items: { type: "string" },
    },
    exercicios: {
      type: ["array", "null"],
      description: "Exercícios do treino, na ordem executada.",
      items: objectSchema({
        nome: { type: "string", description: "Nome do exercício." },
        series: optNum("Número de séries (1–50)."),
        repeticoes: optNum("Repetições por série (1–500)."),
        cargaKg: optNum("Carga em kg (0–1000)."),
        descansoSeg: optNum("Descanso entre séries em segundos (0–3600)."),
        nota: optText("Observação curta, ou null."),
      }),
    },
    nota: optText("Observação sobre o treino, ou null."),
  }),
  async execute(args, ctx) {
    const name = trimTo(args.nome, 120) ?? "Treino";
    const date = parseDateOrToday(args.data);
    const durationMin = clampInt(args.duracaoMin, 1, 600);
    const status = mapWorkoutStatus(args.status);

    const muscleGroups = Array.isArray(args.gruposMusculares)
      ? Array.from(
          new Set(
            args.gruposMusculares
              .map((group) => pickEnum(group, MUSCLE_GROUPS))
              .filter((group): group is (typeof MUSCLE_GROUPS)[number] =>
                Boolean(group),
              ),
          ),
        )
      : [];

    const rawExercises = Array.isArray(args.exercicios) ? args.exercicios : [];
    const exercises = rawExercises
      .slice(0, 60)
      .map((raw, index) => {
        const ex = (raw ?? {}) as ToolArgs;
        return {
          name: trimTo(ex.nome, 120) ?? `Exercício ${index + 1}`,
          position: index,
          sets: clampInt(ex.series, 1, 50),
          reps: clampInt(ex.repeticoes, 1, 500),
          weightKg: clampNumber(ex.cargaKg, 0, 1000, 1),
          restSec: clampInt(ex.descansoSeg, 0, 3600),
          note: trimTo(ex.nota, 300),
        };
      });

    await prisma.workout.create({
      data: {
        profileId: ctx.profileId,
        name,
        date,
        status,
        durationMin,
        muscleGroups,
        note: trimTo(args.nota, 300),
        exercises: { create: exercises },
      },
    });
    revalidate(["/treinos", "/painel"]);

    const extra = exercises.length
      ? ` com ${exercises.length} exercício${exercises.length === 1 ? "" : "s"}`
      : "";
    return {
      ok: true,
      summary: `Treino "${name}" registrado em ${formatDateBR(date)}${extra}.`,
      data: {
        date: toISODate(date),
        status,
        muscleGroups,
        exercises: exercises.length,
      },
    };
  },
};

const registrarRefeicao: AssistantTool = {
  name: "registrar_refeicao",
  description:
    "Registra uma refeição do usuário com seus alimentos. Informe calorias/macros só se souber; deixe null caso contrário.",
  parameters: objectSchema({
    tipo: {
      type: "string",
      description:
        'Momento: "café da manhã", "lanche da manhã", "almoço", "lanche da tarde", "jantar", "ceia" ou "outro".',
    },
    data: optDate,
    horario: optText('Horário HH:MM, ou null.'),
    itens: {
      type: "array",
      description: "Alimentos da refeição. Pelo menos um.",
      items: objectSchema({
        nome: { type: "string", description: "Nome do alimento." },
        quantidade: optText('Quantidade como texto, ex.: "150 g", "1 unidade".'),
        calorias: optNum("Calorias (kcal), 0–10000, ou null."),
        proteinaG: optNum("Proteína em g, 0–2000, ou null."),
        carboidratoG: optNum("Carboidrato em g, 0–2000, ou null."),
        gorduraG: optNum("Gordura em g, 0–2000, ou null."),
      }),
    },
    nota: optText("Observação sobre a refeição, ou null."),
  }),
  async execute(args, ctx) {
    const type = mapMealType(args.tipo);
    const date = parseDateOrToday(args.data);
    const time =
      typeof args.horario === "string" && /^\d{2}:\d{2}$/.test(args.horario.trim())
        ? args.horario.trim()
        : null;

    const rawItems = Array.isArray(args.itens) ? args.itens : [];
    const items = rawItems
      .slice(0, 40)
      .map((raw, index) => {
        const it = (raw ?? {}) as ToolArgs;
        return {
          name: trimTo(it.nome, 120) ?? `Alimento ${index + 1}`,
          position: index,
          quantity: trimTo(it.quantidade, 60),
          calories: clampNumber(it.calorias, 0, 10000, 1),
          proteinG: clampNumber(it.proteinaG, 0, 2000, 1),
          carbsG: clampNumber(it.carboidratoG, 0, 2000, 1),
          fatG: clampNumber(it.gorduraG, 0, 2000, 1),
        };
      });

    if (items.length === 0) {
      return {
        ok: false,
        summary: "Não registrei a refeição: liste ao menos um alimento.",
      };
    }

    await prisma.meal.create({
      data: {
        profileId: ctx.profileId,
        date,
        type,
        time,
        note: trimTo(args.nota, 200),
        items: { create: items },
      },
    });
    revalidate(["/alimentacao", "/painel"]);

    const kcal = items.reduce((sum, item) => sum + (item.calories ?? 0), 0);
    const kcalText = kcal > 0 ? `, ~${Math.round(kcal)} kcal` : "";
    return {
      ok: true,
      summary: `${MEAL_TYPE_LABELS[type]} de ${formatDateBR(date)} ${type === "SUPPER" ? "registrada" : "registrado"} com ${items.length} item${items.length === 1 ? "" : "s"}${kcalText}.`,
      data: {
        date: toISODate(date),
        type,
        items: items.map((item) => item.name),
        calorias: Math.round(kcal) || null,
      },
    };
  },
};

const criarMeta: AssistantTool = {
  name: "criar_meta",
  description:
    "Cria uma meta acompanhável. O progresso é calculado a partir dos registros (peso, gordura, circunferência, carga de exercício, frequência) ou é manual (personalizada).",
  parameters: objectSchema({
    titulo: { type: "string", description: "Nome curto da meta." },
    metrica: {
      type: "string",
      description:
        'Uma de: "peso", "percentual de gordura", "circunferência", "carga de um exercício", "frequência de treino", "personalizada".',
    },
    chaveMetrica: optText(
      'Para "circunferência": qual (cintura, quadril, braço, coxa, panturrilha, pescoço, tórax). Para "carga de um exercício": o nome do exercício. Senão null.',
    ),
    valorInicial: num("Valor de partida (situação atual)."),
    valorDesejado: num("Valor que se quer atingir. Diferente do inicial."),
    prazo: optText("Data-limite AAAA-MM-DD, ou null."),
    descricao: optText("Detalhe opcional, ou null."),
  }),
  async execute(args, ctx) {
    const title = trimTo(args.titulo, 120);
    if (!title) {
      return { ok: false, summary: "Não criei a meta: informe um título." };
    }
    const metric = mapGoalMetric(args.metrica);
    if (!metric) {
      return {
        ok: false,
        summary:
          'Não criei a meta: métrica inválida. Use "peso", "percentual de gordura", "circunferência", "carga de um exercício", "frequência de treino" ou "personalizada".',
      };
    }
    const startValue = round1(args.valorInicial);
    const targetValue = round1(args.valorDesejado);
    if (startValue == null || targetValue == null) {
      return {
        ok: false,
        summary:
          "Não criei a meta: informe valores inicial e desejado numéricos.",
      };
    }
    if (Math.abs(startValue - targetValue) < 1e-6) {
      return {
        ok: false,
        summary:
          "Não criei a meta: o valor desejado precisa ser diferente do inicial.",
      };
    }

    let metricKey: string | null = null;
    if (metric === "MEASUREMENT") {
      metricKey = mapMeasurementKey(args.chaveMetrica);
      if (!metricKey) {
        return {
          ok: false,
          summary:
            "Não criei a meta: diga qual circunferência (cintura, quadril, braço, coxa, panturrilha, pescoço ou tórax).",
        };
      }
    } else if (metric === "EXERCISE_LOAD") {
      metricKey = trimTo(args.chaveMetrica, 120);
      if (!metricKey) {
        return {
          ok: false,
          summary: "Não criei a meta: informe o nome do exercício.",
        };
      }
    }

    let deadline: Date | null = null;
    if (typeof args.prazo === "string" && args.prazo.trim()) {
      deadline = parseISODate(args.prazo.trim());
      if (!deadline) {
        return {
          ok: false,
          summary: "Não criei a meta: prazo inválido (use AAAA-MM-DD).",
        };
      }
    }

    await prisma.goal.create({
      data: {
        profileId: ctx.profileId,
        title,
        description: trimTo(args.descricao, 500),
        metric,
        metricKey,
        startValue,
        targetValue,
        currentValue: metric === "CUSTOM" ? startValue : null,
        deadline,
      },
    });
    revalidate(["/metas", "/painel"]);

    const unit = goalUnit(metric);
    const range = `de ${nf1.format(startValue)} para ${nf1.format(targetValue)}${unit ? ` ${unit}` : ""}`;
    return {
      ok: true,
      summary: `Meta "${title}" criada (${GOAL_METRIC_LABELS[metric]}: ${range}).`,
      data: { title, metric, metricKey, startValue, targetValue },
    };
  },
};

const consultarDados: AssistantTool = {
  name: "consultar_dados",
  description:
    "Retorna um retrato atualizado dos dados do usuário: perfil, histórico recente de peso, últimos treinos, alimentação de hoje/semana e progresso das metas. Use quando precisar de números atuais para responder.",
  async execute(_args, ctx) {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    weekStart.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [profile, weights, workouts, todayMeals, weekMeals, goals, resolver] =
      await Promise.all([
        prisma.profile.findUnique({ where: { id: ctx.profileId } }),
        prisma.weightEntry.findMany({
          where: { profileId: ctx.profileId },
          orderBy: { date: "desc" },
          take: 8,
        }),
        prisma.workout.findMany({
          where: { profileId: ctx.profileId },
          orderBy: { date: "desc" },
          take: 5,
          include: { exercises: { orderBy: { position: "asc" } } },
        }),
        prisma.meal.findMany({
          where: { profileId: ctx.profileId, date: today },
          include: { items: true },
        }),
        prisma.meal.findMany({
          where: { profileId: ctx.profileId, date: { gte: weekStart } },
          include: {
            items: {
              select: {
                calories: true,
                proteinG: true,
                carbsG: true,
                fatG: true,
              },
            },
          },
        }),
        prisma.goal.findMany({
          where: { profileId: ctx.profileId, status: "ACTIVE" },
          orderBy: { createdAt: "desc" },
          take: 10,
        }),
        buildGoalLiveValueResolver(ctx.profileId),
      ]);

    const latestWeight = weights[0]?.weightKg ?? null;
    const imcValue =
      latestWeight != null && profile?.heightCm
        ? bmi(latestWeight, profile.heightCm)
        : null;

    const todayTotals = sumFoodItems(todayMeals.flatMap((meal) => meal.items));
    const weekTotals = sumFoodItems(weekMeals.flatMap((meal) => meal.items));

    return {
      ok: true,
      summary: "Dados atuais consultados.",
      data: {
        hoje: toISODate(today),
        perfil: profile
          ? {
              nome: profile.fullName,
              objetivo: profile.goalType
                ? GOAL_TYPE_LABELS[profile.goalType]
                : null,
              altura_cm: profile.heightCm,
              nivel_atividade: profile.activityLevel
                ? ACTIVITY_LEVEL_LABELS[profile.activityLevel]
                : null,
              peso_meta_kg: profile.targetWeightKg,
              metas_nutricao: {
                kcal: profile.targetCalories,
                proteina_g: profile.targetProteinG,
                carbo_g: profile.targetCarbsG,
                gordura_g: profile.targetFatG,
              },
            }
          : null,
        peso: {
          atual_kg: latestWeight,
          imc: imcValue != null ? Number(imcValue.toFixed(1)) : null,
          faixa_imc: imcValue != null ? bmiBand(imcValue).label : null,
          historico: weights.map((entry) => ({
            data: toISODate(entry.date),
            kg: entry.weightKg,
          })),
        },
        treinos_recentes: workouts.map((workout) => ({
          nome: workout.name,
          data: toISODate(workout.date),
          status: workout.status,
          duracao_min: workout.durationMin,
          grupos: workout.muscleGroups,
          exercicios: workout.exercises.map((exercise) => ({
            nome: exercise.name,
            series: exercise.sets,
            repeticoes: exercise.reps,
            carga_kg: exercise.weightKg,
          })),
        })),
        alimentacao: {
          hoje: {
            kcal: Math.round(todayTotals.calories),
            proteina_g: Math.round(todayTotals.proteinG),
            carbo_g: Math.round(todayTotals.carbsG),
            gordura_g: Math.round(todayTotals.fatG),
            refeicoes: todayMeals.length,
          },
          semana: {
            kcal_total: Math.round(weekTotals.calories),
            refeicoes: weekMeals.length,
          },
        },
        frequencia_semanal: Number(resolver.weeklyFrequency.toFixed(1)),
        metas: goals.map((goal) => {
          const progress = computeGoalProgress(
            goal,
            resolver.liveValue(goal.metric, goal.metricKey),
          );
          return {
            titulo: goal.title,
            metrica: GOAL_METRIC_LABELS[goal.metric],
            atual: progress.current,
            alvo: goal.targetValue,
            unidade: goalUnit(goal.metric),
            percentual: progress.percent,
            prazo: goal.deadline ? toISODate(goal.deadline) : null,
          };
        }),
      },
    };
  },
};

export const ASSISTANT_TOOLS: AssistantTool[] = [
  registrarPeso,
  registrarMedidas,
  registrarTreino,
  registrarRefeicao,
  criarMeta,
  consultarDados,
];

/**
 * Declarações no formato OpenAI/Groq (`{ type: "function", function: {...} }`).
 * Os schemas em `ASSISTANT_TOOLS[].parameters` já são JSON Schema válido
 * (usados também pelo Gemini via `toGeminiSchema` em `extract.ts`) — aqui vão
 * direto, sem conversão.
 */
export type ToolDeclaration = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters?: Record<string, unknown>;
  };
};

export function buildToolDeclarations(): ToolDeclaration[] {
  return ASSISTANT_TOOLS.map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      ...(tool.parameters ? { parameters: tool.parameters } : {}),
    },
  }));
}

/** Executa uma chamada de ferramenta pelo nome, sem lançar. */
export async function executeToolCall(
  name: string,
  args: ToolArgs,
  ctx: ToolContext,
): Promise<ToolResult> {
  const tool = ASSISTANT_TOOLS.find((entry) => entry.name === name);
  if (!tool) {
    return { ok: false, summary: `Ação desconhecida: ${name}.` };
  }
  try {
    return await tool.execute(args ?? {}, ctx);
  } catch (error) {
    console.error(`[assistant-tools:${name}]`, error);
    return { ok: false, summary: "Não consegui concluir essa ação agora." };
  }
}
