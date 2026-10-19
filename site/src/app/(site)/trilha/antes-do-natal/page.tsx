import type { Metadata } from "next";
import Link from "next/link";
import { DeviceNote } from "@/components/community/DeviceNote";
import { TrailSky } from "@/components/community/TrailSky";
import styles from "@/components/community/community.module.css";
import { formatInt } from "@/lib/canon/text";
import { trail, verseInfo } from "@/lib/community/data";
import { formatDateBR } from "@/lib/community/ponte";

export const ensureStatic = "navigation";

const first = formatDateBR(trail.firstDate);
const last = formatDateBR(trail.lastDate);

export const metadata: Metadata = {
  title: trail.title,
  description: `${trail.steps.length} pares de versículos entre o Antigo Testamento e os capítulos do nascimento de Jesus (Mateus 1–2, Lucas 1–2), um por dia de ${first} a ${last}, com as ligações da OpenBible.info e o texto da Bíblia Livre.`,
  alternates: { canonical: `/trilha/${trail.slug}` },
};

export default function TrailPage() {
  const steps = trail.steps.map((s) => ({ ...s, a: verseInfo(s.ot.gv), b: verseInfo(s.nt.gv) }));
  const isaias = steps[steps.length - 1];
  return (
    <main id="conteudo" className={styles.page}>
      <div className={styles.column}>
        <p className="kicker">Trilha</p>
        <h1 className={styles.title}>{trail.title}</h1>
        <p className={styles.lede} data-check="trail-lede">
          {formatInt(steps.length)} passos, um por dia de {first} a {last}. Cada passo é a ligação mais votada entre um livro
          do Antigo Testamento e os capítulos do nascimento de Jesus (Mateus 1–2 e Lucas 1–2): os {formatInt(steps.length)}{" "}
          livros com o par mais votado, dos {formatInt(trail.otBooksWithPairs)} que têm alguma ligação com esses capítulos.
          Os passos seguem a ordem dos livros, e {isaias.a.book.name} fica para o fim: {isaias.a.ref} e {isaias.b.ref},{" "}
          {formatInt(isaias.votes)} votos.
        </p>
        <p className={styles.small}>
          As datas são sugestões: todos os passos já estão abertos. Votos de um par: {trail.definition}, de leitores da
          OpenBible.info.
        </p>
      </div>

      <section className={styles.section} aria-labelledby="titulo-ceu">
        <h2 id="titulo-ceu" className="visually-hidden">
          Os arcos da trilha
        </h2>
        <TrailSky
          slug={trail.slug}
          captionId="legenda-trilha"
          arcs={steps.map((s) => ({ step: s.step, x0: s.a.x, x1: s.b.x, votes: s.votes }))}
        />
      </section>

      <section className={`${styles.section} ${styles.column}`} aria-labelledby="titulo-passos">
        <h2 id="titulo-passos" className={styles.h2}>
          Os passos
        </h2>
        <ol className={styles.list}>
          {steps.map((s) => (
            <li key={s.step} data-step={s.step}>
              <Link href={`/trilha/${trail.slug}/${s.step}`} className={styles.rowLink}>
                <span className={styles.rowLead}>{formatDateBR(s.date).slice(0, 5)}</span>
                <span className={styles.rowMain}>
                  {s.a.ref} e {s.b.ref}
                </span>
                <span className={styles.rowCount}>{formatInt(s.votes)} votos</span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <div className={styles.column}>
        <DeviceNote>Os passos que você abre ficam guardados só neste aparelho: sem conta, sem servidor.</DeviceNote>
      </div>
    </main>
  );
}
