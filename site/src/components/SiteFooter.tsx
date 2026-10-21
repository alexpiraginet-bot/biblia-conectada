import Link from "next/link";
import { credits } from "@/lib/data";
import { getTranslation } from "@/lib/translations";

// Credits required by CLAUDE.md rule 2, in the exact words of ATTRIBUTION.md (the BLIVRE line is read from that
// file by the data pipeline). The full text is on /sobre.
export function SiteFooter() {
  return (
    <footer className="bc-footer site-footer">
      <p>O nome da edição acompanha a leitura. <Link href="/ler/open-nbv">Ler Open Nova Bíblia Viva</Link> · <Link href="/ler">Ler Bíblia Livre</Link>.</p>
      <p><strong>Nas páginas da Bíblia Livre:</strong> {credits.blivreCredit}</p>
      <p><strong>Nas páginas Open Nova Bíblia Viva:</strong> {getTranslation("open-nbv")!.credit} <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>. Texto sem alterações.</p>
      <p>
        Referências cruzadas: <a href="https://www.openbible.info/labs/cross-references/">OpenBible.info</a> (CC BY)
        {" · "}
        <Link href="/sobre">Sobre e créditos completos</Link>
        {" · "}
        <Link href="/dados">Dados abertos</Link>
        {" · "}
        <Link href="/sobre#instalar">Instalar no iPhone</Link>
        {" · "}
        <a href="https://github.com/alexpiraginet-bot/biblia-conectada">Código-fonte</a>
      </p>
    </footer>
  );
}
