import localFont from "next/font/local";
import Link from "next/link";
import { formatInt } from "@/lib/canon/text";
import { summary, verseText } from "@/lib/data";
import styles from "./page.module.css";

// Cormorant Italic: the only role the serif has in the videos (highlighted quotation). Declared here, not in the
// root layout, so other routes do not preload it.
const quoteFace = localFont({
  src: "../fonts/Cormorant-Italic-VF.woff2",
  style: "italic",
  weight: "300 700",
  display: "swap",
  adjustFontFallback: "Times New Roman",
});

// Phase 0 placeholder. Every number below comes from src/data/generated/summary.json (scripts/build-data.ts).
export default async function Home() {
  const top = summary.topVerses[0];
  const [, slug, chapter, verse] = top.path.split("/");
  const text = await verseText(slug, Number(chapter), Number(verse));
  const c = summary.counts;

  return (
    <main id="conteudo" className={styles.main}>
      <h1 className={styles.title}>Bíblia Conectada</h1>
      <p className={styles.lede}>
        Um mapa das ligações da Bíblia para abrir um versículo e seguir aonde ele leva. Em português, feito só com fontes
        livres.
      </p>

      <p>
        São {formatInt(c.verses)} versículos e {formatInt(c.pairs)} pares de versículos ligados por referências cruzadas. O
        versículo com mais ligações é {top.ref}, com {formatInt(top.links)}:
      </p>
      <blockquote className={`${styles.verse} ${quoteFace.className}`}>
        <p>{text}</p>
        <footer>
          {top.ref} · BLIVRE
        </footer>
      </blockquote>
      <p className={styles.note}>
        &ldquo;Ligações&rdquo; aqui são os outros versículos que a base OpenBible.info relaciona a este, contados uma vez
        cada, com qualquer número de votos.
      </p>

      <p>
        O site está em construção. Primeiro vem a leitura, com as ligações de cada versículo; depois o céu de ligações, o
        grafo e o mapa. <Link href="/sobre">Veja as fontes e os créditos</Link>.
      </p>
    </main>
  );
}
