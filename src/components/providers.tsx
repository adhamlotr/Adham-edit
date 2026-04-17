"use client";

import { SessionProvider } from "next-auth/react";
import { TRPCProvider } from "~/trpc/react";

export function Providers({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <SessionProvider>
      <TRPCProvider>{children}</TRPCProvider>
    </SessionProvider>
  );
}
