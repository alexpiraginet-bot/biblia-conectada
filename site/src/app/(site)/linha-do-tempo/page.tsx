import type { Metadata } from "next";
import Link from "next/link";
import { EraAxis } from "@/components/timeline/EraAxis";
import { formatInt } from "@/lib/canon/text";
import { ERAS, eraSpanLabel, yearLabel } from "@/lib/eras";
import { coveredVerses, events, OTHER_RECEPTION_EMPTY, reception, timelineAxis } from "@/lib/timeline";
import { summary } from "@/lib/data";
import styles from "./linha.module.css";

export const metadata: Metadata = {
  title: "Linha do tempo",
  description: "Os eventos bíblicos do Theographic em ordem cronológica, com o texto da Bíblia Livre e as ligações de cada trecho.",
};

export const ensureStatic = "navigation";

export default function LinhaDoTempo() {
  const axis = timelineAxis();
  const works = reception.pilots.flatMap((p) => p.works.filter((w) => w.year !== null).map((w) => ({ key: `${p.file}-${w.qid}`, year: w.year as number })));
  const undated = reception.pilots.reduce((n, p) => n + p.works.filter((w) => w.year === null).length, 0);
  const images = reception.pilots.reduce((n, p) => n + p.works.filter((w) => w.image).length, 0);
  const first = events[0];
  const last = events[events.length - 1];
  const pilotRefs = reception.pilots.map((p) => events.find((e) => e.id === p.event)).filter((e) => !!e);
  return (
    <main id="conteudo" className={styles.main}>
      <header className={styles.head}>
        <h1 className={styles.title}>Linha do tempo</h1>
        <p className={styles.lede}>
          {formatInt(events.length)} eventos do Theographic em ordem cronológica, de {first.ref} a {last.ref}. Juntos cobrem{" "}
          {formatInt(coveredVerses)} dos {formatInt(summary.counts.verses)} versículos. Cada evento tem o texto da Bíblia Livre, os lugares
          e as ligações do trecho.
        </p>
      </header>

      <div className={styles.layout}>
        <div className={styles.primary}>
          <EraAxis
            axis={axis}
            caption={`As cinco eras são uma convenção deste site, de largura igual; dentro de cada uma, a posição segue o ano. Os eventos bíblicos ficam na Antiguidade; as eras seguintes mostram a recepção das passagens.`}
            lanes={[
              { id: "eventos", label: "Eventos bíblicos", unit: ["evento", "eventos"], tone: "history", marks: events.map((e) => ({ key: String(e.id), year: e.year })) },
              { id: "pintura", label: "Pintura", unit: ["pintura", "pinturas"], tone: "work", marks: works },
              { id: "outras", label: "Literatura e debates", unit: ["obra", "obras"], tone: "work", marks: [], empty: OTHER_RECEPTION_EMPTY },
            ]}
          />
          <p className={styles.note}>
            Pinturas: piloto com {formatInt(works.length + undated)} obras do Wikidata sobre{" "}
            {pilotRefs.map((e, i) => (
              <span key={e.id}>
                {i > 0 && " e "}
                <Link href={`/linha-do-tempo/${e.slug}`}>{e.ref}</Link>
              </span>
            ))}
            {undated > 0 && <>; {formatInt(undated)} delas sem data no Wikidata ficam fora do eixo</>}. Imagem só quando a página do arquivo no
            Wikimedia Commons diz domínio público, conferida uma por uma: {formatInt(images)} até agora.
          </p>

          <h2 className={styles.sectionTitle} id="eventos">
            Eventos <span className={styles.count}>{formatInt(events.length)} eventos</span>
          </h2>
          <ol className={styles.events} aria-labelledby="eventos">
            {events.map((e) => (
              <li key={e.id} className={styles.event}>
                <span className={styles.year}>
                  {e.approximate ? "c. " : ""}
                  {yearLabel(e.year)}
                </span>
                <Link href={`/linha-do-tempo/${e.slug}`} className={styles.ref}>
                  {e.ref}
                </Link>
                <span className={styles.en} lang="en">
                  {e.titleEn}
                </span>
              </li>
            ))}
          </ol>
        </div>

        <aside className={styles.aside} aria-labelledby="como-ler">
          <p className="kicker">Linha do tempo</p>
          <h2 id="como-ler" className={styles.asideTitle}>
            Como ler
          </h2>
          <p>
            <strong>Datas:</strong> cronologia de F. N. Jones (Theographic). Ela parte do texto bíblico, põe a criação no ano{" "}
            {yearLabel(first.year)} e serve para pôr os eventos em ordem; outras cronologias dão outros anos.
          </p>
          <p>
            <strong>Títulos:</strong> cada evento leva o nome do trecho em português. O título do Theographic, em inglês, fica ao lado.
          </p>
          <p>
            <strong>Eras deste site:</strong>
          </p>
          <ul className={styles.eraList}>
            {ERAS.map((era, i) => (
              <li key={era.id}>
                {era.label}: {eraSpanLabel(i, axis)}
              </li>
            ))}
          </ul>
          <p className={styles.sources}>
            Eventos e datas: Theographic Bible Metadata, Viz.Bible (CC BY-SA 4.0), cronologia de Floyd Nolen Jones. Dados de obras:
            Wikidata (CC0). Texto: Bíblia Livre (BLIVRE). <Link href="/sobre">Créditos completos</Link>
          </p>
        </aside>
      </div>
    </main>
  );
}
