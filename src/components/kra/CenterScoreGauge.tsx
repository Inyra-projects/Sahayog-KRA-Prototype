import { useMemo } from "react";
import { motion } from "framer-motion";
import { NumberTicker } from "./NumberTicker";

interface CenterScoreGaugeProps {
  score: number | null;
}

const SPARKLE_DOTS = [
  { frac: 0.05, rOffset: -5, r: 1.0, op: 0.6 },
  { frac: 0.09, rOffset: 6, r: 1.3, op: 0.8 },
  { frac: 0.13, rOffset: -9, r: 0.9, op: 0.5 },
  { frac: 0.17, rOffset: 1, r: 1.2, op: 0.75 },
  { frac: 0.21, rOffset: 8, r: 1.0, op: 0.65 },
  { frac: 0.25, rOffset: -6, r: 1.4, op: 0.85 },
  { frac: 0.29, rOffset: 3, r: 1.1, op: 0.7 },
  { frac: 0.33, rOffset: -2, r: 1.3, op: 0.8 },
  { frac: 0.38, rOffset: 7, r: 0.9, op: 0.6 },
  { frac: 0.42, rOffset: -8, r: 1.4, op: 0.9 },
  { frac: 0.46, rOffset: 2, r: 1.2, op: 0.75 },
  { frac: 0.50, rOffset: -4, r: 1.0, op: 0.65 },
  { frac: 0.54, rOffset: 6, r: 1.3, op: 0.8 },
  { frac: 0.58, rOffset: -7, r: 1.1, op: 0.7 },
  { frac: 0.62, rOffset: 3, r: 1.4, op: 0.85 },
  { frac: 0.66, rOffset: -3, r: 0.9, op: 0.55 },
  { frac: 0.71, rOffset: 7, r: 1.3, op: 0.8 },
  { frac: 0.75, rOffset: -8, r: 1.2, op: 0.75 },
  { frac: 0.80, rOffset: 2, r: 1.4, op: 0.9 },
  { frac: 0.84, rOffset: -5, r: 1.0, op: 0.65 },
  { frac: 0.88, rOffset: 5, r: 1.2, op: 0.8 },
  { frac: 0.92, rOffset: -2, r: 1.3, op: 0.85 },
  { frac: 0.96, rOffset: 4, r: 1.0, op: 0.7 },
];

const TICK_ANGLES = [165, 150, 135, 120, 105, 90, 75, 60, 45, 30, 15];

