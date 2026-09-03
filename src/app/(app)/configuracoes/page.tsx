import { redirect } from "next/navigation";

import { getProfile, getUser, requireUser } from "@/lib/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Aparência</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Tema</p>
            <p className="text-xs text-muted-foreground">
              Claro, escuro ou seguindo o sistema.
            </p>
          </div>
          <ThemeToggle />
        </CardContent>
      </Card>

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
    </div>
  );
}
