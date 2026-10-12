import type { Entry, Kra, Role } from "./scoring";
import { getStoredUser, PRD_USERS, getAllStaffUsers, type PRDUser } from "./auth";

export type StaffRow = { id: string; name: string; phone: string; role: Role; center: string; active: boolean };
export type Rating = { id: string; from_id: string; to_id: string; stars: number; tag: string | null; comment: string | null; created_at: string };
export type LoginStat = { staff_id: string; last: string | null; days7: number; total7: number };
export type Bootstrap = {
  me: { id: string; name: string; role: Role; center: string };
  staff: StaffRow[];
  kras: Kra[];
  entries: Entry[];
  ratings: Rating[];
  logins: LoginStat[];
};

export const INITIAL_KRAS: Kra[] = [
  { id: "k1", role: "phlebo", name: "Home visits completed", target: 40, unit: "visits", weight: 25, direction: "higher_better", sort: 1 },
  { id: "k2", role: "phlebo", name: "Same-day callbacks closed", target: 95, unit: "%", weight: 20, direction: "higher_better", sort: 2 },
  { id: "k3", role: "phlebo", name: "On-time collections", target: 90, unit: "%", weight: 15, direction: "higher_better", sort: 3 },
  { id: "k4", role: "phlebo", name: "Samples diverted / ignored", target: 0, unit: "samples", weight: 25, direction: "lower_better", sort: 4 },
  { id: "k5", role: "phlebo", name: "Failed / abandoned visits", target: 2, unit: "visits", weight: 15, direction: "lower_better", sort: 5 },
  { id: "k6", role: "frontdesk", name: "Digital leads logged with source", target: 100, unit: "%", weight: 25, direction: "higher_better", sort: 6 },
  { id: "k7", role: "frontdesk", name: "Lead callbacks within SLA", target: 90, unit: "%", weight: 25, direction: "higher_better", sort: 7 },
  { id: "k8", role: "frontdesk", name: "Bookings from digital leads", target: 25, unit: "bookings", weight: 25, direction: "higher_better", sort: 8 },
  { id: "k9", role: "frontdesk", name: "Junk leads correctly flagged", target: 90, unit: "%", weight: 25, direction: "higher_better", sort: 9 },
];

export const INITIAL_ENTRIES: Entry[] = [
  { staff_id: "u-priya", week_start: "2026-09-14", actuals: { k1: 40, k2: 96, k3: 91, k4: 0, k5: 1 } },
  { staff_id: "u-priya", week_start: "2026-09-21", actuals: { k1: 42, k2: 98, k3: 92, k4: 0, k5: 1 } },
  { staff_id: "u-priya", week_start: "2026-09-28", actuals: { k1: 42, k2: 98, k3: 92, k4: 0, k5: 1 } },

  { staff_id: "u-rohit", week_start: "2026-09-14", actuals: { k1: 37, k2: 84, k3: 86, k4: 1, k5: 3 } },
  { staff_id: "u-rohit", week_start: "2026-09-21", actuals: { k1: 35, k2: 80, k3: 85, k4: 2, k5: 3 } },
  { staff_id: "u-rohit", week_start: "2026-09-28", actuals: { k1: 35, k2: 80, k3: 85, k4: 2, k5: 3 } },

  { staff_id: "u-sneha", week_start: "2026-09-14", actuals: { k1: 39, k2: 94, k3: 90, k4: 0, k5: 2 } },
  { staff_id: "u-sneha", week_start: "2026-09-21", actuals: { k1: 40, k2: 95, k3: 90, k4: 0, k5: 2 } },
  { staff_id: "u-sneha", week_start: "2026-09-28", actuals: { k1: 40, k2: 95, k3: 90, k4: 0, k5: 2 } },

  { staff_id: "u-amit", week_start: "2026-09-14", actuals: { k1: 30, k2: 72, k3: 78, k4: 3, k5: 4 } },
  { staff_id: "u-amit", week_start: "2026-09-21", actuals: { k1: 28, k2: 70, k3: 75, k4: 4, k5: 5 } },
  { staff_id: "u-amit", week_start: "2026-09-28", actuals: { k1: 28, k2: 70, k3: 75, k4: 4, k5: 5 } },

  { staff_id: "u-meera", week_start: "2026-09-14", actuals: { k6: 98, k7: 93, k8: 26, k9: 90 } },
  { staff_id: "u-meera", week_start: "2026-09-21", actuals: { k6: 100, k7: 95, k8: 28, k9: 92 } },
  { staff_id: "u-meera", week_start: "2026-09-28", actuals: { k6: 100, k7: 95, k8: 28, k9: 92 } },

  { staff_id: "u-nikhil", week_start: "2026-09-14", actuals: { k6: 72, k7: 78, k8: 16, k9: 62 } },
  { staff_id: "u-nikhil", week_start: "2026-09-21", actuals: { k6: 70, k7: 75, k8: 15, k9: 60 } },
  { staff_id: "u-nikhil", week_start: "2026-09-28", actuals: { k6: 70, k7: 75, k8: 15, k9: 60 } },

  { staff_id: "u-anjali", week_start: "2026-09-14", actuals: { k6: 88, k7: 86, k8: 21, k9: 84 } },
  { staff_id: "u-anjali", week_start: "2026-09-21", actuals: { k6: 90, k7: 88, k8: 22, k9: 85 } },
  { staff_id: "u-anjali", week_start: "2026-09-28", actuals: { k6: 90, k7: 88, k8: 22, k9: 85 } },
];

