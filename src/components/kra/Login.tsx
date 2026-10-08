import { useState, useEffect, type ButtonHTMLAttributes } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Delete } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useSession } from "./session";
import { CENTER_ADDR, CENTER_NAME, DEMO_USERS } from "@/lib/demo";
import { getDefaultRouteForRole, getStoredUser } from "@/lib/auth";
import { cn } from "@/lib/utils";

export function Login() {
  const { signIn } = useSession();
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [step, setStep] = useState<"phone" | "pin">("phone");
  const [err, setErr] = useState<string | null>(null);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 3500);
    return () => clearTimeout(t);
  }, []);

  const submit = async (p: string, n: string) => {
    setErr(null);
    const e = await signIn(p, n);
    if (e) {
      setErr(e);
      setPin("");
    } else {
      const u = getStoredUser();
      const dest = u ? getDefaultRouteForRole(u.role) : "/dashboard";
      navigate({ to: dest as any }).catch(() => {
        window.location.href = dest;
      });
    }
  };

  const press = (k: string) => {
    setErr(null);
    if (step === "phone") {
      if (k === "del") setPhone((v) => v.slice(0, -1));
      else if (phone.length < 10) setPhone((v) => v + k);
    } else {
      if (k === "del") setPin((v) => v.slice(0, -1));
      else if (pin.length < 4) {
        const n = pin + k;
        setPin(n);
        if (n.length === 4) submit(phone, n);
      }
    }
  };

  return (
    <AnimatePresence mode="wait">
      {showSplash ? (
        <motion.div
          key="splash"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, filter: "blur(4px)" }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-50"
        >
          <motion.img
            src="/splash-logo.png"
            alt="Sahayog Pathology Laboratory"
            initial={{ scale: 0.92 }}
            animate={{ scale: 1 }}
            transition={{ duration: 4, ease: "easeOut" }}
            className="w-[280px] max-w-[80vw] object-contain drop-shadow-sm"
          />
        </motion.div>
      ) : (
        <motion.div
          key="login"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="mx-auto flex min-h-screen max-w-md flex-col px-5 pb-8 pt-10"
        >
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-card border border-border/60 shadow-sm overflow-hidden p-1.5">
              <img src="/logo.png" alt="Logo" className="h-full w-full object-contain" />
            </div>
            <div className="min-w-0">
              <p className="truncate font-display text-base font-semibold">{CENTER_NAME}</p>
              <p className="truncate text-xs text-muted-foreground">{CENTER_ADDR}</p>
            </div>
          </div>

          <h1 className="mt-10 text-3xl font-semibold">KRA Tracker</h1>
          <p className="mt-1 text-sm text-muted-foreground">{step === "phone" ? "Enter your registered phone number" : "Enter your 4-digit PIN"}</p>

          <div className="mt-6 rounded-[28px] border border-slate-100 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <button type="button" onClick={() => setStep("phone")} className={cn("block w-full text-left", step === "phone" && "pointer-events-none")}>
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-400">Phone</p>
              <p className="mt-1 font-sans text-[28px] font-semibold tabular-nums tracking-wide text-slate-900">
                {phone || <span className="text-slate-300">98765 •••••</span>}
              </p>
            </button>
            {step === "pin" && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-4 border-t border-slate-100 pt-5">
                <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-400">PIN</p>
                <div className="mt-3 flex gap-3">
                  {[0, 1, 2, 3].map((i) => (
                    <motion.span
                      key={i}
                      animate={{ scale: pin.length > i ? 1.15 : 1 }}
                      className={cn("h-4 w-4 rounded-full border-2 border-[#1A1C20]", pin.length > i && "bg-[#1A1C20]")}
                    />
                  ))}
                </div>
              </motion.div>
            )}
            {err && <p className="mt-3 text-sm font-medium text-rose-600">{err}</p>}
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2.5">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((k) => (
              <Key key={k} onClick={() => press(k)}>{k}</Key>
            ))}
            {step === "phone" ? (
              <Key onClick={() => phone.length === 10 && setStep("pin")} disabled={phone.length !== 10} primary>
                Next
              </Key>
            ) : (
              <Key onClick={() => { setStep("phone"); setPin(""); }}>Back</Key>
            )}
            <Key onClick={() => press("0")}>0</Key>
            <Key onClick={() => press("del")} aria-label="Delete"><Delete className="mx-auto h-5 w-5" /></Key>
          </div>

          <div className="mt-8">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quick switch · demo users</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {DEMO_USERS.map((u) => (
                <button
                  key={u.phone}
                  type="button"
                  onClick={() => { setPhone(u.phone); setPin(u.pin); setStep("pin"); submit(u.phone, u.pin); }}
                  className="rounded-full border border-border/70 bg-card px-3 py-1.5 text-xs font-semibold transition active:scale-95 hover:border-primary/50"
                >
                  {u.name.split(" ")[0] === "Dr." ? "Dr. Sheetal" : u.name.split(" ")[0]} <span className="text-muted-foreground">· {u.label}</span>
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Key({ children, primary, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { primary?: boolean }) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.96 }}
      {...(p as object)}
      className={cn(
        "h-[60px] font-sans text-[22px] font-medium transition disabled:opacity-40 flex items-center justify-center",
        primary ? "bg-[#1A1C20] text-base text-white rounded-full shadow-md" : "border border-slate-100 bg-white rounded-[24px] shadow-[0_1px_3px_rgba(0,0,0,0.02)] text-slate-900",
      )}
    >
      {children}
    </motion.button>
  );
}