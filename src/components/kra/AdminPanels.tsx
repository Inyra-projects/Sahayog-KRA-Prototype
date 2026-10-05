import { useState } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteKra, upsertKra, upsertStaff, type Bootstrap, type StaffRow } from "@/lib/kra.functions";
import { krasFor, ROLE_LABEL, type Kra, type Role } from "@/lib/scoring";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useRefresh, useSession } from "./session";
import { cn } from "@/lib/utils";

const field = "h-11 w-full rounded-xl border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring";
const label = "text-xs font-semibold text-muted-foreground";

export function ManageTeam({ data }: { data: Bootstrap }) {
  const [edit, setEdit] = useState<Partial<StaffRow> | null>(null);
  const groups: Role[] = ["admin", "manager", "phlebo", "frontdesk"];
  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Team</h2>
          <p className="text-sm text-muted-foreground">Add staff and managers, set roles and PINs.</p>
        </div>
        <button type="button" onClick={() => setEdit({ role: "phlebo", center: "Nanded City", active: true })} className="flex shrink-0 items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground active:scale-95">
          <Plus className="h-4 w-4" /> Add
        </button>
      </div>
      {groups.map((g) => {
        const list = data.staff.filter((s) => s.role === g);
        if (!list.length) return null;
        return (
          <div key={g}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{ROLE_LABEL[g]}</p>
            <div className="card-surface divide-y divide-border/60">
              {list.map((s) => (
                <button key={s.id} type="button" onClick={() => setEdit(s)} className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-left">
                  <div className="min-w-0">
                    <p className={cn("truncate text-sm font-semibold", !s.active && "text-muted-foreground line-through")}>{s.name}</p>
                    <p className="truncate text-xs text-muted-foreground tabular">{s.phone} · {s.center}</p>
                  </div>
                  <Pencil className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>
        );
      })}
      <StaffDialog value={edit} onClose={() => setEdit(null)} />
    </div>
  );
}

function StaffDialog({ value, onClose }: { value: Partial<StaffRow> | null; onClose: () => void }) {
  const { token } = useSession();
  const refresh = useRefresh();
  const [f, setF] = useState<Partial<StaffRow> & { pin?: string }>({});
  const [busy, setBusy] = useState(false);
  const [key, setKey] = useState<string | undefined>();
  if (value && key !== (value.id ?? "new")) {
    setKey(value.id ?? "new");
    setF({ ...value, pin: "" });
  }
  const save = async () => {
    setBusy(true);
    try {
      await upsertStaff({
        data: {
          token: token!,
          id: f.id,
          name: f.name ?? "",
          phone: f.phone ?? "",
          pin: f.pin || undefined,
          role: (f.role ?? "phlebo") as Role,
          center: f.center ?? "Nanded City",
          active: f.active ?? true,
        },
      });
      toast.success("Saved");
      refresh();
      setKey(undefined);
      onClose();
    } catch (e) {
      const m = (e as Error).message;
      toast.error(m.startsWith("[") ? "Please check the phone (10 digits) and PIN (4 digits)" : m);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={!!value} onOpenChange={(o) => { if (!o) { setKey(undefined); onClose(); } }}>
      <DialogContent className="max-w-md rounded-3xl">
        <DialogHeader><DialogTitle>{f.id ? "Edit staff" : "Add staff"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><p className={label}>Name</p><input className={field} value={f.name ?? ""} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><p className={label}>Phone</p><input inputMode="numeric" maxLength={10} className={field} value={f.phone ?? ""} onChange={(e) => setF({ ...f, phone: e.target.value.replace(/\D/g, "") })} /></div>
            <div><p className={label}>{f.id ? "New PIN (optional)" : "PIN"}</p><input inputMode="numeric" maxLength={4} className={field} value={f.pin ?? ""} onChange={(e) => setF({ ...f, pin: e.target.value.replace(/\D/g, "") })} /></div>
          </div>
          <div>
            <p className={label}>Role</p>
            <select className={field} value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as Role })}>
              {(["phlebo", "frontdesk", "manager", "admin"] as Role[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
            </select>
          </div>
          <div><p className={label}>Center</p><input className={field} value={f.center ?? ""} onChange={(e) => setF({ ...f, center: e.target.value })} /></div>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={f.active ?? true} onChange={(e) => setF({ ...f, active: e.target.checked })} className="h-4 w-4 accent-primary" /> Active
          </label>
          <button type="button" onClick={save} disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 font-semibold text-primary-foreground disabled:opacity-50">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Save
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function EditKras({ data }: { data: Bootstrap }) {
  const [edit, setEdit] = useState<Partial<Kra> | null>(null);
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold">KRAs & targets</h2>
        <p className="text-sm text-muted-foreground">Rename, retarget or reweight. Scores update everywhere instantly.</p>
      </div>
      {(["phlebo", "frontdesk"] as const).map((r) => {
        const ks = krasFor(data.kras, r);
        const total = ks.reduce((s, k) => s + Number(k.weight), 0);
        return (
          <div key={r}>
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="truncate text-xs font-semibold uppercase tracking-wider text-muted-foreground">{ROLE_LABEL[r]}</p>
              <span className={cn("shrink-0 text-xs font-bold tabular", total === 100 ? "text-band-green" : "text-band-amber")}>Weights {total}%</span>
            </div>
            <div className="card-surface divide-y divide-border/60">
              {ks.map((k) => (
                <button key={k.id} type="button" onClick={() => setEdit(k)} className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-left">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{k.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      Target {k.target} {k.unit} · {k.weight}% · {k.direction === "lower_better" ? "Lower better" : "Higher better"}
                    </p>
                  </div>
                  <Pencil className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
              <button type="button" onClick={() => setEdit({ role: r, direction: "higher_better", unit: "", weight: 0, target: 0 })} className="flex w-full items-center gap-2 px-4 py-3 text-sm font-semibold text-primary">
                <Plus className="h-4 w-4" /> Add KRA
              </button>
            </div>
          </div>
        );
      })}
      <KraDialog value={edit} onClose={() => setEdit(null)} />
    </div>
  );
}

function KraDialog({ value, onClose }: { value: Partial<Kra> | null; onClose: () => void }) {
  const { token } = useSession();
  const refresh = useRefresh();
  const [f, setF] = useState<Partial<Kra>>({});
  const [key, setKey] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  if (value && key !== (value.id ?? "new")) {
    setKey(value.id ?? "new");
    setF(value);
  }
  const close = () => { setKey(undefined); onClose(); };
  const save = async () => {
    setBusy(true);
    try {
      await upsertKra({
        data: {
          token: token!,
          id: f.id,
          role: f.role as "phlebo" | "frontdesk",
          name: f.name ?? "",
          target: Number(f.target) || 0,
          unit: f.unit ?? "",
          weight: Number(f.weight) || 0,
          direction: f.direction ?? "higher_better",
        },
      });
      toast.success("KRA saved");
      refresh();
      close();
    } catch (e) {
      toast.error((e as Error).message.startsWith("[") ? "Please fill in a name" : (e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    if (!f.id || !confirm("Delete this KRA?")) return;
    try {
      await deleteKra({ data: { token: token!, id: f.id } });
      toast.success("KRA deleted");
      refresh();
      close();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  return (
    <Dialog open={!!value} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-md rounded-3xl">
        <DialogHeader><DialogTitle>{f.id ? "Edit KRA" : "New KRA"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><p className={label}>Name</p><input className={field} value={f.name ?? ""} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
          <div className="grid grid-cols-3 gap-3">
            <div><p className={label}>Target</p><input inputMode="decimal" className={field} value={f.target ?? ""} onChange={(e) => setF({ ...f, target: e.target.value as unknown as number })} /></div>
            <div><p className={label}>Unit</p><input className={field} value={f.unit ?? ""} onChange={(e) => setF({ ...f, unit: e.target.value })} /></div>
            <div><p className={label}>Weight %</p><input inputMode="decimal" className={field} value={f.weight ?? ""} onChange={(e) => setF({ ...f, weight: e.target.value as unknown as number })} /></div>
          </div>
          <div>
            <p className={label}>Direction</p>
            <div className="grid grid-cols-2 gap-2">
              {(["higher_better", "lower_better"] as const).map((d) => (
                <button key={d} type="button" onClick={() => setF({ ...f, direction: d })} className={cn("rounded-xl border py-2.5 text-sm font-semibold", f.direction === d ? "border-primary bg-accent text-accent-foreground" : "border-border/70")}>
                  {d === "higher_better" ? "Higher better" : "Lower better"}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            {f.id && (
              <button type="button" onClick={remove} className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-destructive/40 text-destructive" aria-label="Delete KRA">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <button type="button" onClick={save} disabled={busy} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary py-3 font-semibold text-primary-foreground disabled:opacity-50">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Save
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}