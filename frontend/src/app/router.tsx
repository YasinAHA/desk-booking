import { Navigate, RouterProvider, createBrowserRouter } from "react-router-dom";
import { AppLayout } from "./layout/app-layout";
import { DesksPage } from "../pages/desks-page";
import { LoginPage } from "../pages/login-page";
import { NotFoundPage } from "../pages/not-found-page";
import { RequireAuth } from "../features/auth/ui/require-auth";

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
      { path: "*", element: <NotFoundPage /> }
    ]
  }
]);

export function AppRouter(): JSX.Element {
  return <RouterProvider router={router} />;
}
