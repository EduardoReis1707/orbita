import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { ActivityIcon } from "lucide-react";

import { getProfile, requireUser } from "@/lib/auth";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function OnboardingLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireUser();
  const profile = await getProfile();

  if (profile?.onboardedAt) {
    redirect("/painel");
  }

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex h-14 items-center justify-between px-4">
        <span className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ActivityIcon className="size-4" />
          </span>
          <span className="font-heading text-sm font-semibold">
            Auxiliar de Treino
          </span>
        </span>
        <ThemeToggle />
      </header>
      <main className="flex flex-1 items-start justify-center p-4 md:items-center">
        <div className="w-full max-w-lg py-6">{children}</div>
      </main>
    </div>
  );
}
