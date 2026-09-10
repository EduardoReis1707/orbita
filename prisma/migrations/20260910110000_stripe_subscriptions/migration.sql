-- Identificadores de cobrança ficam no perfil para que o webhook do Stripe
-- seja a única fonte que libera ou remove recursos pagos.
ALTER TABLE "profiles"
  ADD COLUMN "stripe_customer_id" TEXT,
  ADD COLUMN "stripe_subscription_id" TEXT,
  ADD COLUMN "subscription_status" TEXT,
  ADD COLUMN "subscription_current_period_end" TIMESTAMPTZ(6);

CREATE UNIQUE INDEX "profiles_stripe_customer_id_key"
  ON "profiles"("stripe_customer_id");

CREATE UNIQUE INDEX "profiles_stripe_subscription_id_key"
  ON "profiles"("stripe_subscription_id");
