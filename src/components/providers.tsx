"use client";

import { TooltipProvider } from "@/components/ui/tooltip";
import { CurrencyVisibilityProvider } from "@/lib/currency";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <CurrencyVisibilityProvider>{children}</CurrencyVisibilityProvider>
    </TooltipProvider>
  );
}
