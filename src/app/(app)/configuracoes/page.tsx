import { redirect } from "next/navigation";

import { getProfile, getUser, requireUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { ProfileForm } from "./profile-form";
import { PasswordForm } from "./password-form";

export const metadata = { title: "Configurações" };

export default async function ConfiguracoesPage() {
  await requireUser();
  const [profile, user] = await Promise.all([getProfile(), getUser()]);
  if (!profile) redirect("/onboarding");

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <ProfileForm profile={profile} />

      <PasswordForm />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Conta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p>
            <span className="text-muted-foreground">E-mail: </span>
            {user?.email ?? "—"}
          </p>
          <p className="text-xs text-muted-foreground">
            Para sair, use o menu do seu avatar no topo da página.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Plano e cobrança</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <p className="text-muted-foreground">
            Seu plano atual: <span className="font-medium text-foreground">{profile.subscriptionPlan === "PRO" ? "Pro" : "Gratuito"}</span>
          </p>
          <Link href="/assinatura" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Ver assinatura
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
