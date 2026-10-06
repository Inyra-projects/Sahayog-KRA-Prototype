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

  return (
    <div className="space-y-5">
      <motion.section
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -2 }}
        transition={{ type: "spring", stiffness: 350, damping: 25 }}
        className="rounded-[32px] bg-[#1A1C20] p-[24px] text-white shadow-xl relative"
      >
        <div className="absolute inset-0 rounded-[32px] shadow-[0px_20px_25px_-5px_rgba(0,0,0,0.1),0px_8px_10px_-6px_rgba(0,0,0,0.1)] pointer-events-none" />
        
        <div className="flex justify-between items-start relative z-10">
          <div className="flex flex-col gap-[6px] items-start">
            <span className="inline-flex items-center gap-[5px] rounded-full bg-white/10 px-[12px] py-[4px] text-[10px] font-semibold tracking-[0.5px] text-[#cad5e2]">
              <span className="h-[6px] w-[6px] rounded-full bg-emerald-400" />
              {CENTER_NAME}
            </span>
            <p className="text-[11px] font-normal text-[#90a1b9] pl-1">{CENTER_ADDR}</p>
          </div>
        </div>
        
        <div className="mt-8 flex gap-6 items-start justify-between w-full relative z-10">
          <div className="flex flex-1 flex-col items-start justify-between min-w-0 pr-4">
            <p className="text-[11px] font-medium leading-[16.5px] text-[#b2c5df] max-w-[200px]">
              Average weekly scores across the Sep-Oct 2026 review period.
            </p>
            <div className="mt-2 flex flex-col gap-[6px]">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-white">
                <Calendar className="h-4 w-4" />
                <span>28 Sep-4 Oct, 2026 • Week 39</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-white">
                <Users className="h-4 w-4" />
                <span>{shown.length} Team members</span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col items-center justify-center whitespace-nowrap">
            <p className="text-[11px] font-medium text-[#b2c5df]">Center score</p>
            <p className="font-sans text-[42px] font-bold tracking-[-1.05px] text-white tabular-nums leading-[1.1]">
              {center !== null ? <NumberTicker value={Math.round(center)} /> : "—"}
              {center !== null && "%"}
            </p>
          </div>
        </div>

        <div className="mt-8 flex justify-between px-2 relative z-10">
          {([
            ["rollup", "Roll-up", Users],
            ["peer", "Peers", Star],
            ["logins", "Logins", Activity],
          ] as const).map(([id, label, Icon]) => (
            <button key={id} type="button" onClick={() => setTab(id)} className="flex flex-col items-center gap-[7.5px] group">
              <div className={cn("flex h-[56px] w-[56px] items-center justify-center rounded-full transition-all active:scale-95", tab === id ? "bg-white text-[#1a1c20] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)]" : "bg-white/10 text-white group-hover:bg-white/20")}>
                <Icon className="h-[22px] w-[22px]" />
              </div>
              <span className={cn("text-[11px] font-medium transition-colors", tab === id ? "text-white" : "text-[#90a1b9]")}>{label}</span>
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
              
              <div className="mt-4 mb-4 flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
                {FILTERS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFilter(f.id)}
                    className={cn(
                      "whitespace-nowrap rounded-full px-4 py-2 text-[11px] font-semibold transition-all",
                      filter === f.id
                        ? "bg-[#1A1C20] text-white shadow-md"
                        : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300"
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
              <span className="text-slate-900 tabular">{Math.round(pm.month)}% actual</span>
              <span className="text-slate-400 tabular">100% target</span>
            </div>
            <ScoreBar score={pm.month} />
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
                    className={cn("rounded-xl border px-3 py-2 text-left text-xs transition active:scale-95", week === w.ws ? "border-primary bg-card" : "border-border/60 bg-card/60")}
                  >
                    <p className="font-semibold">{weekLabel(w.ws)}</p>
                    <BandBadge score={w.score} showLabel={false} className="mt-1" />
                  </button>
                ))}
                {!pm.weeks.length && <p className="text-sm text-muted-foreground">No weekly entries this month.</p>}
              </div>
              {entry && (
                <div className="space-y-2 rounded-2xl bg-card p-3">
                  {ks.map((k) => {
                    const a = achievement(k, entry.actuals[k.id]) * 100;
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
                    <span className="tabular">{Math.round(weekScore(ks, entry.actuals))}%</span>
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