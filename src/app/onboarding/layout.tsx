import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { getProfile, requireUser } from "@/lib/auth";
import { BrandMark } from "@/components/brand-mark";

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
      <header className="flex h-14 items-center px-4">
        <span className="flex items-center gap-2">
          <BrandMark />
          <span className="font-heading text-sm font-semibold">
            Auxiliar de Treino
          </span>
        </span>
      </header>
      <main className="flex flex-1 items-start justify-center p-4 md:items-center">
        <div className="w-full max-w-lg py-6">{children}</div>
      </main>
    </div>
  );
}
