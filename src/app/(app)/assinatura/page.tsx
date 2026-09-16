import { redirect } from "next/navigation";

import { getProfile, requireUser } from "@/lib/auth";
import { formatSubscriptionStatus } from "@/lib/billing";
import { SubscriptionCard } from "./subscription-card";

export const metadata = { title: "Assinatura" };

export default async function AssinaturaPage() {
  await requireUser();
  const profile = await getProfile();
  if (!profile) redirect("/onboarding");

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Assinatura</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Escolha o plano que acompanha o seu ritmo e gerencie sua cobrança com segurança.
        </p>
      </div>
      <SubscriptionCard
        plan={profile.subscriptionPlan}
        status={profile.subscriptionStatus}
        statusLabel={formatSubscriptionStatus(profile.subscriptionStatus)}
      />
    </div>
  );
}
