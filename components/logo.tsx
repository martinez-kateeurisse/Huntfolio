import { cn } from "@/lib/utils";

// The Huntfolio mark: an "H" made of three rising bars (a pipeline moving
// up), crossed by a rising bar, with an indigo dot where you're headed.
// Drawn on a 32×32 grid; app/icon.svg and app/apple-icon.tsx use the same
// shapes, so keep them in sync if this changes.
export const LOGO = {
  bars: [
    { x: 4, y: 11, width: 6, height: 17 },
    { x: 13, y: 7.5, width: 6, height: 20.5 },
    { x: 22, y: 4, width: 6, height: 24 },
  ],
  barRadius: 1.4,
  crossbar: "4,18.6 28,13.4 28,17 4,22.2",
  // Thin gap under the crossbar, and the ring around the dot.
  cut: { x1: 2, y1: 23.53, x2: 30, y2: 17.47, width: 1.5 },
  dot: { cx: 25, cy: 15.85, r: 2.5, ring: 3.7 },
} as const;

// Bars follow the text colour (dark in light mode, light in dark mode); the
// dot stays indigo.
export function LogoMark({ className }: { className?: string }) {
  const { bars, barRadius, crossbar, cut, dot } = LOGO;
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={cn("size-6 shrink-0", className)}
    >
      <defs>
        {/* Identical on every instance, so a shared id is harmless. */}
        <mask id="huntfolio-logo-cut" maskUnits="userSpaceOnUse" x="0" y="0" width="32" height="32">
          <rect width="32" height="32" fill="#fff" />
          <line {...{ x1: cut.x1, y1: cut.y1, x2: cut.x2, y2: cut.y2 }} stroke="#000" strokeWidth={cut.width} />
          <circle cx={dot.cx} cy={dot.cy} r={dot.ring} fill="#000" />
        </mask>
      </defs>
      <g fill="currentColor" mask="url(#huntfolio-logo-cut)">
        {bars.map((b) => (
          <rect key={b.x} {...b} rx={barRadius} />
        ))}
        <polygon points={crossbar} />
      </g>
      <circle
        cx={dot.cx}
        cy={dot.cy}
        r={dot.r}
        className="fill-indigo-500 dark:fill-indigo-400"
      />
    </svg>
  );
}
