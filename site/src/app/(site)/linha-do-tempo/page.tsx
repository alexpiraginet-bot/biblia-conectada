import { shareMetadata } from "@/lib/share-metadata";
import type { Metadata } from "next";
import Link from "next/link";
import { EventList } from "@/components/timeline/EventList";
import { ArcList, TimelineSky } from "@/components/timeline/TimelineSky";
import { formatInt } from "@/lib/canon/text";
import { summary } from "@/lib/data";
import { yearLabel } from "@/lib/eras";
import { coveredVerses, events, reception } from "@/lib/timeline";
import { timelineArcs } from "@/lib/timeline-links";
import { splitPeriods } from "@/lib/timeline-periods";
import styles from "./linha.module.css";

export const metadata: Metadata = shareMetadata({
    title: "Linha do tempo",
    description: "Os eventos bíblicos do Theographic em ordem cronológica, com o texto da Bíblia Livre e as ligações de cada trecho.",
    path: "/linha-do-tempo",
  });

export const ensureStatic = "navigation";

export default async function LinhaDoTempo() {
  const periods = splitPeriods(events);
  const arcs = await timelineArcs();
  const first = events[0];
  const last = events[events.length - 1];
  const works = reception.pilots.reduce((n, p) => n + p.works.length, 0);
  const images = reception.pilots.reduce((n, p) => n + p.works.filter((w) => w.image).length, 0);
  const pilotEvents = reception.pilots.map((p) => events.find((e) => e.id === p.event)).filter((e) => !!e);
  return (
    <main id="conteudo" className={`site-page ${styles.page}`}>
      <header className={styles.head}>
        <h1 className="bc-display">Linha do tempo</h1>
        <p className={`bc-lede ${styles.lede}`}>
          {formatInt(events.length)} eventos do Theographic em ordem cronológica, de {first.ref} a {last.ref}. Juntos cobrem{" "}
          {formatInt(coveredVerses)} dos {formatInt(summary.counts.verses)} versículos. Cada evento abre o texto da Bíblia Livre, os lugares e
          as ligações do trecho.
        </p>
      </header>

      <TimelineSky periods={periods} events={events} arcs={arcs} />
      <ArcList arcs={arcs} events={events} />

      <div className={styles.layout}>
        <div className={styles.primary}>
          <EventList periods={periods} total={events.length} />
        </div>

        <aside className={styles.aside} aria-labelledby="como-ler">
          <h2 id="como-ler" className="bc-title">
            Como ler
          </h2>
          <dl className={styles.notes}>
            <div>
              <dt>Datas</dt>
              <dd>
                Cronologia de F. N. Jones, como o Theographic a dá. Ela parte do texto bíblico e põe a criação em {yearLabel(first.year)};
                outras cronologias dão outros anos. Eventos do mesmo ano seguem a ordem dos livros.
              </dd>
            </div>
            <div>
              <dt>Títulos</dt>
              <dd>Cada evento leva a referência do trecho em português. Embaixo, o título do Theographic, em inglês, como está na fonte.</dd>
            </div>
            <div>
              <dt>Períodos</dt>
              <dd>
                Divisão deste site para orientar a leitura, não da fonte. Cada um começa num evento do Theographic, e os anos são os dos seus
                eventos.
              </dd>
            </div>
            <div>
              <dt>Ligações</dt>
              <dd>Pares de versículos da OpenBible.info com ao menos um versículo do trecho.</dd>
            </div>
            <div>
              <dt>Recepção</dt>
              <dd>
                Piloto com {formatInt(works)} pinturas do Wikidata sobre{" "}
                {pilotEvents.map((e, i) => (
                  <span key={e.id}>
                    {i > 0 && " e "}
                    <Link href={`/linha-do-tempo/${e.slug}`}>{e.ref}</Link>
                  </span>
                ))}
                ; {formatInt(images)} com imagem em domínio público, conferida uma por uma.
              </dd>
            </div>
          </dl>
          <p className={styles.sources}>
            Eventos e datas: Theographic Bible Metadata, Viz.Bible (CC BY-SA 4.0), cronologia de Floyd Nolen Jones. Dados de obras:
            Wikidata (CC0). Texto: Bíblia Livre (BLIVRE). Ligações: OpenBible.info. <Link href="/sobre">Créditos completos</Link>
          </p>
        </aside>
      </div>
    </main>
  );
}
