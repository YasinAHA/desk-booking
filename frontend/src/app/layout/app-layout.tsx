import { Outlet } from "react-router-dom";

import { AppSidebar } from "@app/layout/app-sidebar";

export function AppLayout(): JSX.Element {
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className="ml-64 min-h-screen px-7 py-7">
        <Outlet />
      </main>
    </div>
  );
}
