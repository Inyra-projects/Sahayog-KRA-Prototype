import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart3, ClipboardList, Loader2, LogOut, Repeat, Star, Target, Users } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useBootstrap, useSession } from "./session";
import { Dashboard } from "./Dashboard";
import { WeeklyEntry } from "./WeeklyEntry";
import { PeerRate } from "./PeerRate";
import { EditKras, ManageTeam } from "./AdminPanels";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DEMO_USERS } from "@/lib/demo";
import { ROLE_LABEL } from "@/lib/scoring";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getDefaultRouteForRole, getStoredUser } from "@/lib/auth";

type Tab = "dash" | "team" | "kras" | "entry" | "rate";

const AVATAR_COLORS = [
  "bg-emerald-600",
  "bg-blue-600",
  "bg-violet-600",
  "bg-amber-600",
  "bg-rose-600",
  "bg-teal-600",
  "bg-indigo-600",
  "bg-fuchsia-600",
];

export function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

export function AppShell({ initialTab }: { initialTab?: Tab }) {
  const { signOut, signIn } = useSession();
  const navigate = useNavigate();
  const q = useBootstrap();
  const [tab, setTab] = useState<Tab | null>(initialTab ?? null);
  const [switchOpen, setSwitchOpen] = useState(false);

  if (q.isLoading) return <div className="grid min-h-screen place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  if (q.error || !q.data) {
    return (
      <div className="mx-auto grid min-h-screen max-w-md place-items-center px-6 text-center">
        <div>
          <p className="font-display text-lg font-semibold">Please sign in again</p>
          <p className="mt-1 text-sm text-muted-foreground">{(q.error as Error)?.message || "Session ended"}</p>
          <button
            type="button"
            onClick={() => {
              signOut();
              navigate({ to: "/login" as any }).catch(() => { window.location.href = "/login"; });
            }}
            className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Go to sign in
          </button>
        </div>
      </div>
    );
  }

  const d = q.data;
  const role = d.me.role;
  const tabs: { id: Tab; label: string; Icon: typeof Users }[] =
    role === "admin"
      ? [{ id: "dash", label: "Dashboard", Icon: BarChart3 }, { id: "team", label: "Team", Icon: Users }, { id: "kras", label: "KRAs", Icon: Target }]
      : role === "manager"
        ? [{ id: "dash", label: "Dashboard", Icon: BarChart3 }]
        : [{ id: "entry", label: "This week", Icon: ClipboardList }, { id: "rate", label: "Rate a peer", Icon: Star }];

  const active = tab && tabs.some((t) => t.id === tab) ? tab : (tabs[0]?.id ?? "dash");

  const quick = (phone: string, pin: string) => {
    setSwitchOpen(false);
    setTab(null);
    const e = signIn(phone, pin);
    if (e) {
      toast.error(`${e} — the PIN may have been changed`);
    } else {
      const u = getStoredUser();
      const dest = u ? getDefaultRouteForRole(u.role) : "/dashboard";
      navigate({ to: dest as any }).catch(() => { window.location.href = dest; });
    }
  };

  const handleSignOut = () => {
    signOut();
    navigate({ to: "/login" as any }).catch(() => { window.location.href = "/login"; });
  };

  return (
    <div className="mx-auto min-h-screen max-w-2xl pb-28">
      <header className="sticky top-0 z-20 border-b border-black/[0.05] bg-white/70 px-4 py-3 backdrop-blur-md">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-full font-display text-sm font-semibold text-white", getAvatarColor(d.me.name))}>
              {d.me.name.replace("Dr. ", "").split(" ").map((x) => x[0]).join("").slice(0, 2)}
            </span>
            <div className="min-w-0">
              <p className="truncate font-display font-semibold">{d.me.name}</p>
              <p className="truncate text-xs text-muted-foreground">{ROLE_LABEL[role]} · {d.me.center}</p>
            </div>
          </div>
          <div className="flex gap-1.5">
            <button type="button" onClick={() => setSwitchOpen(true)} className="flex items-center gap-1.5 rounded-xl border border-border/70 bg-card px-2.5 py-2 text-xs font-semibold active:scale-95" aria-label="Quick switch demo user">
              <Repeat className="h-4 w-4" /><span className="hidden sm:inline">Switch</span>
            </button>
            <button type="button" onClick={handleSignOut} className="grid h-9 w-9 place-items-center rounded-xl border border-border/70 bg-card active:scale-95" aria-label="Sign out">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="px-4 pt-5">
        <AnimatePresence mode="wait">
          <motion.div key={active + d.me.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
            {active === "dash" && <Dashboard data={d} />}
            {active === "team" && <ManageTeam data={d} />}
            {active === "kras" && <EditKras data={d} />}
            {active === "entry" && <WeeklyEntry data={d} />}
            {active === "rate" && <PeerRate data={d} />}
          </motion.div>
        </AnimatePresence>
      </main>

      {tabs.length > 1 && (
        <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 p-1.5 bg-[#18191E]/95 backdrop-blur-xl border border-white/10 rounded-full shadow-[0_12px_36px_rgba(0,0,0,0.35)] h-16">
          {tabs.map(({ id, label, Icon }) => (
            <button key={id} type="button" onClick={() => setTab(id)} className="relative flex flex-col items-center justify-center w-[86px] h-full rounded-full z-10 transition-colors select-none">
              {active === id && <motion.div layoutId="activeTabPill" className="absolute inset-0 bg-white/15 rounded-full -z-10 border border-white/10" transition={{ type: "spring", stiffness: 350, damping: 28 }} />}
              <Icon className={cn("relative z-10 h-5 w-5 transition-colors", active === id ? "text-white" : "text-slate-400 hover:text-slate-200")} strokeWidth={active === id ? 2.5 : 2} />
              <span className={cn("relative z-10 text-[10px] tracking-tight mt-0.5 transition-colors", active === id ? "text-white font-semibold" : "text-slate-400 font-medium")}>{label}</span>
            </button>
          ))}
        </nav>
      )}

      <Sheet open={switchOpen} onOpenChange={setSwitchOpen}>
        <SheetContent side="bottom" className="mx-auto max-w-md rounded-t-3xl">
          <SheetHeader><SheetTitle>Quick switch demo user</SheetTitle></SheetHeader>
          <div className="max-h-[60vh] divide-y divide-border/60 overflow-y-auto px-4 pb-6">
            {DEMO_USERS.map((u) => (
              <button key={u.phone} type="button" onClick={() => quick(u.phone, u.pin)} className="flex w-full items-center justify-between py-3 text-left">
                <span className="text-sm font-semibold">{u.name}</span>
                <span className="text-xs text-muted-foreground">{u.label}</span>
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}