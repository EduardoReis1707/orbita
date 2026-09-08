"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { isActivePath, mainNav } from "@/lib/nav";
import { BrandMark } from "@/components/brand-mark";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

export function AppSidebar() {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link
          href="/painel"
          onClick={() => setOpenMobile(false)}
          className="flex items-center gap-2 px-1 py-1.5 group-data-[collapsible=icon]:px-0"
        >
          <BrandMark className="transition-transform duration-300 hover:rotate-[-8deg] hover:scale-105" />
          <span className="font-heading text-sm font-semibold group-data-[collapsible=icon]:hidden">
            Auxiliar de Treino
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map((item, index) => (
                <SidebarMenuItem
                  key={item.href}
                  className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-left-3 motion-safe:fill-mode-both motion-safe:duration-500"
                  style={{ animationDelay: `${index * 35}ms` }}
                >
                  <SidebarMenuButton
                    render={<Link href={item.href} onClick={() => setOpenMobile(false)} />}
                    isActive={isActivePath(pathname, item.href)}
                    tooltip={item.title}
                    className="relative transition-[transform,background-color,color] duration-200 before:absolute before:top-1/2 before:left-0.5 before:h-0 before:w-[3px] before:-translate-y-1/2 before:rounded-full before:bg-primary before:transition-[height] before:duration-300 hover:translate-x-0.5 data-active:text-primary data-active:before:h-4 data-active:[&_svg]:text-primary"
                  >
                    <item.icon className="transition-transform duration-200 group-hover/menu-button:scale-110" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <p className="px-2 py-1 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
          MVP · em desenvolvimento
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}
