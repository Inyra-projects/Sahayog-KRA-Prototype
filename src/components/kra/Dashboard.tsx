import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, ChevronDown, Star, Users } from "lucide-react";
import type { Bootstrap } from "@/lib/kra.functions";
import { achievement, band, krasFor, monthLabel, monthOfWeek, personMonth, ROLE_LABEL, weekLabel, weekScore, type Role } from "@/lib/scoring";
import { CENTER_ADDR, CENTER_NAME } from "@/lib/demo";
import { BandBadge, bandSoft, ScoreBar } from "./BandBadge";
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
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn("rounded-3xl p-5 shadow-card", center !== null ? bandSoft[band(center)] : "bg-muted")}
      >
        <p className="text-xs font-semibold uppercase tracking-wider opacity-80">{CENTER_NAME}</p>
        <p className="text-[11px] opacity-70">{CENTER_ADDR}</p>
        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <p className="font-display text-5xl font-semibold tabular">{center !== null ? `${Math.round(center)}%` : "—"}</p>
            <p className="mt-1 text-sm font-medium opacity-80">Center score · {monthLabel(month)}</p>
          </div>
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-xl border border-current/20 bg-card px-3 py-2 text-sm font-semibold text-foreground"
          >
            {months.map((m) => (
              <option key={m} value={m}>{monthLabel(m)}</option>
            ))}
          </select>
        </div>
      </motion.section>

      <div className="grid grid-cols-3 gap-1 rounded-2xl bg-muted p-1">
        {([
          ["rollup", "Monthly roll-up", Users],
          ["peer", "Peer signals", Star],
          ["logins", "Login activity", Activity],
        ] as const).map(([id, label, Icon]) => (
          <button key={id} type="button" onClick={() => setTab(id)} className="relative rounded-xl px-2 py-2 text-xs font-semibold">
            {tab === id && <motion.span layoutId="dash-tab" className="absolute inset-0 rounded-xl bg-card shadow-card" />}
            <span className={cn("relative flex items-center justify-center gap-1.5", tab === id ? "text-foreground" : "text-muted-foreground")}>
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{label}</span>
            </span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.18 }}>
          {tab === "rollup" && (
            <div className="space-y-3">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {FILTERS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFilter(f.id)}
                    className={cn(
                      "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition active:scale-95",
                      filter === f.id ? "border-primary bg-primary text-primary-foreground" : "border-border/70 bg-card text-muted-foreground",
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
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="card-surface overflow-hidden">
      <button type="button" onClick={() => setOpen(!open)} className="w-full p-4 text-left">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div className="min-w-0">
            <p className="truncate font-display font-semibold">{name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {ROLE_LABEL[role]} · {pm.weeks.length} week{pm.weeks.length === 1 ? "" : "s"}
              {avg !== null && <> · <Star className="inline h-3 w-3 fill-star text-star" /> {avg.toFixed(1)}</>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <BandBadge score={pm.month} showLabel={false} />
            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition", open && "rotate-180")} />
          </div>
        </div>
        {pm.month !== null && <div className="mt-3"><ScoreBar score={pm.month} /></div>}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="space-y-3 border-t border-border/60 bg-surface/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Week drill-down</p>
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
              <p className="font-display text-lg font-semibold tabular">{l?.days7 ?? 0}<span className="text-xs text-muted-foreground">/7</span></p>
              <p className="text-[11px] text-muted-foreground">days active</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}