import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { band, BAND_LABEL, type Band } from "@/lib/scoring";

export const bandText: Record<Band, string> = {
  green: "text-band-green",
  amber: "text-band-amber",
  red: "text-band-red",
};
export const bandSoft: Record<Band, string> = {
  green: "bg-band-green-soft text-band-green",
  amber: "bg-band-amber-soft text-band-amber",
  red: "bg-band-red-soft text-band-red",
};
export const bandBar: Record<Band, string> = { green: "bg-band-green", amber: "bg-band-amber", red: "bg-band-red" };

export function BandBadge({ score, className, showLabel = true }: { score: number | null; className?: string; showLabel?: boolean }) {
  if (score === null) return <span className={cn("rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground", className)}>No data</span>;
  const b = band(score);
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold tabular", bandSoft[b], className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", bandBar[b])} />
      {Math.round(score)}%{showLabel && <span className="font-semibold opacity-80">· {BAND_LABEL[b]}</span>}
    </span>
  );
}

export function ScoreBar({ score }: { score: number }) {
  const b = band(score);
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <motion.div
        className={cn("h-full rounded-full", bandBar[b])}
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(score, 120) / 1.2}%` }}
        transition={{ type: "spring", stiffness: 120, damping: 20 }}
      />
    </div>
  );
}