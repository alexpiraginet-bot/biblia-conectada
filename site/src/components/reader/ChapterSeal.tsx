// The chapter seal (design system ChapterSeal, ds.css .bc-seal): the chapter number in Newsreader inside a disc, the
// book's name above it as written (as on the capa's seal), and a dial with one tick per linked chapter at its place from Gênesis (top) to
// Apocalipse, longer with more summed votes (src/lib/from-here.ts sealLevels). Server-rendered SVG, no JavaScript.
import { formatInt } from "@/lib/canon/text";
import { measure } from "@/lib/explore/measure";
import { SEAL, sealBookFit, sealLevels } from "@/lib/from-here";
import styles from "./reader.module.css";

export function ChapterSeal({
  book,
  chapter,
  partners,
  chapterCount,
  size,
}: {
  book: string;
  chapter: number;
  /** the linked chapters with their summed votes */
  partners: readonly { ci: number; votes: number }[];
  chapterCount: number;
  /** CSS length of the seal's side */
  size: string;
}) {
  const levels = sealLevels(partners, chapterCount);
  const fit = sealBookFit(book, (text, px) => measure("ui", text, px));
  const n = partners.length;
  const linked = `${formatInt(n)} ${n === 1 ? "capítulo ligado" : "capítulos ligados"}`;
  return (
    <svg
      className={`bc-seal ${styles.seal}`}
      style={{ "--size": size } as React.CSSProperties}
      viewBox="-4 -4 144 144"
      role="img"
      aria-label={`${book} ${chapter}, com ${linked}`}
    >
      <title>{`Cada risco em volta é um dos ${linked} a ${book} ${chapter}, na sua posição de Gênesis (no alto) a Apocalipse; quanto mais votos, mais longo.`}</title>
      <g className={styles.sealTicks} transform={`rotate(-90 ${SEAL.c} ${SEAL.c})`}>
        {levels.map((l) => (
          <circle key={l.r} cx={SEAL.c} cy={SEAL.c} r={l.r} strokeWidth={l.width} strokeDasharray={l.dash} />
        ))}
      </g>
      <circle className="bc-seal__disc" cx={SEAL.c} cy={SEAL.c} r={SEAL.disc} />
      <circle className="bc-seal__ring" cx={SEAL.c} cy={SEAL.c} r={SEAL.ring} />
      <text
        className="bc-seal__book"
        x={SEAL.c}
        y={48}
        textAnchor="middle"
        style={fit.size < 12 ? { fontSize: `${fit.size}px` } : undefined}
        textLength={fit.squeeze ?? undefined}
        lengthAdjust={fit.squeeze ? "spacingAndGlyphs" : undefined}
      >
        {book}
      </text>
      <text className="bc-seal__numeral" x={SEAL.c} y={90} textAnchor="middle">
        {chapter}
      </text>
    </svg>
  );
}
