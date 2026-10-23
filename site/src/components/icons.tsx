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
/** a file to save (Lucide "download") */
export const DownloadIcon = ({ size = 18, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M12 15V3M7 10l5 5 5-5M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
  </svg>
);

// The design system's icon set (src/styles/ds.css .bc-icon: 22px, 1.75 stroke from currentColor, 2.1 on the current
// item). Decorative: the control next to it carries the text or an aria-label.
const PATHS = {
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6 6 18" />,
  heart: <path d="M20.1 5.6a5.1 5.1 0 0 0-7.2 0L12 6.5l-.9-.9a5.1 5.1 0 0 0-7.2 7.2L12 21l8.1-8.2a5.1 5.1 0 0 0 0-7.2Z" />,
  more: <path d="M5 12h.01M12 12h.01M19 12h.01" strokeWidth="4" />,
  arc: (
    <>
      <path d="M4 17a8 8 0 0 1 16 0" />
      <path d="M2.5 17h19" opacity={0.45} />
    </>
  ),
  explore: (
    <>
      <path d="M6.5 8.2 11 16.2M13 16.2l4.6-8.4M8.2 6.6l7.6-.5" />
      <circle cx="6" cy="7" r="2" />
      <circle cx="18" cy="6" r="2" />
      <circle cx="12" cy="18" r="2" />
    </>
  ),
  book: <path d="M4 5.5c2.5-1 5.5-1 8 .5 2.5-1.5 5.5-1.5 8-.5V19c-2.5-1-5.5-1-8 .5-2.5-1.5-5.5-1.5-8-.5zM12 6v13.5" />,
  map: <path d="m3 6 6-2 6 2 6-2v14l-6 2-6-2-6 2V6Zm6-2v14m6-12v14" />,
  time: <path d="M3 12h18M7 9v6M12 7.5v9M17 10v4" />,
  bridge: <path d="M3 17h18M3 11.5c3 0 5-3.5 9-3.5s6 3.5 9 3.5M6 17v-4.6M18 17v-4.6M10 17V9.6M14 17V9.6" />,
  data: (
    <path d="M5 6c0-1.1 3.1-2 7-2s7 .9 7 2-3.1 2-7 2-7-.9-7-2zM5 6v12c0 1.1 3.1 2 7 2s7-.9 7-2V6M5 12c0 1.1 3.1 2 7 2s7-.9 7-2" />
  ),
  both: <path d="M4 9h14M15 6l3 3-3 3M20 15H6M9 12l-3 3 3 3" />,
  out: <path d="M5 12h13M13 7l5 5-5 5" />,
  in: <path d="M19 12H6M11 7l-5 5 5 5" />,
  moon: <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  device: (
    <>
      <rect x="6" y="3" width="12" height="18" rx="2" />
      <path d="M11 18h2" />
    </>
  ),
  "chev-r": <path d="m9 6 6 6-6 6" />,
  "chev-l": <path d="m15 6-6 6 6 6" />,
  bookmark: <path d="M7 4h10v16l-5-3.5L7 20z" />,
  text: <path d="M5 6h14M5 10h14M5 14h9M5 18h11" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  side: (
    <>
      <rect x="3" y="5" width="8" height="14" rx="1.5" />
      <rect x="13" y="5" width="8" height="14" rx="1.5" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4.5l3 2" />
    </>
  ),
  home: (
    <>
      <path d="M4 11.5 12 5l8 6.5V20H4z" />
      <path d="M10 20v-5h4v5" />
    </>
  ),
  share: <path d="M12 15V3.5M7.5 8 12 3.5 16.5 8M5 12.5v6A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5v-6" />,
  copy: (
    <>
      <rect x="8" y="8" width="11" height="11" rx="2" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </>
  ),
};

export type IconName = keyof typeof PATHS;

export function Icon({ name, className = "bc-icon" }: { name: IconName; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {PATHS[name]}
    </svg>
  );
}
