"use client";

import { SessionProvider } from "next-auth/react";
import { EPKProvider } from "@/context/EPKContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <EPKProvider>{children}</EPKProvider>
    </SessionProvider>
  );
}
