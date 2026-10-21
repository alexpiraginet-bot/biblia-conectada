import { shareMetadata } from "@/lib/share-metadata";
import type { Metadata } from "next";
import Link from "next/link";
import { DeviceNote } from "@/components/community/DeviceNote";
import { TrailSky, TrailStart } from "@/components/community/TrailSky";
import styles from "@/components/community/community.module.css";
import { Crumbs } from "@/components/Crumbs";
import { formatInt } from "@/lib/canon/text";
import { trail, verseInfo } from "@/lib/community/data";
import { formatDateBR } from "@/lib/community/ponte";

export const ensureStatic = "navigation";

const first = formatDateBR(trail.firstDate);
const last = formatDateBR(trail.lastDate);

export const metadata: Metadata = shareMetadata({
    title: trail.title,
    description: `${trail.steps.length} pares de versículos entre o Antigo Testamento e os capítulos do nascimento de Jesus (Mateus 1–2, Lucas 1–2), um por dia de ${first} a ${last}, com as ligações da OpenBible.info e o texto da Bíblia Livre.`,
    path: `/trilha/${trail.slug}`,
  });

// The trail: what it is, its one action (start, or go on from where this device stopped), the steps as a ruled list and
// their arcs in a sky window beside it from 64rem. Numbers from the pipeline (scripts/checks/community.ts).
export default function TrailPage() {
  const steps = trail.steps.map((s) => ({ ...s, a: verseInfo(s.ot.gv), b: verseInfo(s.nt.gv) }));
  const isaias = steps[steps.length - 1];
  return (
    <main id="conteudo" className="site-page">
      <header className={styles.head}>
        <Crumbs label="Caminho" className={styles.crumbs} items={[{ label: "Trilhas", href: "/trilha" }, { label: trail.title }]} />
        <h1 className="bc-display">{trail.title}</h1>
        <p className={`bc-lede ${styles.lede}`} data-check="trail-lede">
          {formatInt(steps.length)} passos, um por dia de {first} a {last}. Cada passo é a ligação mais votada entre um livro
          do Antigo Testamento e os capítulos do nascimento de Jesus (Mateus 1–2 e Lucas 1–2): os {formatInt(steps.length)}{" "}
          livros com o par mais votado, dos {formatInt(trail.otBooksWithPairs)} que têm alguma ligação com esses capítulos.
          Os passos seguem a ordem dos livros, e {isaias.a.book.name} fica para o fim: {isaias.a.ref} e {isaias.b.ref},{" "}
          {formatInt(isaias.votes)} votos.
        </p>
        <p className={styles.note}>
          As datas são sugestões: todos os passos já estão abertos. Votos de um par: {trail.definition}, de leitores da
          OpenBible.info.
        </p>
        <div className={styles.start}>
          <TrailStart slug={trail.slug} steps={steps.map((s) => s.step)} />
        </div>
      </header>

      <div className={`${styles.split} ${styles.splitList}`}>
        <section className={styles.aside} aria-labelledby="titulo-ceu">
          <h2 id="titulo-ceu" className={`bc-title ${styles.h2}`}>
            A trilha no céu
          </h2>
          <TrailSky
            slug={trail.slug}
            captionId="legenda-trilha"
            arcs={steps.map((s) => ({ step: s.step, x0: s.a.x, x1: s.b.x, votes: s.votes }))}
          />
        </section>

        <section aria-labelledby="titulo-passos">
          <h2 id="titulo-passos" className={`bc-title ${styles.h2}`}>
            Os passos
          </h2>
          <ol className={`bc-list ${styles.list}`}>
            {steps.map((s) => (
              <li key={s.step} data-step={s.step}>
                <Link href={`/trilha/${trail.slug}/${s.step}`}>
                  <span className={styles.lead}>{formatDateBR(s.date).slice(0, 5)}</span>
                  <span className={`bc-list__name ${styles.name}`}>
                    {s.a.ref} e {s.b.ref}
                  </span>
                  <span className={styles.count}>{formatInt(s.votes)} votos</span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <DeviceNote>Os passos que você abre ficam guardados só neste aparelho: sem conta, sem servidor.</DeviceNote>
    </main>
  );
}
