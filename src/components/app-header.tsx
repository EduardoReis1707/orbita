"use client";

import { usePathname } from "next/navigation";

import { isActivePath, mainNav } from "@/lib/nav";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";

export function AppHeader({ name, email }: { name: string; email: string }) {
  const pathname = usePathname();
  const current = mainNav.find((item) => isActivePath(pathname, item.href));

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <SidebarTrigger />
      <Separator orientation="vertical" className="mr-1 h-5" />
      <h1 className="font-heading text-sm font-semibold">
        {current?.title ?? "Auxiliar de Treino"}
      </h1>
      <div className="ml-auto flex items-center gap-1">
        <ThemeToggle />
        <UserMenu name={name} email={email} />
      </div>
    </header>
  );
}
