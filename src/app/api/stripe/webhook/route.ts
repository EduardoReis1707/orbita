import { NextResponse } from "next/server";
import Stripe from "stripe";

import { planForSubscriptionStatus } from "@/lib/billing";
import { prisma } from "@/lib/prisma";
import {
  getStripeClient,
  getStripeWebhookSecret,
  isStripeWebhookConfigured,
} from "@/lib/stripe";

function stripeId(value: string | { id: string } | null) {
  return typeof value === "string" ? value : value?.id ?? null;
}

async function syncSubscription(subscription: Stripe.Subscription) {
  const customerId = stripeId(subscription.customer);
  const profileFromMetadata = subscription.metadata.profileId;
  const profile = profileFromMetadata
    ? await prisma.profile.findUnique({ where: { id: profileFromMetadata }, select: { id: true } })
    : await prisma.profile.findFirst({
        where: {
          OR: [
            { stripeSubscriptionId: subscription.id },
            ...(customerId ? [{ stripeCustomerId: customerId }] : []),
          ],
        },
        select: { id: true },
      });

  if (!profile) return;

  // Na versão atual da API, o período pertence a cada item da assinatura.
  // Este checkout usa um único preço recorrente, portanto o primeiro item é a fonte correta.
  const periodEnd = subscription.items.data[0]?.current_period_end;
  const keepsManagementLink = ["active", "trialing", "past_due", "unpaid", "incomplete"].includes(
    subscription.status,
  );

  await prisma.profile.update({
    where: { id: profile.id },
    data: {
      subscriptionPlan: planForSubscriptionStatus(subscription.status),
      stripeCustomerId: customerId ?? undefined,
      // Após o cancelamento, libere uma nova contratação para esta conta.
      stripeSubscriptionId: keepsManagementLink ? subscription.id : null,
      subscriptionStatus: subscription.status,
      subscriptionCurrentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
    },
  });
}

/** Stripe assina cada evento; este endpoint nunca confia no navegador. */
export async function POST(request: Request) {
  if (!isStripeWebhookConfigured()) {
    return NextResponse.json({ error: "Webhook não configurado." }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Assinatura ausente." }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = getStripeClient().webhooks.constructEvent(
      await request.text(),
      signature,
      getStripeWebhookSecret(),
    );
  } catch {
    return NextResponse.json({ error: "Assinatura inválida." }, { status: 400 });
  }

  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    await syncSubscription(event.data.object as Stripe.Subscription);
  }

  return NextResponse.json({ received: true });
}
