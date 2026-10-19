import type { Metadata } from "next";
import { SiteHeader } from "@/components/header/SiteHeader";
import { skyInitial } from "@/components/sky/initial";
import { INTRO_SCRIPT } from "@/components/sky/poster";
import { Sky } from "@/components/sky/Sky";
import { formatInt } from "@/lib/canon/text";
import { summary } from "@/lib/data";
import styles from "./page.module.css";

// /arcos: the sky of links (design/README.md §1, §6, §7). Outside the (site) group on purpose: the header floats over
// the night ground (SiteHeader overlay), so the first screen is the sky in both themes. Every number below comes from
// src/data/generated/summary.json and public/data/sky.json (scripts/build-data.ts); scripts/check-dist.ts checks them
// in the built HTML.
const c = summary.counts;

export const metadata: Metadata = {
  title: "Céu de ligações",
  description: `Os ${formatInt(c.arcs)} pares de versículos ligados pelas referências cruzadas da OpenBible.info, como arcos sobre a Bíblia inteira, de Gênesis a Apocalipse.`,
};

export default async function Arcos() {
  const initial = await skyInitial();
  const top = summary.topVerses[0];

  return (
    <>
      <SiteHeader overlay />
      <main id="conteudo" className={styles.main}>
        <script dangerouslySetInnerHTML={{ __html: INTRO_SCRIPT }} />
        <Sky
          initial={initial}
          title="Céu de ligações"
          lede={
            <>
              São {formatInt(c.verses)} versículos e {formatInt(c.crossrefRows)} referências cruzadas, que ligam{" "}
              {formatInt(c.arcs)} pares de versículos diferentes. Cada arco é um par; o versículo com mais ligações é{" "}
              {top.ref}, com {formatInt(top.links)}.
            </>
          }
        />
      </main>
    </>
  );
}
