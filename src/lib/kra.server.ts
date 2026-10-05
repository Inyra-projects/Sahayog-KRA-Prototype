import type { Role } from "./scoring";

async function sha256(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
export const pinHash = (phone: string, pin: string) => sha256(`${phone}:${pin}`);

export async function db() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export type Me = { id: string; name: string; phone: string; role: Role; center: string };

export async function requireUser(token: string): Promise<Me> {
  if (!token) throw new Error("Not signed in");
  const sb = await db();
  const { data: s } = await sb.from("sessions").select("staff_id").eq("token_hash", await sha256(token)).maybeSingle();
  if (!s) throw new Error("Session expired — please sign in again");
  const { data: u } = await sb.from("staff").select("id,name,phone,role,center,active").eq("id", s.staff_id).single();
  if (!u || !u.active) throw new Error("Account disabled");
  return u as Me;
}

export async function newSession(staffId: string) {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const token = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
  const sb = await db();
  await sb.from("sessions").insert({ token_hash: await sha256(token), staff_id: staffId });
  await sb.from("login_events").insert({ staff_id: staffId });
  return token;
}

export async function dropSession(token: string) {
  const sb = await db();
  await sb.from("sessions").delete().eq("token_hash", await sha256(token));
}