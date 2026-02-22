import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { AppLayout } from "@app/layout/app-layout";

import { AuthSessionContext } from "@features/auth/model/session/auth-session-context";

describe("AppLayout", () => {
  it("renders app header", () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false
        }
      }
    });

    render(
      <AuthSessionContext.Provider
        value={{
          user: null,
          isAuthenticated: false,
          isBootstrapping: false,
          signIn: async () => {},
          signOut: async () => {}
        }}
      >
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <AppLayout />
          </MemoryRouter>
        </QueryClientProvider>
      </AuthSessionContext.Provider>
    );

    expect(screen.getByRole("heading", { name: "Desk Booking" })).toBeVisible();
  });
});
