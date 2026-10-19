import Link from "next/link";
import "./header.css";
import { ArcMark } from "./ArcMark";
import { RefSearch } from "./RefSearch";
import { ThemeToggle } from "./ThemeToggle";

export function SiteHeader({ overlay = false }: { overlay?: boolean }) {
  return (
    <header className={overlay ? "site-header site-header--overlay" : "site-header"}>
      <div className="site-header__inner">
        <Link href="/" className="brand">
          <ArcMark />
          <span>Bíblia Conectada</span>
        </Link>
        <RefSearch />
        <nav aria-label="Principal" className="site-nav">
          <Link href="/ler">Ler</Link>
        </nav>
        <ThemeToggle />
      </div>
    </header>
  );
}
