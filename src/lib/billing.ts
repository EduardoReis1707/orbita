import type { SubscriptionPlan } from "@prisma/client";

/** Estados do Stripe que mantêm os recursos Pro liberados. */
export function planForSubscriptionStatus(status: string): SubscriptionPlan {
  return status === "active" || status === "trialing" ? "PRO" : "FREE";
}

export function formatSubscriptionStatus(status: string | null): string {
  switch (status) {
    case "active":
      return "Ativa";
    case "trialing":
      return "Em período de teste";
    case "past_due":
      return "Pagamento pendente";
    case "unpaid":
      return "Pagamento não concluído";
    case "canceled":
      return "Cancelada";
    default:
      return "Sem assinatura";
  }
}
