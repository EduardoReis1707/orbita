import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
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
    select: { stripeCustomerId: true },
  });
  if (!profile?.stripeCustomerId) {
    return NextResponse.json(
      { error: "Não encontramos uma assinatura para esta conta." },
      { status: 404 },
    );
  }

  const session = await getStripeClient().billingPortal.sessions.create({
    customer: profile.stripeCustomerId,
    return_url: `${getSiteUrl()}/assinatura`,
  });
  return NextResponse.json({ url: session.url });
}
