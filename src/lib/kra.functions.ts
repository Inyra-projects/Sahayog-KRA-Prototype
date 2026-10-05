import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Entry, Kra, Role } from "./scoring";
import { authenticateLocal, getStoredUser, logoutLocal } from "./auth";
import {
  addLocalRating,
  deleteLocalKra,
  getLocalBootstrap,
  saveLocalEntry,
  upsertLocalKra,
  upsertLocalStaff,
} from "./localStore";

const tok = z.string().min(1).max(200);
const phone = z.string().regex(/^\d{10}$/, "Phone must be 10 digits");
const pin = z.string().regex(/^\d{4}$/, "PIN must be 4 digits");

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

export const login = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ phone, pin }).parse(d))
  .handler(async ({ data }) => {
    // Synchronous local match against PRD users
    const res = authenticateLocal(data.phone, data.pin);
    if (!res.ok || !res.user) {
      return { ok: false as const, error: res.error || "Phone or PIN is incorrect" };
    }
    return { ok: true as const, token: res.user.id, user: res.user };
  });

export const logout = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: tok }).parse(d))
  .handler(async ({ data }) => {
    logoutLocal();
    return { ok: true };
  });

export const getBootstrap = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: tok.optional() }).parse(d))
  .handler(async ({ data }): Promise<Bootstrap> => {
    try {
      const { db, requireUser } = await import("./kra.server");
      if (data.token) {
        const me = await requireUser(data.token);
        const sb = await db();
        const lead = me.role === "admin" || me.role === "manager";
        const [{ data: staff }, { data: kras }] = await Promise.all([
          sb.from("staff").select("id,name,phone,role,center,active").order("name"),
          sb.from("kras").select("*").order("sort"),
        ]);
        let eq = sb.from("weekly_entries").select("staff_id,week_start,actuals");
        if (!lead) eq = eq.eq("staff_id", me.id);
        let rq = sb.from("peer_ratings").select("*").order("created_at", { ascending: false });
        if (!lead) rq = rq.eq("from_id", me.id);
        const [{ data: entries }, { data: ratings }] = await Promise.all([eq, rq]);

        let logins: LoginStat[] = [];
        if (lead) {
          const since = new Date(Date.now() - 7 * 864e5).toISOString();
          const [{ data: recent }, { data: all }] = await Promise.all([
            sb.from("login_events").select("staff_id,at").gte("at", since),
            sb.from("login_events").select("staff_id,at").order("at", { ascending: false }).limit(1000),
          ]);
          logins = (staff ?? []).map((s) => {
            const r = (recent ?? []).filter((e) => e.staff_id === s.id);
            return {
              staff_id: s.id,
              last: (all ?? []).find((e) => e.staff_id === s.id)?.at ?? null,
              total7: r.length,
              days7: new Set(r.map((e) => e.at.slice(0, 10))).size,
            };
          });
        }
        return {
          me: { id: me.id, name: me.name, role: me.role, center: me.center },
          staff: ((staff ?? []) as StaffRow[])
            .filter((s) => lead || s.active)
            .map((s) => (me.role === "admin" ? s : { ...s, phone: lead ? s.phone : "" })),
          kras: (kras ?? []) as Kra[],
          entries: (entries ?? []) as Entry[],
          ratings: (ratings ?? []) as Rating[],
          logins,
        };
      }
    } catch {
      // Fallback to localStore when Supabase DB is unconfigured/unavailable
    }
    return getLocalBootstrap();
  });

export const saveEntry = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        token: tok,
        weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        actuals: z.record(z.string().max(60), z.number().min(0).max(100000)),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    saveLocalEntry(data.weekStart, data.actuals);
    try {
      const { db, requireUser } = await import("./kra.server");
      const me = await requireUser(data.token);
      if (me.role === "phlebo" || me.role === "frontdesk") {
        const sb = await db();
        await sb
          .from("weekly_entries")
          .upsert({ staff_id: me.id, week_start: data.weekStart, actuals: data.actuals, updated_at: new Date().toISOString() }, { onConflict: "staff_id,week_start" });
      }
    } catch {
      // Supabase unconfigured, local update saved
    }
    return { ok: true };
  });

export const addRating = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        token: tok,
        toId: z.string(),
        stars: z.number().int().min(1).max(5),
        tag: z.string().trim().max(60).optional(),
        comment: z.string().trim().max(500).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    addLocalRating(data.toId, data.stars, data.tag, data.comment);
    try {
      const { db, requireUser } = await import("./kra.server");
      const me = await requireUser(data.token);
      if (data.toId !== me.id) {
        const sb = await db();
        await sb.from("peer_ratings").insert({
          from_id: me.id,
          to_id: data.toId,
          stars: data.stars,
          tag: data.tag || null,
          comment: data.comment || null,
        });
      }
    } catch {
      // Supabase unconfigured, local update saved
    }
    return { ok: true };
  });

export const upsertStaff = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        token: tok,
        id: z.string().optional(),
        name: z.string().trim().min(1).max(80),
        phone,
        pin: pin.optional(),
        role: z.enum(["admin", "manager", "phlebo", "frontdesk"]),
        center: z.string().trim().min(1).max(80),
        active: z.boolean(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    upsertLocalStaff({
      id: data.id,
      name: data.name,
      phone: data.phone,
      pin: data.pin,
      role: data.role,
      center: data.center,
      active: data.active,
    });
    try {
      const { db, requireUser, pinHash } = await import("./kra.server");
      const me = await requireUser(data.token);
      if (me.role === "admin") {
        const sb = await db();
        const row: Record<string, unknown> = { name: data.name, phone: data.phone, role: data.role, center: data.center, active: data.active };
        if (data.pin) row["pin_hash"] = await pinHash(data.phone, data.pin);
        const staffTable = sb.from("staff") as any;
        if (data.id) {
          await staffTable.update(row).eq("id", data.id);
        } else {
          await staffTable.insert(row);
        }
      }
    } catch {
      // Supabase unconfigured, local update saved
    }
    return { ok: true };
  });

export const upsertKra = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        token: tok,
        id: z.string().max(60).optional(),
        role: z.enum(["phlebo", "frontdesk"]),
        name: z.string().trim().min(1).max(120),
        target: z.number().min(0).max(100000),
        unit: z.string().trim().max(20),
        weight: z.number().min(0).max(100),
        direction: z.enum(["higher_better", "lower_better"]),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    upsertLocalKra(data);
    try {
      const { db, requireUser } = await import("./kra.server");
      const me = await requireUser(data.token);
      if (me.role === "admin") {
        const sb = await db();
        const { token: _t, id, ...row } = data;
        if (id) {
          await sb.from("kras").update(row).eq("id", id);
        } else {
          await sb.from("kras").insert({ ...row, sort: 100 });
        }
      }
    } catch {
      // Supabase unconfigured, local update saved
    }
    return { ok: true };
  });

export const deleteKra = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: tok, id: z.string().max(60) }).parse(d))
  .handler(async ({ data }) => {
    deleteLocalKra(data.id);
    try {
      const { db, requireUser } = await import("./kra.server");
      const me = await requireUser(data.token);
      if (me.role === "admin") {
        const sb = await db();
        await sb.from("kras").delete().eq("id", data.id);
      }
    } catch {
      // Supabase unconfigured, local update saved
    }
    return { ok: true };
  });