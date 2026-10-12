import type { Role, Kra, Entry } from "./scoring";
import { authenticateLocal, logoutLocal, getStoredUser } from "./auth";
import {
  getLocalBootstrap,
  saveLocalEntry,
  addLocalRating,
  upsertLocalStaff,
  upsertLocalKra,
  deleteLocalKra,
  type StaffRow,
  type Rating,
  type LoginStat,
  type Bootstrap,
} from "./localStore";

export type { StaffRow, Rating, LoginStat, Bootstrap };

export async function login({ data }: { data: { phone: string; pin: string } }) {
  try {
    const res = authenticateLocal(data.phone, data.pin);
    if (!res.ok || !res.user) {
      return { ok: false as const, error: res.error || "Phone or PIN is incorrect" };
    }
    return { ok: true as const, token: res.user.id, user: res.user };
  } catch (e) {
    return { ok: false as const, error: (e as Error).message };
  }
}

export async function logout({ data }: { data?: { token?: string } } = {}) {
  logoutLocal();
  return { ok: true };
}

export async function getBootstrap({ data }: { data?: { token?: string } } = {}): Promise<Bootstrap> {
  const token = data?.token || getStoredUser()?.id;
  return getLocalBootstrap(token);
}

export async function saveEntry({
  data,
}: {
  data: {
    token: string;
    weekStart: string;
    actuals: Record<string, number>;
  };
}) {
  const staffId = data.token || getStoredUser()?.id;
  if (!staffId) {
    throw new Error("Unauthorized");
  }
  saveLocalEntry(staffId, data.weekStart, data.actuals);
  return { ok: true };
}

export async function addRating({
  data,
}: {
  data: {
    token: string;
    toId: string;
    stars: number;
    tag?: string;
    comment?: string;
  };
}) {
  const fromId = data.token || getStoredUser()?.id;
  if (!fromId) {
    throw new Error("Unauthorized");
  }
  if (fromId === data.toId) {
    throw new Error("Cannot rate yourself");
  }
  addLocalRating(fromId, data.toId, data.stars, data.tag, data.comment);
  return { ok: true };
}

export async function upsertStaff({
  data,
}: {
  data: {
    token: string;
    id?: string;
    name: string;
    phone: string;
    pin?: string;
    role: Role;
    center: string;
    active: boolean;
  };
}) {
  upsertLocalStaff({
    id: data.id,
    name: data.name,
    phone: data.phone,
    pin: data.pin,
    role: data.role,
    center: data.center,
    active: data.active,
  });
  return { ok: true };
}

export async function upsertKra({
  data,
}: {
  data: {
    token: string;
    id?: string;
    role: "phlebo" | "frontdesk";
    name: string;
    target: number;
    unit: string;
    weight: number;
    direction: "higher_better" | "lower_better";
  };
}) {
  upsertLocalKra({
    id: data.id,
    role: data.role,
    name: data.name,
    target: data.target,
    unit: data.unit,
    weight: data.weight,
    direction: data.direction,
  });
  return { ok: true };
}

export async function deleteKra({
  data,
}: {
  data: {
    token: string;
    id: string;
  };
}) {
  deleteLocalKra(data.id);
  return { ok: true };
}