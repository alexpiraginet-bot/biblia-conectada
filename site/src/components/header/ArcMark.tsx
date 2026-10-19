// The project's single motif (design §1): an arc over a baseline, as in video 1.
export function ArcMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M3 17a9 9 0 0 1 18 0" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path d="M8 17a4 4 0 0 1 8 0" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" opacity="0.55" />
      <path d="M2 17h20" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" opacity="0.4" />
    </svg>
  );
}
