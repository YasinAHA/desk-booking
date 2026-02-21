import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AppLayout } from "../app/layout/app-layout";

describe("AppLayout", () => {
  it("renders app header", () => {
    render(
      <MemoryRouter>
        <AppLayout />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: "Desk Booking" })).toBeVisible();
  });
});