export const INITIAL_RATINGS: Rating[] = [
  { id: "r1", from_id: "u-meera", to_id: "u-priya", stars: 5, tag: "Patient handling", comment: null, created_at: new Date().toISOString() },
  { id: "r2", from_id: "u-sneha", to_id: "u-rohit", stars: 3, tag: "Handoffs", comment: null, created_at: new Date().toISOString() },
  { id: "r3", from_id: "u-anjali", to_id: "u-meera", stars: 4, tag: "Lead tagging", comment: null, created_at: new Date().toISOString() },
];

const memoryStore: Record<string, string> = {};

export function getItem<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") {
    const mem = memoryStore[key];
    return mem ? JSON.parse(mem) : fallback;
  }
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      memoryStore[key] = raw;
      return JSON.parse(raw);
    }
    return fallback;
  } catch {
    return fallback;
  }
}

export function setItem<T>(key: string, value: T): void {
  const str = JSON.stringify(value);
  memoryStore[key] = str;
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, str);
  } catch (e) {
    console.error(`Error saving ${key} to localStorage:`, e);
  }
}

export function getLocalBootstrap(token?: string): Bootstrap {
  const allUsers = getAllStaffUsers();
  const defaultMe = PRD_USERS[0]!;
  let meUser: PRDUser | null = null;

  if (token) {
    meUser = allUsers.find((u) => u.id === token) ?? null;
  }
  if (!meUser) {
    meUser = getStoredUser() || defaultMe;
  }

  const me = { id: meUser.id, name: meUser.name, role: meUser.role, center: meUser.center };

  const initialStaffList: (StaffRow & { pin?: string })[] = PRD_USERS.map((u) => ({
    id: u.id,
    name: u.name,
    phone: u.phone,
    pin: u.pin,
    role: u.role,
    center: u.center,
    active: u.active,
  }));

  const staffWithPins = getItem<(StaffRow & { pin?: string })[]>("sahayog-kra-staff", initialStaffList);

  const staff: StaffRow[] = staffWithPins.map((s) => ({
    id: s.id,
    name: s.name,
    phone: s.phone,
    role: s.role,
    center: s.center,
    active: s.active,
  }));

  const kras: Kra[] = getItem<Kra[]>("sahayog-kra-kras", INITIAL_KRAS);
  const entries: Entry[] = getItem<Entry[]>("sahayog-kra-entries", INITIAL_ENTRIES);
  const ratings: Rating[] = getItem<Rating[]>("sahayog-kra-ratings", INITIAL_RATINGS);

  const isLead = meUser.role === "admin" || meUser.role === "manager";

  const logins: LoginStat[] = staff.map((s) => ({
    staff_id: s.id,
    last: new Date().toISOString(),
    days7: 5,
    total7: 7,
  }));

  const filteredStaff = staff
    .filter((s) => isLead || s.active)
    .map((s) => (meUser.role === "admin" ? s : { ...s, phone: isLead ? s.phone : "" }));

  const filteredEntries = isLead ? entries : entries.filter((e) => e.staff_id === meUser.id);
  const filteredRatings = isLead ? ratings : ratings.filter((r) => r.from_id === meUser.id);

  return {
    me,
    staff: filteredStaff,
    kras,
    entries: filteredEntries,
    ratings: filteredRatings,
    logins,
  };
}

