import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArcSky } from "@/components/community/ArcSky";
import { CardMaker } from "@/components/community/CardMaker";
import { DeviceNote } from "@/components/community/DeviceNote";
import { VersePair } from "@/components/community/Pair";
import { MarkVisited } from "@/components/community/TrailSky";
import styles from "@/components/community/community.module.css";
import { Crumbs } from "@/components/Crumbs";
import { Icon } from "@/components/icons";
import { NOT_FOUND_TITLE } from "@/lib/missing";
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

const stepPath = (n: number) => `/trilha/${trail.slug}/${n}`;

// One step of the trail: the pair to read (the page's one action is the next step), where the two verses sit in the
// Bible, and a card to send. Every number and text is the pipeline's (scripts/checks/community.ts reads this page).
export default async function TrailStepPage({ params }: PageProps<"/trilha/antes-do-natal/[n]">) {
  const s = await resolve(params);
  if (!s) notFound();
  const a = verseInfo(s.ot.gv);
  const b = verseInfo(s.nt.gv);
  const prev = trailStep(s.step - 1);
  const next = trailStep(s.step + 1);
  const total = trail.steps.length;
  const votes = `${formatInt(s.votes)} votos de leitores na OpenBible.info`;
  const others = trail.steps.filter((o) => o.step !== s.step);
  const both = conexaoPath({ book: a.book.index, slug: a.book.slug, chapter: a.chapter }, { book: b.book.index, slug: b.book.slug, chapter: b.chapter });
  const bookOf = (t: { ot: { gv: number } }) => verseInfo(t.ot.gv).book.name;
  return (
    <main id="conteudo" className="site-page">
      <MarkVisited slug={trail.slug} step={s.step} />
      <header className={styles.head}>
        <Crumbs
          label="Caminho"
          className={styles.crumbs}
          items={[{ label: "Trilhas", href: "/trilha" }, { label: trail.title, href: `/trilha/${trail.slug}` }, { label: `Passo ${s.step}` }]}
        />
        <h1 className="bc-display">{stepTitle(s)}</h1>
        <div className={styles.progress}>
          <div className={styles.progressRow}>
            <p className={styles.progressText}>
              <strong>
                Passo {s.step} de {formatInt(total)}
              </strong>{" "}
              · {formatDayMonth(s.date)}
            </p>
            {prev ? (
              <Link href={stepPath(prev.step)} className="bc-icon-button" aria-label={`Passo anterior: ${bookOf(prev)}`} rel="prev">
                <Icon name="chev-l" />
              </Link>
            ) : (
              <span className="bc-icon-button" aria-disabled="true">
                <Icon name="chev-l" />
              </span>
            )}
            {next ? (
              <Link href={stepPath(next.step)} className="bc-icon-button" aria-label={`Próximo passo: ${bookOf(next)}`} rel="next">
                <Icon name="chev-r" />
              </Link>
            ) : (
              <span className="bc-icon-button" aria-disabled="true">
                <Icon name="chev-r" />
              </span>
            )}
          </div>
          <ol className={styles.track} aria-hidden="true">
            {trail.steps.map((t) => (
              <li key={t.step} className={t.step === s.step ? styles.here : t.step < s.step ? styles.before : undefined} />
            ))}
          </ol>
        </div>
      </header>

      <div className={styles.split}>
        <div>
          <VersePair
            a={{ ref: a.ref, href: a.path, text: s.ot.text }}
            b={{ ref: b.ref, href: b.path, text: s.nt.text }}
            link={`${formatInt(s.votes)} votos`}
          />
          <p className={styles.note} data-check="step-votes">
            {votes}, somando as duas direções, como no painel de ligações. Texto da Bíblia Livre (BLIVRE).
          </p>
          <div className={styles.actions}>
            {next ? (
              <Link href={stepPath(next.step)} className="bc-button bc-button--primary">
                Próximo passo: {bookOf(next)}
                <Icon name="chev-r" />
              </Link>
            ) : (
              <Link href={`/trilha/${trail.slug}`} className="bc-button bc-button--primary">
                Ver a trilha inteira
                <Icon name="chev-r" />
              </Link>
            )}
            <Link href={both} className="bc-button bc-button--secondary">
              <Icon name="side" />
              Ler os dois capítulos
            </Link>
          </div>
        </div>

        <aside className={styles.aside} aria-label="Os dois versículos na Bíblia">
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
            <Link href={a.chapterPath} className="bc-button bc-button--ghost">
              <Icon name="book" />
              {a.book.name} {a.chapter}
            </Link>
            <Link href={b.chapterPath} className="bc-button bc-button--ghost">
              <Icon name="book" />
              {b.book.name} {b.chapter}
            </Link>
          </div>
        </aside>
      </div>

      <CardMaker
        fileName={`biblia-conectada-${a.book.slug}-${a.chapter}-${a.verse}-${b.book.slug}-${b.chapter}-${b.verse}.png`}
        shareText={`${stepTitle(s)} · ${votes}`}
        alt={`Cartão de ligação: ${a.ref} e ${b.ref}, com os dois textos da Bíblia Livre, o arco entre eles e ${votes}.`}
        intro="Uma imagem com os dois textos, o arco e os votos, para mandar a alguém. Ela é desenhada neste aparelho; nada é enviado."
        spec={{
          title: stepTitle(s),
          context: `${trail.title}, passo ${s.step} de ${formatInt(total)}`,
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

      <p className={`${styles.section} ${styles.back}`}>
        <Link href={`/trilha/${trail.slug}`} className="bc-button bc-button--ghost">
          <Icon name="chev-l" />
          Todos os passos da trilha
        </Link>
      </p>
      <DeviceNote>Os passos que você abre ficam guardados só neste aparelho: sem conta, sem servidor.</DeviceNote>
    </main>
  );
}
