import Stripe from "stripe";

declare global {
  var stripeClient: Stripe | undefined;
}

function getRequiredEnv(name: "STRIPE_SECRET_KEY" | "STRIPE_PRO_PRICE_ID" | "STRIPE_WEBHOOK_SECRET") {
  const value = process.env[name];
  if (!value) throw new Error(`Configuração ausente: ${name}`);
  return value;
}

export function isStripeCheckoutConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRO_PRICE_ID);
}

export function isStripeWebhookConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);
}

export function getStripeClient() {
  if (!globalThis.stripeClient) {
    globalThis.stripeClient = new Stripe(getRequiredEnv("STRIPE_SECRET_KEY"));
  }
  return globalThis.stripeClient;
}

export function getProPriceId() {
  return getRequiredEnv("STRIPE_PRO_PRICE_ID");
}

export function getStripeWebhookSecret() {
  return getRequiredEnv("STRIPE_WEBHOOK_SECRET");
}

export function getSiteUrl() {
  const value = process.env.NEXT_PUBLIC_SITE_URL;
  if (!value) throw new Error("Configuração ausente: NEXT_PUBLIC_SITE_URL");
  return value.replace(/\/$/, "");
}