export function saveLocalEntry(staffId: string, weekStart: string, actuals: Record<string, number>): void {
  const entries = getItem<Entry[]>("sahayog-kra-entries", INITIAL_ENTRIES);
  const idx = entries.findIndex((e) => e.staff_id === staffId && e.week_start === weekStart);
  if (idx >= 0) {
    const item = entries[idx];
    if (item) item.actuals = actuals;
  } else {
    entries.push({ staff_id: staffId, week_start: weekStart, actuals });
  }
  setItem("sahayog-kra-entries", entries);
}

export function addLocalRating(fromId: string, toId: string, stars: number, tag?: string, comment?: string): void {
  const ratings = getItem<Rating[]>("sahayog-kra-ratings", INITIAL_RATINGS);
  ratings.unshift({
    id: `r-${Date.now()}`,
    from_id: fromId,
    to_id: toId,
    stars,
    tag: tag || null,
    comment: comment || null,
    created_at: new Date().toISOString(),
  });
  setItem("sahayog-kra-ratings", ratings);
}

export function upsertLocalStaff(data: {
  id?: string;
  name?: string;
  phone?: string;
  pin?: string;
  role?: Role;
  center?: string;
  active?: boolean;
}): void {
  const initialStaffList: (StaffRow & { pin?: string })[] = PRD_USERS.map((u) => ({
    id: u.id,
    name: u.name,
    phone: u.phone,
    pin: u.pin,
    role: u.role,
    center: u.center,
    active: u.active,
  }));

  const staff = getItem<(StaffRow & { pin?: string })[]>("sahayog-kra-staff", initialStaffList);

  if (data.id) {
    const idx = staff.findIndex((s) => s.id === data.id);
    if (idx >= 0 && staff[idx]) {
      const existing = staff[idx];
      staff[idx] = {
        ...existing,
        name: data.name ?? existing.name,
        phone: data.phone ?? existing.phone,
        role: data.role ?? existing.role,
        center: data.center ?? existing.center,
        active: data.active ?? existing.active,
        pin: data.pin || existing.pin || "1234",
      };
    }
  } else {
    staff.push({
      id: `u-${Date.now()}`,
      name: data.name || "New Staff",
      phone: data.phone || "9876509999",
      pin: data.pin || "1234",
      role: data.role || "phlebo",
      center: data.center || "Nanded City",
      active: data.active ?? true,
    });
  }
  setItem("sahayog-kra-staff", staff);
}

export function upsertLocalKra(data: {
  id?: string;
  role?: "phlebo" | "frontdesk";
  name?: string;
  target?: number;
  unit?: string;
  weight?: number;
  direction?: "higher_better" | "lower_better";
}): void {
  const kras = getItem<Kra[]>("sahayog-kra-kras", INITIAL_KRAS);
  if (data.id) {
    const idx = kras.findIndex((k) => k.id === data.id);
    if (idx >= 0 && kras[idx]) {
      kras[idx] = { ...kras[idx], ...data } as Kra;
    }
  } else {
    kras.push({
      id: `k-${Date.now()}`,
      role: data.role || "phlebo",
      name: data.name || "New KRA",
      target: data.target ?? 0,
      unit: data.unit ?? "",
      weight: data.weight ?? 0,
      direction: data.direction ?? "higher_better",
      sort: kras.length + 1,
    });
  }
  setItem("sahayog-kra-kras", kras);
}

export function deleteLocalKra(id: string): void {
  const kras = getItem<Kra[]>("sahayog-kra-kras", INITIAL_KRAS);
  const updated = kras.filter((k) => k.id !== id);
  setItem("sahayog-kra-kras", updated);
}
