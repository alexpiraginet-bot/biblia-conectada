import { shareMetadata } from "@/lib/share-metadata";
import type { Metadata } from "next";
import Link from "next/link";
import { AncientJourneyMap } from "@/components/journey/AncientJourneyMap";
import { jesusJourney } from "@/lib/caminhos";
import styles from "./caminhos.module.css";

export const metadata: Metadata = shareMetadata({
    title: "Pelos caminhos de Jesus",
    description: "Uma jornada ilustrada pelos lugares dos evangelhos. Explore o mapa, leia o texto bíblico e descubra como cada passagem se conecta a outras.",
    path: "/caminhos",
  });
export const ensureStatic = "navigation";

export default async function CaminhosPage() {
  const data = await jesusJourney();
  return <main id="conteudo" className={`site-page ${styles.page}`}>
    <header className={styles.intro}>
      <div><Link href="/cronologia" className={styles.back}>A Bíblia em uma grande história</Link><h1>Pelos caminhos<br />de <em>Jesus.</em></h1></div>
      <p>Uma cidade. Um encontro. Uma nova descoberta.<br />Toque no mapa e acompanhe os evangelhos, de Belém a Jerusalém, uma parada de cada vez.</p>
    </header>
    <AncientJourneyMap data={data} />
    <section className={styles.sources} aria-labelledby="fontes-caminhos">
      <div><h2 id="fontes-caminhos">Um mapa para ler.<br />Fontes para ir além.</h2><p>Esta jornada reúne {data.stops.length} episódios. Os evangelhos contam muito mais viagens e encontros; esta seleção não representa todos eles.</p></div>
      <div className={styles.sourceNotes}>
        <p><strong>Lugares.</strong> Pontos da <a href="https://www.openbible.info/geo/" target="_blank" rel="noreferrer">OpenBible.info</a> (CC BY 4.0), com desenho geográfico simplificado. Caná tem localizações propostas; o ponto do Jordão representa a tradição de Betânia além do Jordão, também documentada pela <a href="https://whc.unesco.org/en/list/1446/" target="_blank" rel="noreferrer">UNESCO</a>. Não são coordenadas comprovadas de cada acontecimento.</p>
        <p><strong>Tempo.</strong> Datas aproximadas da cronologia usada pelo <a href="https://github.com/robertrouse/theographic-bible-metadata/blob/master/docs/chronology-and-dates.md" target="_blank" rel="noreferrer">Theographic</a>, baseada em F. N. Jones (CC BY-SA 4.0). Outras cronologias divergem. A ordem aqui é uma organização de leitura dos relatos.</p>
        <p><strong>Texto e ligações.</strong> Bíblia Livre, sem adaptação dos versículos (CC BY 4.0). As conexões vêm das referências cruzadas da OpenBible.info; votos indicam a avaliação dos colaboradores da base. Os resumos são editoriais e os desenhos são recriações, não registros históricos.</p>
        <Link href="/sobre">Créditos completos e licenças</Link>
      </div>
    </section>
  </main>;
}
