import { api, ApiError, AUTH_EXPIRED_EVENT, TOKEN_KEY, USER_KEY } from "@/api/client";
import { clearOfflineData } from "@/offline/outbox";
import type { Permission, Role, User } from "@/types/api";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

/** "checking" while a stored session is re-validated against /auth/me. */
type AuthStatus = "checking" | "ready";

type AuthContextType = {
  user: User | null;
  token: string | null;
  status: AuthStatus;
  isAuthenticated: boolean;
  saveAuth: (token: string, user: User) => void;
  updateUser: (patch: Partial<User>) => void;
  logout: () => void;
  /** True when the user holds at least one of `perms` (server-granted). */
  can: (...perms: Permission[]) => boolean;
  hasRole: (...roles: Role[]) => boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Re-check permissions at most this often when the tab regains focus. */
const REFRESH_ON_FOCUS_MS = 60_000;

function readStoredUser(): User | null {
  try {
    const raw = sessionStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(readStoredUser);
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem(TOKEN_KEY));
  const [status, setStatus] = useState<AuthStatus>(() => (sessionStorage.getItem(TOKEN_KEY) ? "checking" : "ready"));
  const lastRefresh = useRef(0);

  const storeUser = useCallback((u: User) => {
    sessionStorage.setItem(USER_KEY, JSON.stringify(u));
    setUser(u);
  }, []);

  const saveAuth = useCallback(
    (accessToken: string, userData: User) => {
      sessionStorage.setItem(TOKEN_KEY, accessToken);
      setToken(accessToken);
      storeUser(userData);
      lastRefresh.current = Date.now();
      setStatus("ready");
    },
    [storeUser],
  );

  const updateUser = useCallback((patch: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      sessionStorage.setItem(USER_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const logout = useCallback(() => {
    void clearOfflineData(); // shared phones: no saved copies or unsent items stay behind
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
    setStatus("ready");
  }, []);

  /** Pull the current role and permissions; an admin may have changed them. */
  const refresh = useCallback(async () => {
    if (!sessionStorage.getItem(TOKEN_KEY)) return;
    lastRefresh.current = Date.now();
    try {
      storeUser(await api.me());
    } catch (e) {
      // 401 already signs out via AUTH_EXPIRED_EVENT. If the server is
      // unreachable, keep the stored session rather than locking the user out.
      if (e instanceof ApiError && e.status === 401) logout();
    } finally {
      setStatus("ready");
    }
  }, [storeUser, logout]);

  // Validate a stored session once on load
  useEffect(() => {
    const t = setTimeout(() => void refresh(), 0);
    return () => clearTimeout(t);
  }, [refresh]);

  // Pick up role changes when the user comes back to the tab
  useEffect(() => {
    const onFocus = () => {
      if (Date.now() - lastRefresh.current > REFRESH_ON_FOCUS_MS) void refresh();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  // The API client fires this when the platform rejects the stored token.
  useEffect(() => {
    window.addEventListener(AUTH_EXPIRED_EVENT, logout);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, logout);
  }, [logout]);

  const can = useCallback(
    (...perms: Permission[]) => !!user?.permissions && perms.some((p) => user.permissions!.includes(p)),
    [user],
  );
  const hasRole = useCallback((...roles: Role[]) => !!user && roles.includes(user.role), [user]);

  const value = useMemo(
    () => ({ user, token, status, isAuthenticated: !!user && !!token, saveAuth, updateUser, logout, can, hasRole }),
    [user, token, status, saveAuth, updateUser, logout, can, hasRole],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
};
