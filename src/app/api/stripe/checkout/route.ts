import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getProPriceId,
  getSiteUrl,
  getStripeClient,
  isStripeCheckoutConfigured,
} from "@/lib/stripe";

export async function POST() {
  const user = await requireUser();

  if (!isStripeCheckoutConfigured()) {
    return NextResponse.json(
      { error: "As assinaturas ainda não foram configuradas." },
      { status: 503 },
    );
  }

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: {
      subscriptionPlan: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
    },
  });
  if (!profile) {
    return NextResponse.json(
      { error: "Conclua seu perfil antes de assinar o plano Pro." },
      { status: 409 },
    );
  }
  if (profile.subscriptionPlan === "PRO" || profile.stripeSubscriptionId) {
    return NextResponse.json(
      { error: "Você já tem uma assinatura. Use Gerenciar assinatura." },
      { status: 409 },
    );
  }

  const stripe = getStripeClient();
  let customerId = profile.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { profileId: user.id, app: "orbita" },
    });
    customerId = customer.id;
    await prisma.profile.update({
      where: { id: user.id },
      data: { stripeCustomerId: customerId },
    });
  }

  const siteUrl = getSiteUrl();
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: user.id,
    line_items: [{ price: getProPriceId(), quantity: 1 }],
    allow_promotion_codes: true,
    success_url: `${siteUrl}/assinatura?checkout=success`,
    cancel_url: `${siteUrl}/assinatura?checkout=cancel`,
    metadata: { profileId: user.id },
    subscription_data: { metadata: { profileId: user.id } },
  });

  if (!session.url) {
    return NextResponse.json(
      { error: "Não foi possível abrir o checkout." },
      { status: 502 },
    );
  }

  return NextResponse.json({ url: session.url });
}
