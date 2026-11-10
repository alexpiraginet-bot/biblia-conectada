// The notebook's own icons, in the family of components/icons.tsx (24px grid, one stroke; ds.css .bc-icon). They live
// here so the pages that never open the notebook do not carry them.
const PATHS = {
  // a marker over the line it draws
  mark: <path d="m14.6 4.2 5.2 5.2-8 8H6.6v-5.2l8-8ZM6.6 17.4 4 20h4.4M13 20h7" />,
  // a pencil writing on a line
  note: <path d="M4 20h3.6L19 8.6a2.1 2.1 0 0 0-3-3L4.6 17v3ZM13.6 8 16.6 11" />,
  // two arrows in a loop: the passage comes back for review
  review: <path d="M16.5 3.5 20 7l-3.5 3.5M20 7H8.5A4.5 4.5 0 0 0 4 11.5M7.5 20.5 4 17l3.5-3.5M4 17h11.5a4.5 4.5 0 0 0 4.5-4.5" />,
} as const;

export function CadernoIcon({ name, className = "bc-icon" }: { name: keyof typeof PATHS; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {PATHS[name]}
    </svg>
  );
}
