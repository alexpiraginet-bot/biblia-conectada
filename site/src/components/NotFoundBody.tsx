import Link from "next/link";
import { Icon } from "@/components/icons";
import { NotFoundSearch } from "@/components/NotFoundSearch";
import { summary } from "@/lib/data";

// Body of the 404 page (src/app/not-found.tsx and src/app/(site)/not-found.tsx), for any address that names no page.
// Loose references never get here: src/lib/missing.ts sends them to their page first. Its styles are in globals.css
// (.not-found): the 404 tree travels with every page, so a stylesheet of its own would be loaded by all of them. The
// ways out are a ruled list (ds.css .bc-list), the search first: it finds any verse, word or book.
export function NotFoundBody() {
  const top = summary.topVerses[0];
  const ways = [
    { href: "/ler", icon: "book", title: "Livros", text: "Escolha um livro e depois um capítulo." },
    { href: top.path, icon: "text", title: top.ref, text: "O versículo com mais ligações." },
    { href: "/arcos", icon: "arc", title: "Céu de ligações", text: "As referências cruzadas como arcos sobre a Bíblia inteira." },
    { href: "/", icon: "home", title: "Início", text: "A capa da Bíblia Conectada." },
  ] as const;
  return (
    <main id="conteudo" className="not-found">
      <svg className="not-found__mark" viewBox="0 0 120 48" aria-hidden="true" focusable="false">
        <path className="not-found__arc" d="M8 42a52 52 0 0 1 64-30" />
        <circle className="not-found__from" cx="8" cy="42" r="3" />
        <circle className="not-found__to" cx="112" cy="42" r="3" />
        <path className="not-found__base" d="M2 42h116" />
      </svg>
      <h1 className="bc-display">Esta página não existe</h1>
      <p className="bc-lede not-found__lede">
        O endereço pode ter um erro de digitação ou levar a uma página que ainda não foi publicada. Para abrir uma
        passagem, escreva a referência na busca, como “Jo 3:16”, ou siga por um destes caminhos:
      </p>
      <ul className="bc-list not-found__ways">
        <li>
          <NotFoundSearch />
        </li>
        {ways.map((w) => (
          <li key={w.href}>
            <Link href={w.href} className="not-found__way">
              <Icon name={w.icon} />
              <span className="not-found__text">
                <span className="bc-list__name">{w.title}</span>
                <span className="not-found__note">{w.text}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
