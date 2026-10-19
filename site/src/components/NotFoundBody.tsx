import Link from "next/link";
import { summary } from "@/lib/data";
import styles from "./NotFoundBody.module.css";

/** Title of the 404 page, also set by the reading routes' metadata when their segments name no page. */
export const NOT_FOUND_TITLE = "Página não encontrada";

// Body of the 404 page (src/app/not-found.tsx and src/app/(site)/not-found.tsx), for any address that names no page.
// Loose references never get here: src/lib/missing.ts sends them to their page first.
export function NotFoundBody() {
  const top = summary.topVerses[0];
  const ways = [
    { href: "/ler", title: "Livros", text: "Escolha um livro e depois um capítulo." },
    { href: top.path, title: top.ref, text: "O versículo com mais ligações." },
    { href: "/arcos", title: "Céu de ligações", text: "Todas as referências cruzadas num só céu." },
    { href: "/", title: "Início", text: "A capa da Bíblia Conectada." },
  ];
  return (
    <main id="conteudo" className={styles.main}>
      <svg className={styles.mark} viewBox="0 0 120 48" aria-hidden="true" focusable="false">
        <path d="M8 42a52 52 0 0 1 64-30" pathLength="1" className={styles.arc} />
        <circle cx="8" cy="42" r="3" className={styles.dot} />
        <circle cx="112" cy="42" r="3" className={styles.dotOpen} />
        <path d="M2 42h116" className={styles.base} />
      </svg>
      <p className="kicker">Erro 404</p>
      <h1 className={styles.title}>Esta página não existe</h1>
      <p className={styles.lede}>
        O endereço pode ter um erro de digitação ou levar a uma página que ainda não foi publicada. Para abrir uma
        passagem, escreva a referência na busca, como “Jo 3:16”, ou siga por um destes caminhos:
      </p>
      <ul className={styles.ways}>
        {ways.map((w) => (
          <li key={w.href}>
            <Link href={w.href} className={styles.way}>
              <span className={styles.wayTitle}>{w.title}</span>
              <span className={styles.wayText}>{w.text}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
