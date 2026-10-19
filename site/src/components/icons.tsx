// One icon family (24px grid, 1.75 stroke, round caps), authored as SVG. Decorative by default.
type P = { size?: number; className?: string };
const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  focusable: false,
});

export const ChevronLeft = ({ size = 18, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="m14.5 6-6 6 6 6" />
  </svg>
);
export const ChevronRight = ({ size = 18, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="m9.5 6 6 6-6 6" />
  </svg>
);
export const Close = ({ size = 20, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);
/** the link motif: a small arc over a baseline */
export const ArcIcon = ({ size = 16, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M4 17a8 8 0 0 1 16 0" />
    <path d="M2.5 17h19" opacity="0.45" />
  </svg>
);
/** direction of a link seen from the current verse */
export const DirOut = ({ size = 16, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M5 12h13M13 7l5 5-5 5" />
  </svg>
);
export const DirIn = ({ size = 16, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M19 12H6M11 7l-5 5 5 5" />
  </svg>
);
export const DirBoth = ({ size = 16, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M4 9h14M15 6l3 3-3 3M20 15H6M9 12l-3 3 3 3" />
  </svg>
);
