import type { ReactNode } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { ToastProvider } from "@shared/ui/Toast";

import { AuthSessionProvider } from "@features/auth/model/session/auth-session-provider";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false
    }
  }
});

type AppProvidersProps = {
  children: ReactNode;
};

export function AppProviders({ children }: Readonly<AppProvidersProps>): JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthSessionProvider>
        <ToastProvider>{children}</ToastProvider>
      </AuthSessionProvider>
    </QueryClientProvider>
  );
}

