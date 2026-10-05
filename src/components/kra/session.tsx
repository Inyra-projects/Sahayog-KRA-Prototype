import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getBootstrap, login as loginFn, logout as logoutFn } from "@/lib/kra.functions";

const KEY = "sahayog-kra-token";

type Ctx = {
  token: string | null;
  ready: boolean;
  signIn: (phone: string, pin: string) => Promise<string | null>;
  signOut: () => Promise<void>;
};
const SessionCtx = createContext<Ctx | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const qc = useQueryClient();
  useEffect(() => {
    setToken(localStorage.getItem(KEY));
    setReady(true);
  }, []);
  const signIn = useCallback(
    async (phone: string, pin: string) => {
      const r = await loginFn({ data: { phone, pin } });
      if (!r.ok) return r.error;
      if (token) logoutFn({ data: { token } }).catch(() => {});
      qc.clear();
      localStorage.setItem(KEY, r.token);
      setToken(r.token);
      return null;
    },
    [qc, token],
  );
  const signOut = useCallback(async () => {
    if (token) await logoutFn({ data: { token } }).catch(() => {});
    await qc.cancelQueries();
    qc.clear();
    localStorage.removeItem(KEY);
    setToken(null);
  }, [qc, token]);
  return <SessionCtx.Provider value={{ token, ready, signIn, signOut }}>{children}</SessionCtx.Provider>;
}

export function useSession() {
  const c = useContext(SessionCtx);
  if (!c) throw new Error("SessionProvider missing");
  return c;
}

export function useBootstrap() {
  const { token } = useSession();
  return useQuery({
    queryKey: ["bootstrap", token],
    queryFn: () => getBootstrap({ data: { token: token! } }),
    enabled: !!token,
    retry: false,
  });
}

export function useRefresh() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["bootstrap"] });
}