export type Role = "admin" | "manager" | "phlebo" | "frontdesk";
export type Kra = {
  id: string;
  role: "phlebo" | "frontdesk";
  name: string;
  target: number;
  unit: string;
  weight: number;
  direction: "higher_better" | "lower_better";
  sort: number;
};
export type Entry = { staff_id: string; week_start: string; actuals: Record<string, number> };
export type Band = "green" | "amber" | "red";

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Admin",
  manager: "Center manager",
  phlebo: "Home-collection phlebotomist",
  frontdesk: "Front desk / digital leads",
};

/** Achievement for one KRA as a fraction (1 = 100%), capped at 120%. */
export function achievement(k: Kra, actual: number | undefined): number {
  if (actual === undefined || actual === null || Number.isNaN(actual)) return 0;
  const t = Number(k.target);
  if (k.direction === "higher_better") {
    if (t <= 0) return 1.2;
    return Math.max(0, Math.min(actual / t, 1.2));
  }
  if (t === 0) return Math.max(0, 1 - actual * 0.25);
  if (actual <= t) return 1;
  return Math.max(0, 1 - (actual - t) * 0.2);
}

/** Weighted week score in percent. */
export function weekScore(kras: Kra[], actuals: Record<string, number>): number {
  const totalW = kras.reduce((s, k) => s + Number(k.weight), 0);
  if (!totalW) return 0;
  return (kras.reduce((s, k) => s + achievement(k, actuals[k.id]) * Number(k.weight), 0) / totalW) * 100;
}

export function band(score: number): Band {
  if (score >= 90) return "green";
  if (score >= 70) return "amber";
  return "red";
}

export const BAND_LABEL: Record<Band, string> = { green: "On track", amber: "Watch", red: "At risk" };

/* ---------- week helpers (Mon–Sun weeks) ---------- */
function parse(d: string) {
  const parts = d.split("-").map(Number);
  const y = parts[0] ?? 2026;
  const m = parts[1] ?? 1;
  const day = parts[2] ?? 1;
  return new Date(Date.UTC(y, m - 1, day));
}
export function fmt(d: Date) {
  return d.toISOString().slice(0, 10);
}
export function mondayOf(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dow = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dow);
  return fmt(d);
}
export function addWeeks(ws: string, n: number) {
  const d = parse(ws);
  d.setUTCDate(d.getUTCDate() + n * 7);
  return fmt(d);
}
/** A week belongs to the month containing its Thursday (ISO rule). */
export function monthOfWeek(ws: string): string {
  const d = parse(ws);
  d.setUTCDate(d.getUTCDate() + 3);
  return fmt(d).slice(0, 7);
}
export function weekLabel(ws: string) {
  const s = parse(ws);
  const e = parse(ws);
  e.setUTCDate(e.getUTCDate() + 6);
  const o: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", timeZone: "UTC" };
  return `${s.toLocaleDateString("en-IN", o)} – ${e.toLocaleDateString("en-IN", o)}`;
}
export function monthLabel(m: string) {
  return parse(m + "-01").toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });
}

export function krasFor(kras: Kra[], role: Role) {
  return kras.filter((k) => k.role === role).sort((a, b) => a.sort - b.sort);
}

export type PersonMonth = { staffId: string; month: number | null; weeks: { ws: string; score: number }[] };

export function personMonth(kras: Kra[], role: Role, entries: Entry[], staffId: string, month: string): PersonMonth {
  const ks = krasFor(kras, role);
  const weeks = entries
    .filter((e) => e.staff_id === staffId && monthOfWeek(e.week_start) === month)
    .sort((a, b) => a.week_start.localeCompare(b.week_start))
    .map((e) => ({ ws: e.week_start, score: weekScore(ks, e.actuals) }));
  const m = weeks.length ? weeks.reduce((s, w) => s + w.score, 0) / weeks.length : null;
  return { staffId, month: m, weeks };
}