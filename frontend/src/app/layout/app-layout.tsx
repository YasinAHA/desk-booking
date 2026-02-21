import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuthSession } from "../../features/auth/model/use-auth-session";

export function AppLayout(): JSX.Element {
  const navigate = useNavigate();
  const { isAuthenticated, signOut } = useAuthSession();

  const onLogout = async () => {
    await signOut();
    await navigate("/login");
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Desk Booking</h1>
        <nav className="app-nav">
          <NavLink to="/login">Login</NavLink>
          {isAuthenticated ? <NavLink to="/desks">Desks</NavLink> : null}
          {isAuthenticated ? (
            <button
              type="button"
              className="ghost-button"
              onClick={() => {
                void onLogout();
              }}
            >
              Logout
            </button>
          ) : null}
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
