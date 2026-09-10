import { requireUser } from "@/lib/auth";
import { getAiUsageStatus } from "@/lib/ai/rate-limit";

/** Expõe ao chat as cotas da conta e o horário exato de reinício. */
export async function GET() {
  const user = await requireUser();
  const usage = await getAiUsageStatus(user.id);
  return Response.json(usage, {
    headers: { "Cache-Control": "no-store" },
  });
}
