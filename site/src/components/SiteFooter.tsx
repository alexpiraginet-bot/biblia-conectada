import Link from "next/link";
import { credits } from "@/lib/data";
import styles from "./SiteFooter.module.css";

// Credits required by CLAUDE.md rule 2, in the exact words of ATTRIBUTION.md (the BLIVRE line is read from that
// file by the data pipeline). The full text is on /sobre.
export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <p>{credits.blivreCredit}</p>
      <p>
        Referências cruzadas: <a href="https://www.openbible.info/labs/cross-references/">OpenBible.info</a> (CC BY)
      </p>
      <p>
        <Link href="/sobre">Sobre e créditos completos</Link>
        {" · "}
        <Link href="/dados">Dados abertos</Link>
        {" · "}
        <a href="https://github.com/alexpiraginet-bot/biblia-conectada">Código-fonte</a>
      </p>
    </footer>
  );
}
