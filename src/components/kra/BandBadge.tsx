import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { band, BAND_LABEL, type Band } from "@/lib/scoring";

export const bandText: Record<Band, string> = {
  green: "text-emerald-700",
  amber: "text-amber-700",
  red: "text-rose-700",
};
export const bandSoft: Record<Band, string> = {
  green: "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20",
  amber: "bg-amber-500/10 text-amber-800 border border-amber-500/20",
  red: "bg-rose-500/10 text-rose-700 border border-rose-500/20",
};
export const bandBar: Record<Band, string> = { green: "bg-emerald-500", amber: "bg-amber-500", red: "bg-rose-500" };

export function BandBadge({ score, className, showLabel = true }: { score: number | null; className?: string; showLabel?: boolean }) {
  if (score === null) return <span className={cn("rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground", className)}>No data</span>;
  const b = band(score);
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold tabular", bandSoft[b], className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", bandBar[b])} />
      {Math.min(100, Math.round(score))}%{showLabel && <span className="font-semibold opacity-80">· {BAND_LABEL[b]}</span>}
    </span>
  );
}

export function ScoreBar({ score }: { score: number }) {
  const b = band(score);
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <motion.div
        className={cn("h-full rounded-full", bandBar[b])}
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(score, 100)}%` }}
        transition={{ type: "spring", stiffness: 120, damping: 20 }}
      />
    </div>
  );
}