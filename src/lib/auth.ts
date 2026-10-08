import type { Role } from "./scoring";

export interface PRDUser {
  id: string;
  name: string;
  phone: string;
  altPhone?: string;
  pin: string;
  role: Role;
  center: string;
  active: boolean;
}

export const LOCAL_STORAGE_USER_KEY = "sahayog-kra-user";
export const LOCAL_STORAGE_TOKEN_KEY = "sahayog-kra-token";

export function getStoredUser(): PRDUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
    if (!raw) return null;
    const user = JSON.parse(raw);
    if (user && user.id && user.phone && user.role) {
      return user as PRDUser;
    }
    return null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: PRDUser): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(user));
    localStorage.setItem(LOCAL_STORAGE_TOKEN_KEY, user.id);
  } catch (e) {
    console.error("Failed to save auth state to localStorage", e);
  }
}

export function logoutLocal(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
    localStorage.removeItem(LOCAL_STORAGE_TOKEN_KEY);
  } catch (e) {
    console.error("Failed to clear auth state from localStorage", e);
  }
}

export function getDefaultRouteForRole(role: Role): string {
  if (role === "admin" || role === "manager") {
    return "/dashboard";
  }
  return "/entry";
}
