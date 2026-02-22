import { Navigate, RouterProvider, createBrowserRouter } from "react-router-dom";

import { RequireAdmin } from "@app/router/guards/require-admin";
import { RequireAuth } from "@app/router/guards/require-auth";

import { AdminDesksPage } from "@pages/admin-desks-page";
import { CheckInPage } from "@pages/check-in-page";
import { DesksPage } from "@pages/desks-page";
import { LoginPage } from "@pages/login-page";
import { NotFoundPage } from "@pages/not-found-page";
import { ReservationsPage } from "@pages/reservations-page";

import { AppLayout } from "./layout/app-layout";

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/login" replace /> },
      { path: "login", element: <LoginPage /> },
      {
        path: "desks",
        element: (
          <RequireAuth>
            <DesksPage />
          </RequireAuth>
        )
      },
      {
        path: "reservations",
        element: (
          <RequireAuth>
            <ReservationsPage />
          </RequireAuth>
        )
      },
      {
        path: "check-in",
        element: (
          <RequireAuth>
            <CheckInPage />
          </RequireAuth>
        )
      },
      {
        path: "admin/desks",
        element: (
          <RequireAdmin>
            <AdminDesksPage />
          </RequireAdmin>
        )
      },
      { path: "*", element: <NotFoundPage /> }
    ]
  }
]);

export function AppRouter(): JSX.Element {
  return <RouterProvider router={router} />;
}
