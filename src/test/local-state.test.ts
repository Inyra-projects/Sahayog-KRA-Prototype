import { describe, expect, it, beforeEach } from "vitest";
import { authenticateLocal, logoutLocal, getStoredUser, PRD_USERS } from "@/lib/auth";
import {
  getLocalBootstrap,
  saveLocalEntry,
  addLocalRating,
  upsertLocalStaff,
  upsertLocalKra,
  INITIAL_KRAS,
} from "@/lib/localStore";
import { achievement, band, weekScore } from "@/lib/scoring";

describe("Self-contained local state and PRD logic", () => {
  beforeEach(() => {
    localStorage.clear();
    logoutLocal();
  });

  describe("Authentication", () => {
    it("authenticates Dr. Sheetal with PIN 0000", () => {
      const res = authenticateLocal("9876500001", "0000");
      expect(res.ok).toBe(true);
      expect(res.user?.name).toBe("Dr. Sheetal");
      expect(res.user?.role).toBe("admin");
      expect(getStoredUser()?.name).toBe("Dr. Sheetal");
    });

    it("authenticates Sandeep Gaikwad with PIN 0100", () => {
      const res = authenticateLocal("9876500100", "0100");
      expect(res.ok).toBe(true);
      expect(res.user?.name).toBe("Sandeep Gaikwad");
      expect(res.user?.role).toBe("manager");
    });

    it("authenticates Phlebotomist Priya Jadhav with PIN 1001", () => {
      const res = authenticateLocal("9876501001", "1001");
      expect(res.ok).toBe(true);
      expect(res.user?.name).toBe("Priya Jadhav");
      expect(res.user?.role).toBe("phlebo");
    });

    it("authenticates Front Desk Meera Deshmukh with PIN 2001", () => {
      const res = authenticateLocal("9876502001", "2001");
      expect(res.ok).toBe(true);
      expect(res.user?.name).toBe("Meera Deshmukh");
      expect(res.user?.role).toBe("frontdesk");
    });

    it("rejects invalid PIN", () => {
      const res = authenticateLocal("9876500001", "9999");
      expect(res.ok).toBe(false);
      expect(res.error).toBe("Invalid phone number or PIN");
      expect(getStoredUser()).toBeNull();
    });

    it("clears user on logout", () => {
      authenticateLocal("9876500001", "0000");
      expect(getStoredUser()).not.toBeNull();
      logoutLocal();
      expect(getStoredUser()).toBeNull();
    });
  });

  describe("PRD scoring calculations", () => {
    it("caps higher-is-better metrics at 120%", () => {
      const kra = INITIAL_KRAS.find((k) => k.id === "k1")!; // target 40
      expect(achievement(kra, 40)).toBe(1);
      expect(achievement(kra, 48)).toBe(1.2);
      expect(achievement(kra, 100)).toBe(1.2); // capped at 120%
    });

    it("calculates lower-is-better metrics accurately", () => {
      const zeroKra = INITIAL_KRAS.find((k) => k.id === "k4")!; // Samples diverted, target 0
      expect(achievement(zeroKra, 0)).toBe(1);
      expect(achievement(zeroKra, 1)).toBe(0.75);
      expect(achievement(zeroKra, 4)).toBe(0);

      const nonZeroKra = INITIAL_KRAS.find((k) => k.id === "k5")!; // Failed visits, target 2
      expect(achievement(nonZeroKra, 1)).toBe(1);
      expect(achievement(nonZeroKra, 2)).toBe(1);
      expect(achievement(nonZeroKra, 3)).toBe(0.8);
      expect(achievement(nonZeroKra, 4)).toBe(0.6);
    });

    it("maps scores to correct Green/Amber/Red bands", () => {
      expect(band(95)).toBe("green");
      expect(band(90)).toBe("green");
      expect(band(89)).toBe("amber");
      expect(band(70)).toBe("amber");
      expect(band(69)).toBe("red");
      expect(band(40)).toBe("red");
    });

    it("calculates weighted weekly scores", () => {
      const phleboKras = INITIAL_KRAS.filter((k) => k.role === "phlebo");
      const perfectActuals = { k1: 40, k2: 95, k3: 90, k4: 0, k5: 2 };
      expect(Math.round(weekScore(phleboKras, perfectActuals))).toBe(100);
    });
  });

  describe("Local data persistence in localStorage", () => {
    it("saves weekly actuals and retrieves in bootstrap", () => {
      const auth = authenticateLocal("9876501001", "1001");
      const user = auth.user!;

      saveLocalEntry(user.id, "2026-10-12", { k1: 44, k2: 96, k3: 92, k4: 0, k5: 1 });

      const boot = getLocalBootstrap(user.id);
      const entry = boot.entries.find((e) => e.staff_id === user.id && e.week_start === "2026-10-12");
      expect(entry).toBeDefined();
      expect(entry?.actuals.k1).toBe(44);
    });

    it("saves peer ratings and retrieves in bootstrap", () => {
      authenticateLocal("9876502001", "2001"); // Meera
      addLocalRating("u-meera", "u-priya", 5, "Teamwork", "Great cooperation today");

      const boot = getLocalBootstrap("u-meera");
      const rating = boot.ratings.find((r) => r.from_id === "u-meera" && r.to_id === "u-priya" && r.tag === "Teamwork");
      expect(rating).toBeDefined();
      expect(rating?.stars).toBe(5);
    });

    it("allows admin to add staff and new staff can authenticate", () => {
      authenticateLocal("9876500001", "0000"); // Dr. Sheetal

      upsertLocalStaff({
        name: "Test Assistant",
        phone: "9876509999",
        pin: "9999",
        role: "phlebo",
        center: "Nanded City",
        active: true,
      });

      const newAuth = authenticateLocal("9876509999", "9999");
      expect(newAuth.ok).toBe(true);
      expect(newAuth.user?.name).toBe("Test Assistant");
    });
  });
});