export function CenterScoreGauge({ score }: CenterScoreGaugeProps) {
  const normalizedScore = score !== null ? Math.max(0, Math.min(100, Math.round(score))) : 0;
  
  // Dimensions
  const cx = 140;
  const cy = 138;
  const R = 95;
  const strokeWidth = 34;
  const circumference = Math.PI * R; // ~298.45
  const strokeDashoffset = circumference * (1 - normalizedScore / 100);

  // Needle angle & coordinates
  const needleAngleDeg = 180 - (normalizedScore / 100) * 180;
  const needleAngleRad = (needleAngleDeg * Math.PI) / 180;
  const needleInnerR = 73;
  const needleOuterR = 115;
  const needleX1 = cx + needleInnerR * Math.cos(needleAngleRad);
  const needleY1 = cy - needleInnerR * Math.sin(needleAngleRad);
  const needleX2 = cx + needleOuterR * Math.cos(needleAngleRad);
  const needleY2 = cy - needleOuterR * Math.sin(needleAngleRad);

  // Sparkle dots inside active fill
  const activeDots = useMemo(() => {
    return SPARKLE_DOTS.filter((d) => d.frac <= normalizedScore / 100).map((d) => {
      const angleDeg = 180 - d.frac * 180;
      const angleRad = (angleDeg * Math.PI) / 180;
      const currentR = R + d.rOffset;
      const x = cx + currentR * Math.cos(angleRad);
      const y = cy - currentR * Math.sin(angleRad);
      return { x, y, r: d.r, op: d.op };
    });
  }, [normalizedScore, cx, cy, R]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 350, damping: 25 }}
      className="rounded-[28px] bg-white p-5 sm:p-6 shadow-[0_20px_48px_-12px_rgba(0,0,0,0.16),0_8px_20px_-4px_rgba(0,0,0,0.06)] border border-slate-100/90 text-slate-900 flex flex-col items-center justify-center relative overflow-hidden ring-1 ring-black/[0.03]"
    >
      {/* Specular Ambient Edge Sheen (Antigravity Glass Detail) */}
      <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent pointer-events-none" />
      <div className="relative w-full max-w-[280px] mx-auto flex flex-col items-center">
        {/* Semicircular Speedometer Arc */}
        <svg
          viewBox="0 0 280 148"
          className="w-full h-auto overflow-visible select-none pointer-events-none"
          aria-hidden="true"
        >
          <defs>
            {/* Background Track Gradient (Translucent Soft Green to White) */}
            <linearGradient id="centerTrackGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#84cc16" stopOpacity="0.22" />
              <stop offset="60%" stopColor="#22c55e" stopOpacity="0.14" />
              <stop offset="100%" stopColor="#22c55e" stopOpacity="0.06" />
            </linearGradient>

            {/* Radiant Green Score Gradient matching design */}
            <linearGradient id="centerScoreArcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#a3e635" />
              <stop offset="35%" stopColor="#4ade80" />
              <stop offset="70%" stopColor="#22c55e" />
              <stop offset="100%" stopColor="#16a34a" />
            </linearGradient>
          </defs>

          {/* Unfilled Track Arc */}
          <path
            d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`}
            fill="none"
            stroke="url(#centerTrackGrad)"
            strokeWidth={strokeWidth}
            strokeLinecap="butt"
          />

          {/* Filled Progress Arc */}
          <path
            d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`}
            fill="none"
            stroke="url(#centerScoreArcGrad)"
            strokeWidth={strokeWidth}
            strokeLinecap="butt"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-[stroke-dashoffset] duration-700 ease-out"
          />

          {/* Subtle Radial Ticks along Inner Edge */}
          {TICK_ANGLES.map((angle) => {
            const rad = (angle * Math.PI) / 180;
            const isCenter = angle === 90;
            const r1 = isCenter ? 71 : 75;
            const r2 = 80;
            const x1 = cx + r1 * Math.cos(rad);
            const y1 = cy - r1 * Math.sin(rad);
            const x2 = cx + r2 * Math.cos(rad);
            const y2 = cy - r2 * Math.sin(rad);
            return (
              <line
                key={angle}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#0f172a"
                strokeWidth={isCenter ? 1.5 : 1.1}
                opacity={isCenter ? 0.35 : 0.22}
              />
            );
          })}

          {/* Sparkle Stardust Dots inside Filled Arc */}
          {activeDots.map((dot, idx) => (
            <circle
              key={idx}
              cx={dot.x}
              cy={dot.y}
              r={dot.r}
              fill="#ffffff"
              opacity={dot.op}
            />
          ))}

          {/* Indicator Needle */}
          {normalizedScore > 0 && (
            <line
              x1={needleX1}
              y1={needleY1}
              x2={needleX2}
              y2={needleY2}
              stroke="#0f172a"
              strokeWidth="2.5"
              strokeLinecap="round"
              className="transition-all duration-700 ease-out"
            />
          )}
        </svg>

        {/* Center Typography matching attached image */}
        <div className="mt-[-66px] flex flex-col items-center justify-center text-center z-10 select-none">
          <p className="font-display text-5xl font-extrabold text-slate-900 tracking-tight leading-none tabular-nums">
            {score !== null ? <NumberTicker value={normalizedScore} /> : "—"}
          </p>
          <p className="font-semibold text-base sm:text-lg text-slate-900 mt-2 tracking-tight">
            {score !== null && score < 70 ? "Needs attention" : "Stable state"}
          </p>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            {score !== null && score < 70 ? "Action needed to get on track" : "Keep going — you're on track"}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
