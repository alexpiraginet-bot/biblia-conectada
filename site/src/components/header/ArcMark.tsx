// The same connection mark as the app icon: two arcs, linked endpoints and a guiding star.
export function ArcMark({ className = "bc-brand__mark" }: { className?: string }) {
  return (
    <svg className={className} viewBox="64 104 384 288" fill="none" stroke="currentColor" strokeWidth="22" strokeLinecap="round" aria-hidden="true" focusable="false">
      <path d="M104 328a152 152 0 0 1 304 0" />
      <path d="M174 328a82 82 0 0 1 164 0" strokeWidth="18" />
      <path d="M104 328h304" strokeWidth="6" opacity=".45" />
      <circle cx="104" cy="328" r="16" fill="currentColor" stroke="none" />
      <circle cx="408" cy="328" r="16" fill="currentColor" stroke="none" />
      <path d="m256 142 7 22 22 7-22 7-7 22-7-22-22-7 22-7z" fill="currentColor" stroke="none" />
    </svg>
  );
}
