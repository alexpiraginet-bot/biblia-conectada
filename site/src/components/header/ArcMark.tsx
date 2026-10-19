// The project's single motif (design/README.md, "Ícones e imagens"): an arc over a baseline, as in video 1.
export function ArcMark({ className = "bc-brand__mark" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true" focusable="false">
      <path d="M3 17a9 9 0 0 1 18 0" />
      <path d="M8 17a4 4 0 0 1 8 0" opacity="0.55" />
      <path d="M2 17h20" strokeWidth="1.25" opacity="0.4" />
    </svg>
  );
}
