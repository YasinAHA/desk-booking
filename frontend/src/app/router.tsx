import { Navigate, RouterProvider, createBrowserRouter } from "react-router-dom";

import { AppLayout } from "@app/layout/app-layout";
import { RequireAdmin } from "@app/router/guards/require-admin";
import { RequireAuth } from "@app/router/guards/require-auth";

import { AdminDesksPage } from "@pages/admin-desks-page";
import { CheckInPage } from "@pages/check-in-page";
import { DashboardPage } from "@pages/dashboard-page";
import { DesksPage } from "@pages/desks-page";
import { ForgotPasswordPage } from "@pages/forgot-password-page";
import { LoginPage } from "@pages/login-page";
import { NotFoundPage } from "@pages/not-found-page";
import { RegisterPage } from "@pages/register-page";
import { ReservationsPage } from "@pages/reservations-page";

const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />
  },
  {
    path: "/register",
    element: <RegisterPage />
  },
  {
    path: "/forgot-password",
    element: <ForgotPasswordPage />
  },
  {
    path: "/",
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ), 
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "dashboard", element: <DashboardPage /> },
      { path: "desks", element: <DesksPage /> },
      { path: "reservations", element: <ReservationsPage /> },
      { path: "check-in", element: <CheckInPage /> },
      {
        path: "admin/desks",
        element: (
          <RequireAdmin>
            <AdminDesksPage />
          </RequireAdmin>
        )
      }
    ]
  },
  { path: "*", element: <NotFoundPage /> }
]);

export function AppRouter(): JSX.Element {
  return <RouterProvider router={router} />;
}
