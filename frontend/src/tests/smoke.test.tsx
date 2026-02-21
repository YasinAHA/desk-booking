import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AppLayout } from "../app/layout/app-layout";
import { AuthSessionContext } from "../features/auth/model/auth-session-context";

describe("AppLayout", () => {
  it("renders app header", () => {
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
        <MemoryRouter>
          <AppLayout />
        </MemoryRouter>
      </AuthSessionContext.Provider>
    );

    expect(screen.getByRole("heading", { name: "Desk Booking" })).toBeVisible();
  });
});
