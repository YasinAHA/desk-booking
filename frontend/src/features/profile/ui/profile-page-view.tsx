import { useAuthSession } from "@features/auth/model/session/use-auth-session";

export function ProfilePageView(): JSX.Element {
  const { user } = useAuthSession();
  const lastNames = (() => {
    if (!user) return "-";
    return user.secondLastName ? `${user.lastName} ${user.secondLastName}` : user.lastName;
  })();

  return (
    <section className="rounded-[--radius-card] border border-border bg-surface p-6 shadow-card">
      <h1 className="font-heading text-2xl font-bold text-foreground">Profile</h1>
      <p className="mt-1 text-sm text-muted">Your account information.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">First name</p>
          <p className="mt-1 text-sm text-foreground">{user?.firstName ?? "-"}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Last name</p>
          <p className="mt-1 text-sm text-foreground">{lastNames}</p>
        </div>
        <div className="sm:col-span-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Email</p>
          <p className="mt-1 text-sm text-foreground">{user?.email ?? "-"}</p>
        </div>
      </div>
    </section>
  );
}
