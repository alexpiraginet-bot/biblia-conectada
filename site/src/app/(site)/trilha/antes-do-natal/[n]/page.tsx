import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArcSky } from "@/components/community/ArcSky";
import { CardMaker } from "@/components/community/CardMaker";
import { DeviceNote } from "@/components/community/DeviceNote";
import { MarkVisited } from "@/components/community/TrailSky";
import styles from "@/components/community/community.module.css";
import { NOT_FOUND_TITLE } from "@/lib/missing";
import { ChevronLeft, ChevronRight } from "@/components/icons";
import { formatInt } from "@/lib/canon/text";
import { conexaoPath } from "@/lib/conexao";
import { base, stepTitle, trail, trailStep, verseInfo } from "@/lib/community/data";
import { formatDayMonth } from "@/lib/community/ponte";

export const ensureStatic = "navigation";

export function generateStaticParams() {
  return trail.steps.map((s) => ({ n: String(s.step) }));
}

async function resolve(params: Promise<{ n: string }>) {
  const { n } = await params;
  return /^[1-9]\d?$/.test(n) ? trailStep(Number(n)) : undefined;
}

export async function generateMetadata({ params }: PageProps<"/trilha/antes-do-natal/[n]">): Promise<Metadata> {
  const s = await resolve(params);
  if (!s) return { title: NOT_FOUND_TITLE };
  return {
    title: `${stepTitle(s)} · ${trail.title}`,
    description: `Passo ${s.step} da trilha ${trail.title}: ${stepTitle(s)}, ${formatInt(s.votes)} votos de leitores na OpenBible.info, no texto da Bíblia Livre.`,
    alternates: { canonical: `/trilha/${trail.slug}/${s.step}` },
  };
}

export default async function TrailStepPage({ params }: PageProps<"/trilha/antes-do-natal/[n]">) {
  const s = await resolve(params);
  if (!s) notFound();
  const a = verseInfo(s.ot.gv);
  const b = verseInfo(s.nt.gv);
  const prev = trailStep(s.step - 1);
  const next = trailStep(s.step + 1);
  const votes = `${formatInt(s.votes)} votos de leitores na OpenBible.info`;
  const others = trail.steps.filter((o) => o.step !== s.step);
  const both = conexaoPath({ book: a.book.index, slug: a.book.slug, chapter: a.chapter }, { book: b.book.index, slug: b.book.slug, chapter: b.chapter });
  return (
    <main id="conteudo" className={styles.page}>
      <MarkVisited slug={trail.slug} step={s.step} />
      <div className={styles.column}>
        <p className="kicker">
          {trail.title} · passo {s.step} · {formatDayMonth(s.date)}
        </p>
        <h1 className={styles.title}>{stepTitle(s)}</h1>
        <p className={styles.meta} data-check="step-votes">
          {votes} (soma das duas direções, como no painel de ligações).
        </p>
      </div>

      <div className={styles.pair}>
        <blockquote className={styles.verse} cite={a.path}>
          <p className={styles.verseRef}>
            <Link href={a.path}>{a.ref}</Link>
          </p>
          <p className={styles.verseText}>{s.ot.text}</p>
        </blockquote>
        <blockquote className={styles.verse} cite={b.path}>
          <p className={styles.verseRef}>
            <Link href={b.path}>{b.ref}</Link>
          </p>
          <p className={styles.verseText}>{s.nt.text}</p>
        </blockquote>
      </div>
      <p className={styles.small}>Bíblia Livre (BLIVRE).</p>

      <ArcSky
        captionId={`legenda-passo-${s.step}`}
        arcs={[
          ...others.map((o) => ({ x0: verseInfo(o.ot.gv).x, x1: verseInfo(o.nt.gv).x, look: "faint" as const })),
          { x0: a.x, x1: b.x, look: "gold" as const },
        ]}
        stars={[
          { x: a.x, gold: true },
          { x: b.x, gold: true },
        ]}
        labels={[
          { x: a.x, text: a.short, gold: true },
          { x: b.x, text: b.short, gold: true },
        ]}
        caption={
          <>
            A linha vai de Gênesis a Apocalipse. O arco em ouro liga {a.ref} a {b.ref}; os outros são os demais passos da
            trilha.
          </>
        }
      />

      <div className={styles.actions}>
        <Link href={both} className={styles.button}>
          Ler os dois capítulos
        </Link>
        <Link href={a.chapterPath} className={styles.buttonQuiet}>
          {a.book.name} {a.chapter}
        </Link>
        <Link href={b.chapterPath} className={styles.buttonQuiet}>
          {b.book.name} {b.chapter}
        </Link>
      </div>

      <div className={styles.column}>
        <CardMaker
          fileName={`biblia-conectada-${a.book.slug}-${a.chapter}-${a.verse}-${b.book.slug}-${b.chapter}-${b.verse}.png`}
          shareText={`${stepTitle(s)} · ${votes}`}
          alt={`Cartão de ligação: ${a.ref} e ${b.ref}, com os dois textos da Bíblia Livre, o arco entre eles e ${votes}.`}
          intro="Uma imagem com os dois textos, o arco e os votos, para mandar a alguém. Ela é desenhada neste aparelho; nada é enviado."
          spec={{
            kicker: `${trail.title} · passo ${s.step}`,
            title: stepTitle(s),
            arcs: [{ x0: a.x, x1: b.x }],
            stars: [a.x, b.x],
            bookStarts: base.bookStarts,
            ntStart: base.ntStart,
            texts: [
              { ref: a.ref, text: s.ot.text },
              { ref: b.ref, text: s.nt.text },
            ],
            lines: [votes],
            credit: "Texto: BLIVRE (CC BY 4.0) · Referências cruzadas: OpenBible.info (CC BY)\nBíblia Conectada",
          }}
        />

        <nav aria-label="Passos da trilha" className={styles.pager}>
          {prev && (
            <Link href={`/trilha/${trail.slug}/${prev.step}`} rel="prev">
              <ChevronLeft />
              Passo {prev.step}: {verseInfo(prev.ot.gv).book.name}
            </Link>
          )}
          {next && (
            <Link href={`/trilha/${trail.slug}/${next.step}`} rel="next" className={styles.pagerNext}>
              Passo {next.step}: {verseInfo(next.ot.gv).book.name}
              <ChevronRight />
            </Link>
          )}
        </nav>
        <p>
          <Link href={`/trilha/${trail.slug}`}>Todos os passos da trilha</Link>
        </p>
        <DeviceNote>Os passos que você abre ficam guardados só neste aparelho: sem conta, sem servidor.</DeviceNote>
      </div>
    </main>
  );
}
