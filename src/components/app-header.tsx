"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SearchIcon } from "lucide-react";

import { isActivePath, mainNav } from "@/lib/nav";
import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { UserMenu } from "@/components/user-menu";

/** Títulos de áreas que não estão no menu principal. */
const EXTRA_TITLES: Record<string, string> = {
  "/busca": "Busca",
  "/configuracoes": "Configurações",
};

export function AppHeader({ name, email }: { name: string; email: string }) {
  const pathname = usePathname();
  const current = mainNav.find((item) => isActivePath(pathname, item.href));
  const title =
    current?.title ??
    Object.entries(EXTRA_TITLES).find(
      ([href]) => pathname === href || pathname.startsWith(`${href}/`),
    )?.[1] ??
    "Órbita";

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <SidebarTrigger />
      <Separator orientation="vertical" className="mr-1 h-5" />
      <h1 className="font-heading text-sm font-semibold">{title}</h1>
      <div className="ml-auto flex items-center gap-1">
        <Link
          href="/busca"
          aria-label="Buscar"
          className={buttonVariants({ variant: "ghost", size: "icon" })}
        >
          <SearchIcon className="size-4" />
        </Link>
        <UserMenu name={name} email={email} />
      </div>
    </header>
  );
}
