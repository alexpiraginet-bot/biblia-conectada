import type { Metadata } from "next";
import { DeviceNote } from "@/components/community/DeviceNote";
import { PonteArchive } from "@/components/community/PonteArchive";
import { PontePlayer } from "@/components/community/PontePlayer";
import styles from "@/components/community/community.module.css";
import { scripture } from "@/components/community/scripture-font";
import { ponteBuilt } from "@/lib/community/data";

export const ensureStatic = "navigation";

export const metadata: Metadata = {
  title: "Ponte",
  description:
    "Um par de versículos por dia, o mesmo para todo mundo: vá de um ao outro só pelas referências cruzadas, lendo cada salto. Sem conta e sem placar.",
  alternates: { canonical: "/ponte" },
};

// The page is the same file every day: this device picks today's bridge from the São Paulo date.
export default function PontePage() {
  return (
    <main id="conteudo" className={`${styles.page} ${scripture.variable}`}>
      <div className={styles.column}>
        <h1 className={styles.title}>Ponte</h1>
        <p className={styles.lede}>
          Um par de versículos por dia, o mesmo para todo mundo. Você vai de um ao outro só pelas referências cruzadas,
          lendo cada versículo do caminho. As ligações vêm de leitores da OpenBible.info, não de uma doutrina.
        </p>
      </div>
      <section className={styles.column} aria-label="Ponte de hoje">
        <PontePlayer builtThrough={ponteBuilt.builtThrough} />
      </section>
      <section className={`${styles.section} ${styles.column}`} aria-labelledby="titulo-arquivo">
        <h2 id="titulo-arquivo" className={styles.h2}>
          Arquivo
        </h2>
        <PonteArchive
          built={ponteBuilt.bridges.map((b) => ({ n: b.n, date: b.date, start: b.start, target: b.target, min: b.min }))}
          builtThrough={ponteBuilt.builtThrough}
        />
      </section>
      <div className={styles.column}>
        <DeviceNote />
      </div>
    </main>
  );
}
