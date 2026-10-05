import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { authenticateLocal, getStoredUser, logoutLocal, type PRDUser } from "@/lib/auth";
import { getLocalBootstrap } from "@/lib/localStore";

type Ctx = {
  user: PRDUser | null;
  token: string | null;
  ready: boolean;
  signIn: (phone: string, pin: string) => string | null;
  signOut: () => void;
};
const SessionCtx = createContext<Ctx | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PRDUser | null>(() => getStoredUser());
  const token = user?.id ?? null;
  const ready = true;
  const qc = useQueryClient();

  const signIn = useCallback(
    (phone: string, pin: string): string | null => {
      const res = authenticateLocal(phone, pin);
      if (!res.ok || !res.user) {
        return res.error || "Phone or PIN is incorrect";
      }
      qc.clear();
      setUser(res.user);
      return null;
    },
    [qc],
  );

  const signOut = useCallback(() => {
    logoutLocal();
    qc.clear();
    setUser(null);
  }, [qc]);

  return <SessionCtx.Provider value={{ user, token, ready, signIn, signOut }}>{children}</SessionCtx.Provider>;
}

export function useSession() {
  const c = useContext(SessionCtx);
  if (!c) throw new Error("SessionProvider missing");
  return c;
}

export function useBootstrap() {
  const { user } = useSession();
  return useQuery({
    queryKey: ["bootstrap", user?.id],
    queryFn: async () => getLocalBootstrap(),
    enabled: !!user,
  });
}

export function useRefresh() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["bootstrap"] });
}