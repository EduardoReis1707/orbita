import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { getProfile, requireUser } from "@/lib/auth";
import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const profile = await getProfile();

  if (!profile?.onboardedAt) {
    redirect("/onboarding");
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <AppHeader name={profile.fullName} email={user.email ?? ""} />
        <main className="flex-1 p-4 pb-24 md:p-6 md:pb-6">{children}</main>
        <MobileNav />
      </SidebarInset>
    </SidebarProvider>
  );
}
