import { NavLink, Outlet } from "react-router-dom";

export function AppLayout(): JSX.Element {
  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Desk Booking</h1>
        <nav className="app-nav">
          <NavLink to="/login">Login</NavLink>
          <NavLink to="/desks">Desks</NavLink>
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
