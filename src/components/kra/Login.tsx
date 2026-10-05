import { useState, type ButtonHTMLAttributes } from "react";
import { motion } from "framer-motion";
import { Delete, FlaskConical, Loader2 } from "lucide-react";
import { useSession } from "./session";
import { CENTER_ADDR, CENTER_NAME, DEMO_USERS } from "@/lib/demo";
import { cn } from "@/lib/utils";

export function Login() {
  const { signIn } = useSession();
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [step, setStep] = useState<"phone" | "pin">("phone");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (p: string, n: string) => {
    setBusy(true);
    setErr(null);
    const e = await signIn(p, n);
    setBusy(false);
    if (e) {
      setErr(e);
      setPin("");
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
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 pb-8 pt-10">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lift">
          <FlaskConical className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate font-display text-base font-semibold">{CENTER_NAME}</p>
          <p className="truncate text-xs text-muted-foreground">{CENTER_ADDR}</p>
        </div>
      </div>

      <h1 className="mt-10 text-3xl font-semibold">KRA Tracker</h1>
      <p className="mt-1 text-sm text-muted-foreground">{step === "phone" ? "Enter your registered phone number" : "Enter your 4-digit PIN"}</p>

      <div className="mt-6 card-surface p-5">
        <button type="button" onClick={() => setStep("phone")} className={cn("block w-full text-left", step === "phone" && "pointer-events-none")}>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Phone</p>
          <p className="mt-1 font-display text-2xl tabular tracking-wider">
            {phone || <span className="text-muted-foreground/50">98765 •••••</span>}
          </p>
        </button>
        {step === "pin" && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-4 border-t border-border/60 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">PIN</p>
            <div className="mt-2 flex gap-3">
              {[0, 1, 2, 3].map((i) => (
                <motion.span
                  key={i}
                  animate={{ scale: pin.length > i ? 1.15 : 1 }}
                  className={cn("h-3.5 w-3.5 rounded-full border-2 border-primary", pin.length > i && "bg-primary")}
                />
              ))}
              {busy && <Loader2 className="ml-auto h-4 w-4 animate-spin text-primary" />}
            </div>
          </motion.div>
        )}
        {err && <p className="mt-3 text-sm font-medium text-destructive">{err}</p>}
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
              disabled={busy}
              onClick={() => { setPhone(u.phone); setPin(u.pin); setStep("pin"); submit(u.phone, u.pin); }}
              className="rounded-full border border-border/70 bg-card px-3 py-1.5 text-xs font-semibold transition active:scale-95 hover:border-primary/50"
            >
              {u.name.split(" ")[0] === "Dr." ? "Dr. Sheetal" : u.name.split(" ")[0]} <span className="text-muted-foreground">· {u.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Key({ children, primary, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { primary?: boolean }) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.93 }}
      {...(p as object)}
      className={cn(
        "h-14 rounded-2xl font-display text-xl font-medium shadow-card transition disabled:opacity-40",
        primary ? "bg-primary text-base text-primary-foreground" : "border border-border/60 bg-card",
      )}
    >
      {children}
    </motion.button>
  );
}