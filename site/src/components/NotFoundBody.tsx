import Link from "next/link";
import { summary } from "@/lib/data";

// Body of the 404 page (src/app/not-found.tsx and src/app/(site)/not-found.tsx), for any address that names no page.
// Loose references never get here: src/lib/missing.ts sends them to their page first. Its styles are in globals.css
// (.not-found): the 404 tree travels with every page, so a stylesheet of its own would be loaded by all of them.
export function NotFoundBody() {
  const top = summary.topVerses[0];
  const ways = [
    { href: "/ler", title: "Livros", text: "Escolha um livro e depois um capítulo." },
    { href: top.path, title: top.ref, text: "O versículo com mais ligações." },
    { href: "/arcos", title: "Céu de ligações", text: "As referências cruzadas como arcos sobre a Bíblia inteira." },
    { href: "/", title: "Início", text: "A capa da Bíblia Conectada." },
  ];
  return (
    <main id="conteudo" className="not-found">
      <svg className="not-found__mark" viewBox="0 0 120 48" aria-hidden="true" focusable="false">
        <path className="not-found__arc" d="M8 42a52 52 0 0 1 64-30" />
        <circle className="not-found__from" cx="8" cy="42" r="3" />
        <circle className="not-found__to" cx="112" cy="42" r="3" />
        <path className="not-found__base" d="M2 42h116" />
      </svg>
      <p className="kicker">Erro 404</p>
      <h1 className="not-found__title">Esta página não existe</h1>
      <p className="not-found__lede">
        O endereço pode ter um erro de digitação ou levar a uma página que ainda não foi publicada. Para abrir uma
        passagem, escreva a referência na busca, como “Jo 3:16”, ou siga por um destes caminhos:
      </p>
      <ul className="not-found__ways">
        {ways.map((w) => (
          <li key={w.href}>
            <Link href={w.href} className="not-found__way">
              <span className="not-found__name">{w.title}</span>
              <span className="not-found__note">{w.text}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
