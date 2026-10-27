import { LoadingState } from "@/components/common/States";
import { useAuth } from "@/context/AuthContext";
import { tr } from "@/i18n/core";
import type { Permission } from "@/types/api";
import { Navigate, Outlet, useLocation } from "react-router";

/** Signed-in users only; others go to sign-in and come back afterwards. */
export function RequireAuth() {
  const { isAuthenticated, status } = useAuth();
  const location = useLocation();
  if (status === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingState label={tr("state.checkingAccount")} />
      </div>
    );
  }
  if (!isAuthenticated) {
    return <Navigate to="/signin" replace state={{ from: location.pathname + location.search }} />;
  }
  return <Outlet />;
}

/**
 * Nested routes need at least one of `any`. Users without it land on the
 * dashboard. The server enforces the same rule on every API call; this only
 * keeps people out of screens that would fail.
 */
export function RequirePermission({ any }: { any: Permission[] }) {
  const { can } = useAuth();
  return can(...any) ? <Outlet /> : <Navigate to="/dashboard" replace />;
}

/** Sign-in / sign-up pages: already signed-in users skip straight to the app. */
export function GuestOnly() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Outlet />;
}
