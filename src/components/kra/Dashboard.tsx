import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, Calendar, ChevronDown, Star, Users } from "lucide-react";
import type { Bootstrap } from "@/lib/kra.functions";
import { achievement, band, krasFor, monthLabel, monthOfWeek, personMonth, ROLE_LABEL, weekLabel, weekScore, type Role } from "@/lib/scoring";
import { CENTER_ADDR, CENTER_NAME } from "@/lib/demo";
import { BandBadge, bandSoft, ScoreBar } from "./BandBadge";
import { NumberTicker } from "./NumberTicker";
import { cn } from "@/lib/utils";

type Filter = "all" | "phlebo" | "frontdesk";
const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "phlebo", label: "Home Phlebotomy" },
  { id: "frontdesk", label: "Front Desk" },
];

export function Dashboard({ data }: { data: Bootstrap }) {
  const months = useMemo(() => {
    const s = new Set(data.entries.map((e) => monthOfWeek(e.week_start)));
    return [...s].sort().reverse();
  }, [data.entries]);
  const [month, setMonth] = useState(months[0] ?? new Date().toISOString().slice(0, 7));
  const [filter, setFilter] = useState<Filter>("all");
  const [tab, setTab] = useState<"rollup" | "peer" | "logins">("rollup");

  const people = data.staff.filter((s) => s.active && (s.role === "phlebo" || s.role === "frontdesk"));
  const rows = people.map((p) => ({ p, pm: personMonth(data.kras, p.role, data.entries, p.id, month) }));
  const shown = rows.filter((r) => filter === "all" || r.p.role === filter).sort((a, b) => (b.pm.month ?? -1) - (a.pm.month ?? -1));
  const scored = rows.filter((r) => r.pm.month !== null);
  const center = scored.length ? scored.reduce((s, r) => s + (r.pm.month ?? 0), 0) / scored.length : null;
  const onTrackCount = shown.filter((r) => r.pm.month !== null && r.pm.month >= 90).length;
  const latestWeek = shown[0]?.pm.weeks[shown[0]?.pm.weeks.length - 1]?.ws;
  const activeWeekLabel = latestWeek ? weekLabel(latestWeek) : "Current review";

  return (
    <div className="space-y-5">
      <motion.section
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -2 }}
        transition={{ type: "spring", stiffness: 350, damping: 25 }}
        className="rounded-[32px] bg-gradient-to-br from-[#601DAF] via-[#7B2CBF] to-[#4A1282] p-[24px] text-white shadow-[0_24px_50px_-12px_rgba(107,33,168,0.45),0_8px_20px_-4px_rgba(0,0,0,0.25)] border border-purple-200/30 relative overflow-hidden"
      >
        {/* Specular Ambient Glows & Highlights */}
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-fuchsia-400/25 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-violet-400/30 blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/3 -translate-y-1/2 h-48 w-48 rounded-full bg-purple-300/15 blur-2xl pointer-events-none" />
        <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none" />

        {/* Top Header Row */}
        <div className="flex justify-between items-start relative z-10 gap-3">
          <div className="flex flex-col gap-1.5 items-start">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-3.5 py-1.5 text-[11px] font-semibold tracking-wide text-white border border-white/20 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
              {CENTER_NAME}
            </span>
            <p className="text-[11px] font-normal text-purple-100/80 pl-1">{CENTER_ADDR}</p>
          </div>
        </div>

        {/* Middle Stats & Center Score */}
        <div className="mt-7 flex gap-5 items-center justify-between w-full relative z-10">
          <div className="flex flex-1 flex-col items-start min-w-0 pr-2">
            <p className="text-[12px] font-medium leading-relaxed text-purple-50/95 max-w-[220px]">
              Average weekly performance across the review period.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <div className="inline-flex items-center gap-1.5 rounded-xl bg-white/[0.12] backdrop-blur-sm border border-white/15 px-2.5 py-1.5 text-[11px] font-medium text-white">
                <Calendar className="h-3.5 w-3.5 text-purple-200" />
                <span>{activeWeekLabel}</span>
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-xl bg-white/[0.12] backdrop-blur-sm border border-white/15 px-2.5 py-1.5 text-[11px] font-medium text-white">
                <Users className="h-3.5 w-3.5 text-purple-200" />
                <span>{shown.length} staff</span>
                {onTrackCount > 0 && (
                  <span className="rounded-md bg-emerald-400/25 px-1.5 py-0.5 text-[9px] font-bold text-emerald-200 border border-emerald-300/30">
                    {onTrackCount} on track
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Hero Center Score Badge */}
          <div className="relative rounded-2xl bg-white/[0.12] backdrop-blur-md border border-white/25 px-5 py-4 shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_8px_20px_rgba(0,0,0,0.2)] flex flex-col items-center justify-center min-w-[132px]">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-100/90">Center Score</span>
              {center !== null && (
                <span
                  className={cn(
                    "h-2 w-2 rounded-full",
                    center >= 90
                      ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]"
                      : center >= 70
                        ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]"
                        : "bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.9)]"
                  )}
                />
              )}
            </div>
            <p className="font-display text-[44px] font-extrabold tracking-tight text-white tabular-nums leading-none mt-2 drop-shadow-sm">
              {center !== null ? <NumberTicker value={Math.min(100, Math.round(center))} /> : "—"}
              {center !== null && <span className="text-[26px] font-bold text-purple-200 ml-0.5">%</span>}
            </p>
          </div>
        </div>

        {/* Tab Navigation Segmented Bar */}
        <div className="mt-6 flex justify-between items-center gap-2 p-1.5 rounded-full bg-black/20 backdrop-blur-md border border-white/15 relative z-10">
          {([
            ["rollup", "Roll-up", Users],
            ["peer", "Peers", Star],
            ["logins", "Logins", Activity],
          ] as const).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-full transition-all duration-200 active:scale-95",
                tab === id
                  ? "bg-white text-[#601DAF] shadow-[0_4px_16px_rgba(255,255,255,0.4)] font-semibold"
                  : "bg-white/[0.10] text-purple-100 hover:bg-white/[0.20] hover:text-white border border-white/10"
              )}
            >
              <Icon className={cn("h-4 w-4", tab === id ? "text-[#601DAF]" : "text-purple-200")} />
              <span className="text-[13px] font-bold tracking-tight">{label}</span>
            </button>
          ))}
        </div>
      </motion.section>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.18 }}>
          {tab === "rollup" && (
            <div className="space-y-3">
              <div className="mt-8 flex items-start justify-between">
                <div>
                  <h2 className="text-[19px] font-bold text-slate-900 tracking-tight">Team scorecards</h2>
                  <p className="mt-1 text-[11px] text-slate-500 font-medium">Weekly average · tap a person for week drill-down</p>
                </div>
              </div>
              
              <div className="mt-4 mb-4 flex gap-2 overflow-x-auto py-1 hide-scrollbar">
                {FILTERS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFilter(f.id)}
                    className={cn(
                      "whitespace-nowrap rounded-full px-4 py-2 text-[11px] font-semibold transition-all active:scale-95",
                      filter === f.id
                        ? "bg-gradient-to-r from-[#601DAF] via-[#7B2CBF] to-[#4A1282] text-white border border-purple-300/30"
                        : "border border-slate-200 bg-slate-100/80 text-slate-700 hover:bg-slate-200/80 hover:text-slate-900"
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              {shown.map(({ p, pm }, i) => (
                <PersonCard key={p.id} i={i} name={p.name} role={p.role} pm={pm} data={data} />
              ))}
              {!shown.length && <p className="py-8 text-center text-sm text-muted-foreground">No staff in this group.</p>}
            </div>
          )}
          {tab === "peer" && <PeerSignals data={data} />}
          {tab === "logins" && <Logins data={data} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function PersonCard({ i, name, role, pm, data }: { i: number; name: string; role: Role; pm: ReturnType<typeof personMonth>; data: Bootstrap }) {
  const [open, setOpen] = useState(false);
  const [week, setWeek] = useState<string | null>(null);
  const ks = krasFor(data.kras, role);
  const entry = week ? data.entries.find((e) => e.staff_id === pm.staffId && e.week_start === week) : null;
  const ratings = data.ratings.filter((r) => r.to_id === pm.staffId);
  const avg = ratings.length ? ratings.reduce((s, r) => s + r.stars, 0) / ratings.length : null;
  return (
    <motion.div layout initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -2 }} transition={{ delay: i * 0.05, type: "spring", stiffness: 350, damping: 25 }} className="card-surface overflow-hidden">
      <button type="button" onClick={() => setOpen(!open)} className="w-full p-4 text-left">
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4">
          <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-[14px] border", pm.month !== null ? bandSoft[band(pm.month)] : "bg-slate-50 text-slate-400 border-slate-100")}>
            <Users className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-sans font-semibold text-slate-900">{name}</p>
            <p className="truncate text-[11px] text-slate-400">
              {ROLE_LABEL[role]} · {pm.weeks.length} week{pm.weeks.length === 1 ? "" : "s"}
              {avg !== null && <> · <Star className="inline h-3 w-3 fill-star text-star" /> {avg.toFixed(1)}</>}
            </p>
          </div>
          <ChevronDown className={cn("h-4 w-4 text-slate-300 transition", open ? "rotate-0" : "-rotate-90")} />
        </div>
        {pm.month !== null && (
          <div className="mt-4 flex flex-col gap-2">
            <div className="flex justify-between text-[11px] font-semibold">
              <span className="text-slate-900 tabular">{Math.min(100, Math.round(pm.month))}% actual</span>
              <span className="text-slate-400 tabular">100% target</span>
            </div>
            <ScoreBar score={Math.min(100, pm.month)} />
          </div>
        )}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} transition={{ type: "spring", stiffness: 350, damping: 25 }} className="overflow-hidden">
            <div className="space-y-3 border-t border-border/60 bg-surface/50 p-4">
              <p className="text-[11px] uppercase tracking-[0.08em] font-semibold text-slate-400">Week drill-down</p>
              <div className="flex flex-wrap gap-2">
                {pm.weeks.map((w) => (
                  <button
                    key={w.ws}
                    type="button"
                    onClick={() => setWeek(week === w.ws ? null : w.ws)}
                    className={cn(
                      "rounded-xl border px-3 py-2 text-left text-xs transition active:scale-95",
                      week === w.ws
                        ? "border-[#601DAF] bg-purple-50/70 text-[#4A1282] font-semibold shadow-sm"
                        : "border-purple-100/70 bg-card/70 hover:border-purple-200 hover:bg-purple-50/30"
                    )}
                  >
                    <p className="font-semibold">{weekLabel(w.ws)}</p>
                    <BandBadge score={Math.min(100, w.score)} showLabel={false} className="mt-1" />
                  </button>
                ))}
                {!pm.weeks.length && <p className="text-sm text-muted-foreground">No weekly entries this month.</p>}
              </div>
              {entry && (
                <div className="space-y-2 rounded-2xl bg-card p-3">
                  {ks.map((k) => {
                    const a = Math.min(100, achievement(k, entry.actuals[k.id]) * 100);
                    return (
                      <div key={k.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 text-sm">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{k.name}</p>
                          <p className="text-xs text-muted-foreground tabular">
                            {entry.actuals[k.id] ?? "—"} / target {k.direction === "lower_better" ? "≤ " : ""}{k.target} {k.unit} · {k.weight}%
                          </p>
                        </div>
                        <BandBadge score={a} showLabel={false} />
                      </div>
                    );
                  })}
                  <div className="flex justify-between border-t border-border/60 pt-2 text-sm font-semibold">
                    <span>Week score</span>
                    <span className="tabular">{Math.min(100, Math.round(weekScore(ks, entry.actuals)))}%</span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function Stars({ n }: { n: number }) {
  return (
    <span className="inline-flex">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={cn("h-3.5 w-3.5", i <= Math.round(n) ? "fill-star text-star" : "text-muted-foreground/30")} />
      ))}
    </span>
  );
}

function PeerSignals({ data }: { data: Bootstrap }) {
  const name = (id: string) => data.staff.find((s) => s.id === id)?.name ?? "Former staff";
  const people = data.staff.filter((s) => s.role === "phlebo" || s.role === "frontdesk");
  return (
    <div className="space-y-4">
      <p className="rounded-2xl bg-accent px-4 py-3 text-xs font-medium text-accent-foreground">
        Peer ratings are a separate signal. They never change anyone's KRA score.
      </p>
      <div className="card-surface divide-y divide-border/60">
        {people.map((p) => {
          const rs = data.ratings.filter((r) => r.to_id === p.id);
          const avg = rs.length ? rs.reduce((s, r) => s + r.stars, 0) / rs.length : 0;
          return (
            <div key={p.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
              <p className="truncate text-sm font-semibold">{p.name}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground tabular">
                {rs.length ? <><Stars n={avg} /> {avg.toFixed(1)} · {rs.length}</> : "No ratings"}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recent ratings</p>
      <div className="space-y-2">
        {data.ratings.map((r) => (
          <div key={r.id} className="card-surface p-3.5 text-sm">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
              <p className="truncate"><span className="font-semibold">{name(r.to_id)}</span> <span className="text-muted-foreground">from {name(r.from_id)}</span></p>
              <Stars n={r.stars} />
            </div>
            {r.tag && <span className="mt-2 inline-block rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold">{r.tag}</span>}
            {r.comment && <p className="mt-1.5 text-muted-foreground">“{r.comment}”</p>}
          </div>
        ))}
        {!data.ratings.length && <p className="text-sm text-muted-foreground">No ratings yet.</p>}
      </div>
    </div>
  );
}

function Logins({ data }: { data: Bootstrap }) {
  const people = data.staff.filter((s) => s.active && (s.role === "phlebo" || s.role === "frontdesk"));
  return (
    <div className="card-surface divide-y divide-border/60">
      {people.map((p) => {
        const l = data.logins.find((x) => x.staff_id === p.id);
        return (
          <div key={p.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{p.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                Last login: {l?.last ? new Date(l.last).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "Never"}
              </p>
            </div>
            <div className="text-right">
              <p className="font-display text-lg font-bold tracking-tight tabular"><NumberTicker value={l?.days7 ?? 0} /><span className="text-xs font-semibold text-muted-foreground">/7</span></p>
              <p className="text-[11px] font-medium text-muted-foreground">days active</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}