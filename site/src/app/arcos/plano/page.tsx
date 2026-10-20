import type { Metadata } from "next";
import Link from "next/link";
import { skyInitial } from "@/components/sky/initial";
import { INTRO_SCRIPT } from "@/components/sky/poster";
import { Sky } from "@/components/sky/Sky";
import { formatInt } from "@/lib/canon/text";
import { summary } from "@/lib/data";
import styles from "../page.module.css";

// /arcos/plano: the sky of links in 2D (design/README.md §1, §1.2, §6, §7), a window of night sky in the page column, as
// in video 1. The 3D sculpture at /arcos links here, and this page is what a device without a real GPU keeps: its
// poster images and lists work without WebGL. Every number below comes from src/data/generated/summary.json and
// public/data/sky.json (scripts/build-data.ts); scripts/check-dist.ts checks them in the built HTML.
const c = summary.counts;

export const metadata: Metadata = {
  title: "Céu de ligações em 2D",
  description: `Os ${formatInt(c.arcs)} pares de versículos ligados pelas referências cruzadas da OpenBible.info, como arcos sobre a Bíblia inteira, de Gênesis a Apocalipse.`,
};

export default async function ArcosPlano() {
  const initial = await skyInitial();
  const top = summary.topVerses[0];

  return (
    <main id="conteudo" className={`site-page ${styles.main}`}>
      <script dangerouslySetInnerHTML={{ __html: INTRO_SCRIPT }} />
      <Sky
        initial={initial}
        title="Céu de ligações em 2D"
        lede={
          <>
            São {formatInt(c.verses)} versículos e {formatInt(c.crossrefRows)} referências cruzadas, que ligam{" "}
            {formatInt(c.arcs)} pares de versículos diferentes. Cada arco é um par; o versículo com mais ligações é{" "}
            {top.ref}, com {formatInt(top.links)}. <Link href="/arcos">Ver a escultura em 3D</Link>
          </>
        }
      />
    </main>
  );
}
