import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { AuthUser, LoginRequest } from "@campus/types";
import { login as loginRequest, logout as logoutRequest } from "../lib/api/auth";
import { clearStoredAuth, getStoredAuth, storeAuth } from "../lib/authStorage";
import { queryClient } from "../lib/queryClient";

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => getStoredAuth()?.user ?? null);

  useEffect(() => {
    const sync = () => setUser(getStoredAuth()?.user ?? null);
    window.addEventListener("campus-auth-updated", sync);
    return () => window.removeEventListener("campus-auth-updated", sync);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      login: async (credentials) => {
        const auth = await loginRequest(credentials);
        storeAuth(auth);
        setUser(auth.user);
      },
      logout: async () => {
        try {
          await logoutRequest();
        } finally {
          clearStoredAuth();
          queryClient.clear();
          setUser(null);
        }
      },
    }),
    [user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
