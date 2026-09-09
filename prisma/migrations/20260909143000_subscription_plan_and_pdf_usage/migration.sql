-- Plano de acesso e contador de exportações para aplicar cotas por recurso.
CREATE TYPE "SubscriptionPlan" AS ENUM ('FREE', 'PRO');

ALTER TABLE "profiles"
  ADD COLUMN "subscription_plan" "SubscriptionPlan" NOT NULL DEFAULT 'FREE';

ALTER TABLE "ai_usage_windows"
  ADD COLUMN "pdf_exports" INTEGER NOT NULL DEFAULT 0,
  ADD CONSTRAINT "ai_usage_windows_pdf_exports_nonnegative" CHECK ("pdf_exports" >= 0);
