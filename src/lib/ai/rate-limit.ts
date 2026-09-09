import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

const WINDOW_MS = 10 * 60 * 1000;
const TEXT_REQUEST_LIMIT = 20;
const ATTACHMENT_REQUEST_LIMIT = 4;

type RequestKind = "text" | "attachment";

export type AiRateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

function windowStart(timestamp: number) {
  return new Date(Math.floor(timestamp / WINDOW_MS) * WINDOW_MS);
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
  const limit = kind === "attachment" ? ATTACHMENT_REQUEST_LIMIT : TEXT_REQUEST_LIMIT;
  const column =
    kind === "attachment"
      ? Prisma.raw('"attachment_requests"')
      : Prisma.raw('"text_requests"');
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
  textRequests: TEXT_REQUEST_LIMIT,
  attachmentRequests: ATTACHMENT_REQUEST_LIMIT,
} as const;
