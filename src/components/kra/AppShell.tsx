import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarDays, ClipboardList, LayoutGrid, Loader2, LogOut, Repeat, Star, Target, Users, X } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useBootstrap, useSession } from "./session";
import { Dashboard } from "./Dashboard";
import { Evaluations } from "./Evaluations";
import { EditKras, ManageTeam } from "./AdminPanels";
import { WeeklyEntry } from "./WeeklyEntry";
import { PeerRate } from "./PeerRate";
import { Sheet, SheetContent, SheetTitle, SheetClose } from "@/components/ui/sheet";
import { DEMO_USERS } from "@/lib/demo";
import { ROLE_LABEL } from "@/lib/scoring";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { authenticateLocal, getDefaultRouteForRole, getStoredUser, setStoredUser } from "@/lib/auth";

export type Tab = "dash" | "team" | "kras" | "evaluations" | "entry" | "rate";

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

export function AppShell({ initialTab }: { initialTab?: string }) {
  const { signOut, signIn } = useSession();
  const navigate = useNavigate();
  const q = useBootstrap();

  const storedUser = getStoredUser();
  const storedIsLead = storedUser?.role === "admin" || storedUser?.role === "manager";

  // Initial tab based on role and incoming prop
  const getInitialTab = (): Tab => {
    if (storedIsLead) {
      if (initialTab === "team" || initialTab === "employees") return "team";
      if (initialTab === "kras") return "kras";
      if (initialTab === "entry" || initialTab === "evaluations") return "evaluations";
      return "dash";
    } else {
      if (initialTab === "rate") return "rate";
      return "entry";
    }
  };

  const [tab, setTab] = useState<Tab>(getInitialTab);
  const [targetStaffId, setTargetStaffId] = useState<string | undefined>();
  const [switchOpen, setSwitchOpen] = useState(false);

  const currentRole = q.data?.me?.role || storedUser?.role;
  const isLead = currentRole === "admin" || currentRole === "manager";

  // Enforce access control unconditionally before any early returns (Rules of Hooks)
  useEffect(() => {
    if (!currentRole) return;
    if (!isLead && (tab === "dash" || tab === "team" || tab === "kras" || tab === "evaluations")) {
      setTab("entry");
    } else if (isLead && (tab === "entry" || tab === "rate")) {
      setTab(initialTab === "entry" ? "evaluations" : "dash");
    }
  }, [isLead, currentRole, initialTab]);

  if (q.isLoading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

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
              navigate({ to: "/login" as any }).catch(() => {
                window.location.href = "/login";
              });
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
  const isAdmin = role === "admin";
  const isManager = role === "manager";

  // Admin tabs (4 primary management tabs - PRD Section 7)
  const adminTabs: { id: Tab; label: string; Icon: typeof Users }[] = [
    { id: "dash", label: "Dashboard", Icon: LayoutGrid },
    { id: "team", label: "Team", Icon: Users },
    { id: "kras", label: "KRA Setup", Icon: Target },
    { id: "evaluations", label: "Evaluations", Icon: ClipboardList },
  ];

  // Center Manager tabs (3 tabs: Dashboard, Employees/Team Center view, Evaluations - PRD Section 7)
  const managerTabs: { id: Tab; label: string; Icon: typeof Users }[] = [
    { id: "dash", label: "Dashboard", Icon: LayoutGrid },
    { id: "team", label: "Team", Icon: Users },
    { id: "evaluations", label: "Evaluations", Icon: ClipboardList },
  ];

  // Staff tabs (2 tabs: My Performance & Rate Peers - PRD Section 7)
  const staffTabs: { id: Tab; label: string; Icon: typeof Users }[] = [
    { id: "entry", label: "My Performance", Icon: CalendarDays },
    { id: "rate", label: "Rate Peers", Icon: Star },
  ];

  const tabs = isAdmin ? adminTabs : isManager ? managerTabs : staffTabs;

  const active = tab;

  const tabToRoute: Record<Tab, string> = {
    dash: "/dashboard",
    team: "/team",
    kras: "/kras",
    evaluations: "/entry",
    entry: "/entry",
    rate: "/rate",
  };

  const handleTabClick = (id: Tab) => {
    setTargetStaffId(undefined);
    setTab(id);
    const dest = tabToRoute[id];
    if (dest && typeof window !== "undefined" && window.location.pathname !== dest) {
      window.history.replaceState(null, "", dest);
    }
  };

  const handleOpenEvaluationFromDashboard = (staffId: string) => {
    setTargetStaffId(staffId);
    setTab("evaluations");
    if (typeof window !== "undefined" && window.location.pathname !== "/entry") {
      window.history.replaceState(null, "", "/entry");
    }
  };

  const quick = (phone: string, pin: string) => {
    setSwitchOpen(false);
    const res = authenticateLocal(phone, pin);
    if (!res.ok || !res.user) {
      toast.error("Phone or PIN is incorrect");
      return;
    }
    setStoredUser(res.user);
    const dest = getDefaultRouteForRole(res.user.role);
    window.location.href = dest;
  };

  const handleSignOut = () => {
    signOut();
    navigate({ to: "/login" as any }).catch(() => {
      window.location.href = "/login";
    });
  };

  return (
    <div className="relative mx-auto min-h-screen max-w-2xl pb-32">
      {/* Antigravity Spatial Ambient Depth Background Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10" aria-hidden="true">
        <div className="absolute top-[-10%] right-[-10%] w-[480px] h-[480px] rounded-full bg-gradient-to-br from-purple-200/40 to-fuchsia-200/20 blur-3xl opacity-75" />
        <div className="absolute bottom-[12%] left-[-15%] w-[520px] h-[520px] rounded-full bg-gradient-to-tr from-violet-200/30 to-indigo-100/25 blur-3xl opacity-70" />
      </div>

      {/* Sticky Glassmorphic Header with profile, switch, and logout */}
      <header className="sticky top-0 z-30 border-b border-black/[0.04] bg-white/80 px-4 py-3 backdrop-blur-xl shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative">
              <span
                className={cn(
                  "grid h-10 w-10 shrink-0 place-items-center rounded-2xl font-display text-sm font-bold text-white shadow-xs ring-2 ring-white",
                  getAvatarColor(d.me.name)
                )}
              >
                {d.me.name.replace("Dr. ", "").split(" ").map((x) => x[0]).join("").slice(0, 2)}
              </span>
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />
            </div>
            <div className="min-w-0">
              <p className="truncate font-display font-bold text-slate-900 text-sm tracking-tight">{d.me.name}</p>
              <p className="truncate text-[11px] font-medium text-slate-500 mt-0.5">
                {role === "admin" ? "Admin" : ROLE_LABEL[role]}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setSwitchOpen(true)}
              className="grid h-8 w-8 place-items-center rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 active:scale-95 transition cursor-pointer"
              aria-label="Quick switch demo user"
              title="Quick switch demo user"
            >
              <Repeat className="h-4 w-4 text-slate-700" />
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              className="grid h-8 w-8 place-items-center rounded-full border border-slate-200 bg-white hover:bg-rose-50 text-rose-600 active:scale-95 transition cursor-pointer"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="h-4 w-4 text-rose-600" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Screen Content */}
      <main className="px-4 pt-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={active + d.me.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {isLead ? (
              <>
                {active === "dash" && (
                  <Dashboard
                    data={d}
                    onOpenEvaluation={handleOpenEvaluationFromDashboard}
                    onOpenSwitch={() => setSwitchOpen(true)}
                    onSignOut={handleSignOut}
                  />
                )}
                {active === "team" && <ManageTeam data={d} />}
                {active === "kras" && <EditKras data={d} />}
                {active === "evaluations" && (
                  <Evaluations data={d} initialStaffId={targetStaffId} />
                )}
              </>
            ) : (
              <>
                {active === "entry" && (
                  <Evaluations
                    data={d}
                    onSwitchToRate={() => setTab("rate")}
                  />
                )}
                {active === "rate" && <PeerRate data={d} />}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Tab Navigation Pill Bar (FR-06, Section 7) - Antigravity Glassmorphic Purple Floating Pill */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 p-1.5 bg-gradient-to-r from-[#4A1282]/95 via-[#601DAF]/95 to-[#4A1282]/95 backdrop-blur-2xl border border-purple-200/40 rounded-full shadow-[0_20px_50px_-8px_rgba(96,29,175,0.45),0_8px_24px_-4px_rgba(0,0,0,0.22)] h-16 max-w-[96vw] ring-1 ring-white/20">
        {/* Specular Edge Highlight */}
        <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/45 to-transparent pointer-events-none rounded-full" />
        {tabs.map(({ id, label, Icon }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => handleTabClick(id)}
              className={cn(
                "relative flex flex-col items-center justify-center h-full rounded-full z-10 transition-colors select-none",
                tabs.length === 4
                  ? "w-[74px] sm:w-[82px]"
                  : tabs.length === 3
                  ? "w-[88px] sm:w-[98px] px-2"
                  : "w-[110px] sm:w-[124px] px-3"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTabPill"
                  className="absolute inset-0 bg-white rounded-full -z-10 shadow-[0_4px_16px_rgba(255,255,255,0.4)]"
                  transition={{ type: "spring", stiffness: 350, damping: 28 }}
                />
              )}
              <Icon
                className={cn(
                  "relative z-10 h-4 w-4 sm:h-5 sm:w-5 transition-colors",
                  isActive ? "text-[#601DAF]" : "text-purple-200/80 hover:text-white"
                )}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span
                className={cn(
                  "relative z-10 text-[9px] sm:text-[10px] tracking-tight mt-0.5 transition-colors whitespace-nowrap",
                  isActive ? "text-[#601DAF] font-bold" : "text-purple-200/80 font-medium hover:text-white"
                )}
              >
                {label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Demo Switcher Bottom Sheet Popup */}
      <Sheet open={switchOpen} onOpenChange={setSwitchOpen}>
        <SheetContent
          side="bottom"
          hideClose
          className="mx-auto max-w-lg rounded-t-3xl border-t border-purple-100 bg-white px-5 pt-3 pb-8 shadow-[0_-12px_40px_rgba(0,0,0,0.15)] focus:outline-none"
        >
          {/* Native-feel sheet drag bar */}
          <div className="mx-auto -mt-1 mb-3.5 h-1 w-12 rounded-full bg-slate-300/80" />

          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <SheetTitle className="text-base font-bold text-slate-900">Quick switch demo user</SheetTitle>
              <SheetClose className="p-1 rounded-lg opacity-70 hover:opacity-100 transition cursor-pointer border-0 outline-none focus:outline-none text-slate-500 hover:text-slate-900">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </SheetClose>
            </div>

            <div className="max-h-[60vh] divide-y divide-border/60 overflow-y-auto px-1 py-1">
              {DEMO_USERS.map((u) => (
                <button
                  key={u.phone}
                  type="button"
                  onClick={() => {
                    setSwitchOpen(false);
                    quick(u.phone, u.pin);
                  }}
                  className="flex w-full items-center justify-between py-3 text-left hover:bg-slate-50 px-2 rounded-xl transition cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={cn(
                        "grid h-8 w-8 place-items-center rounded-full text-xs font-semibold text-white",
                        getAvatarColor(u.name)
                      )}
                    >
                      {u.name.replace("Dr. ", "").split(" ").map((x) => x[0]).join("").slice(0, 2)}
                    </span>
                    <div>
                      <span className="text-sm font-semibold block">{u.name}</span>
                      <span className="text-[11px] text-muted-foreground">{u.label} · PIN: {u.pin}</span>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md">
                    {u.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}