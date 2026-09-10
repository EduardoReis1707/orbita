import { Prisma, type SubscriptionPlan } from "@prisma/client";

import { prisma } from "@/lib/prisma";

const WINDOW_MS = 10 * 60 * 1000;
type RequestKind = "text" | "attachment" | "pdf";

type PlanLimits = Record<RequestKind, number>;

/**
 * Cotas de velocidade por plano. A tela mostra estas mesmas regras ao
 * usuário, evitando que ele descubra o bloqueio só depois de tentar usar.
 */
export const AI_PLAN_LIMITS: Record<SubscriptionPlan, PlanLimits> = {
  FREE: { text: 20, attachment: 4, pdf: 2 },
  PRO: { text: 60, attachment: 12, pdf: 12 },
};

export const PLAN_LABELS: Record<SubscriptionPlan, string> = {
  FREE: "Gratuito",
  PRO: "Pro",
};

export type AiRateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

export type AiUsageStatus = {
  plan: SubscriptionPlan;
  planLabel: string;
  resetsAt: string;
  text: { used: number; limit: number };
  attachment: { used: number; limit: number };
  pdf: { used: number; limit: number };
};

function windowStart(timestamp: number) {
  return new Date(Math.floor(timestamp / WINDOW_MS) * WINDOW_MS);
}

function columnFor(kind: RequestKind) {
  if (kind === "attachment") return Prisma.raw('"attachment_requests"');
  if (kind === "pdf") return Prisma.raw('"pdf_exports"');
  return Prisma.raw('"text_requests"');
}

async function getPlan(profileId: string): Promise<SubscriptionPlan> {
  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: { subscriptionPlan: true },
  });
  return profile?.subscriptionPlan ?? "FREE";
}

/** Estado exibido no chat e reutilizado pelos futuros planos pagos. */
export async function getAiUsageStatus(
  profileId: string,
  now = Date.now(),
): Promise<AiUsageStatus> {
  const bucket = windowStart(now);
  const [plan, usage] = await Promise.all([
    getPlan(profileId),
    prisma.aiUsageWindow.findUnique({
      where: { profileId_windowStartedAt: { profileId, windowStartedAt: bucket } },
      select: {
        textRequests: true,
        attachmentRequests: true,
        pdfExports: true,
      },
    }),
  ]);
  const limits = AI_PLAN_LIMITS[plan];

  return {
    plan,
    planLabel: PLAN_LABELS[plan],
    resetsAt: new Date(bucket.getTime() + WINDOW_MS).toISOString(),
    text: { used: usage?.textRequests ?? 0, limit: limits.text },
    attachment: { used: usage?.attachmentRequests ?? 0, limit: limits.attachment },
    pdf: { used: usage?.pdfExports ?? 0, limit: limits.pdf },
  };
}

/**
 * Reserva uma chamada do assistente de forma atômica. O UPDATE condicional
 * garante que duas requisições simultâneas não ultrapassem o mesmo limite.
 */
export async function takeAiRequestSlot(
  profileId: string,
  kind: RequestKind,
  now = Date.now(),
): Promise<AiRateLimitResult> {
  const plan = await getPlan(profileId);
  const limit = AI_PLAN_LIMITS[plan][kind];
  const column = columnFor(kind);
  const bucket = windowStart(now);
  const rows = await prisma.$queryRaw<{ count: number }[]>(Prisma.sql`
    INSERT INTO "ai_usage_windows" ("profile_id", "window_started_at", ${column})
    VALUES (${profileId}::uuid, ${bucket}, 1)
    ON CONFLICT ("profile_id", "window_started_at")
    DO UPDATE SET ${column} = "ai_usage_windows".${column} + 1
    WHERE "ai_usage_windows".${column} < ${limit}
    RETURNING ${column} AS "count"
  `);

  return {
    allowed: rows.length > 0,
    retryAfterSeconds: Math.max(1, Math.ceil((bucket.getTime() + WINDOW_MS - now) / 1000)),
  };
}

export const AI_RATE_LIMITS = {
  windowMinutes: WINDOW_MS / 60_000,
  free: AI_PLAN_LIMITS.FREE,
  pro: AI_PLAN_LIMITS.PRO,
} as const;
