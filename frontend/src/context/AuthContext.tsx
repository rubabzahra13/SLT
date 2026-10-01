"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { loginApi, logoutApi, type User, type UserAccessLevel } from "@/lib/api/auth";

export const SAMPLE_USERS: User[] = [
  {
    id: "usr-megan",
    name: "Megan",
    email: "megan@soundslikethat.com",
    access_level: "Full Access",
    is_active: true,
  },
  {
    id: "usr-andrea",
    name: "Andrea",
    email: "apetty@powermusic.com",
    access_level: "Full Access",
    is_active: true,
  },
  {
    id: "usr-lori",
    name: "Lori",
    email: "lori@powermusic.com",
    access_level: "View Only",
    is_active: true,
  },
  {
    id: "usr-dan",
    name: "Dan",
    email: "dan@powermusic.com",
    access_level: "View Only",
    is_active: true,
  },
  {
    id: "usr-steve",
    name: "Steve",
    email: "steve@powermusic.com",
    access_level: "View Only",
    is_active: true,
  },
];

const SAMPLE_PASSWORDS: Record<string, string> = {
  "megan@soundslikethat.com": "admin",
  "apetty@powermusic.com": "admin",
  "lori@powermusic.com": "view",
  "dan@powermusic.com": "view",
  "steve@powermusic.com": "view",
};

type AuthContextValue = {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isViewOnly: boolean;
  isAuthenticated: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = "slt_auth_session";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load saved session on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.user && parsed?.token) {
          setUser(parsed.user);
          setToken(parsed.token);
        }
      }
    } catch {
      // Storage error fallback
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, pass: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = pass.trim();

    try {
      // Try backend API first
      const res = await loginApi(cleanEmail, cleanPass);
      setUser(res.user);
      setToken(res.token);
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: res.user, token: res.token }));
      return;
    } catch (apiErr) {
      // Fallback for offline / standalone mode with exact sample credentials
      const sampleUser = SAMPLE_USERS.find(
        (u) => u.email.toLowerCase() === cleanEmail
      );
      const expectedPass = SAMPLE_PASSWORDS[sampleUser?.email.toLowerCase() || ""];

      if (sampleUser && expectedPass && cleanPass === expectedPass) {
        const fallbackToken = `token-${sampleUser.id}`;
        setUser(sampleUser);
        setToken(fallbackToken);
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ user: sampleUser, token: fallbackToken })
        );
        return;
      }

      // Re-throw if error was from backend response or failed credentials
      if (apiErr instanceof Error && apiErr.message.includes("Invalid email or password")) {
        throw apiErr;
      }
      throw new Error("Invalid email or password");
    }
  }, []);

  const logout = useCallback(() => {
    if (token) {
      logoutApi(token).catch(() => {});
    }
    setUser(null);
    setToken(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, [token]);

  const isViewOnly = useMemo(() => user?.access_level === "View Only", [user]);
  const isAuthenticated = useMemo(() => Boolean(user && token), [user, token]);

  const value = useMemo(
    () => ({
      user,
      token,
      isLoading,
      isViewOnly,
      isAuthenticated,
      login,
      logout,
    }),
    [user, token, isLoading, isViewOnly, isAuthenticated, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
