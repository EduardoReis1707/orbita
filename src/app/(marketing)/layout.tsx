import type { ReactNode } from "react";

import { CornerChrome } from "./_components/corner-chrome";
import { LpFooter } from "./_components/lp-footer";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="lp flex min-h-full flex-col">
      <CornerChrome />
      <main className="flex-1">{children}</main>
      <LpFooter />
    </div>
  );
}
