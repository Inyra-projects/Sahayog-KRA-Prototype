import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Entry, Kra, Role } from "./scoring";
import { supabase } from "./supabase";

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
    try {
      const cleanPhone = data.phone.trim().replace(/\D/g, "");
      const cleanPin = data.pin.trim().replace(/\D/g, "");

      console.log("Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);

      const { data: user, error } = await supabase
        .from("users")
        .select("*")
        .eq("phone", cleanPhone)
        .eq("pin", cleanPin)
        .single();

      if (error) {
        console.error("Full Auth Error:", error);
        return { ok: false as const, error: `DB Error: ${error.message} (Hint: check column names or RLS)` };
      }

      if (!user) {
        return { ok: false as const, error: "Phone or PIN is incorrect" };
      }

      // Check for active if column exists, otherwise default to true
      if (user.active === false) {
        return { ok: false as const, error: "Account disabled. Contact administrator." };
      }

      return { ok: true as const, token: user.id, user };
    } catch (e) {
      console.error("Full Auth Error Exception:", e);
      return { ok: false as const, error: `Auth Exception: ${(e as Error).message}` };
    }
  });

export const logout = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: tok }).parse(d))
  .handler(async ({ data }) => {
    return { ok: true };
  });

export const getBootstrap = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: tok.optional() }).parse(d))
  .handler(async ({ data }): Promise<Bootstrap> => {
    if (!data.token) {
      throw new Error("Not signed in");
    }

    const { data: me } = await supabase.from("users").select("*").eq("id", data.token).single();
    if (!me || !me.active) throw new Error("Account disabled or not found");

    const lead = me.role === "admin" || me.role === "manager";
    
    const [{ data: staff }, { data: kras }] = await Promise.all([
      supabase.from("users").select("id,name,phone,role,center,active").order("name"),
      supabase.from("kras").select("*").order("sort"),
    ]);

    let eq = supabase.from("weekly_actuals").select("staff_id,week_start,actuals");
    if (!lead) eq = eq.eq("staff_id", me.id);
    
    let rq = supabase.from("peer_ratings").select("*").order("created_at", { ascending: false });
    if (!lead) rq = rq.eq("from_id", me.id);
    
    const [{ data: entries }, { data: ratings }] = await Promise.all([eq, rq]);

    let logins: LoginStat[] = [];
    if (lead) {
      logins = (staff ?? []).map((s) => ({
        staff_id: s.id,
        last: null,
        total7: 0,
        days7: 0,
      }));
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
    const { data: me } = await supabase.from("users").select("*").eq("id", data.token).single();
    
    if (me && (me.role === "phlebo" || me.role === "frontdesk")) {
        const { error } = await supabase
          .from("weekly_actuals")
          .upsert(
            { staff_id: me.id, week_start: data.weekStart, actuals: data.actuals, updated_at: new Date().toISOString() },
            { onConflict: "staff_id,week_start" }
          );
        if (error) throw new Error(error.message || "Failed to save entry");
      } else {
        throw new Error("Unauthorized");
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
    const { data: me } = await supabase.from("users").select("*").eq("id", data.token).single();
    
    if (me && data.toId !== me.id) {
      const { error } = await supabase.from("peer_ratings").insert({
        from_id: me.id,
        to_id: data.toId,
        stars: data.stars,
        tag: data.tag || null,
        comment: data.comment || null,
      });
      if (error) throw new Error(error.message || "Failed to add rating");
    } else {
      throw new Error("Unauthorized or invalid user");
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
    const { data: me } = await supabase.from("users").select("*").eq("id", data.token).single();
    if (me && me.role === "admin") {
      const cleanPhone = data.phone.trim().replace(/\D/g, "");
      const row: Record<string, unknown> = { name: data.name, phone: cleanPhone, role: data.role, center: data.center, active: data.active };
      if (data.pin) row["pin"] = data.pin;
      
      let error;
      if (data.id) {
        const res = await supabase.from("users").update(row).eq("id", data.id);
        error = res.error;
      } else {
        const res = await supabase.from("users").insert(row);
        error = res.error;
      }
      
      if (error) {
        throw new Error(error.message || "Failed to save staff");
      }
    } else {
      throw new Error("Unauthorized");
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
    const { data: me } = await supabase.from("users").select("*").eq("id", data.token).single();
    if (me && me.role === "admin") {
      const { token: _t, id, ...row } = data;
      let error;
      if (id) {
        const res = await supabase.from("kras").update(row).eq("id", id);
        error = res.error;
      } else {
        const res = await supabase.from("kras").insert({ ...row, sort: 100 });
        error = res.error;
      }
      if (error) throw new Error(error.message || "Failed to save KRA");
    } else {
      throw new Error("Unauthorized");
    }
    return { ok: true };
  });

export const deleteKra = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: tok, id: z.string().max(60) }).parse(d))
  .handler(async ({ data }) => {
    const { data: me } = await supabase.from("users").select("*").eq("id", data.token).single();
    if (me && me.role === "admin") {
      const { error } = await supabase.from("kras").delete().eq("id", data.id);
      if (error) throw new Error(error.message || "Failed to delete KRA");
    } else {
      throw new Error("Unauthorized");
    }
    return { ok: true };
  });