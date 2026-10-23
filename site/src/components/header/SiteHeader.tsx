import Link from "next/link";
import { SearchButton } from "@/components/search/SearchButton";
import { Appearance } from "./Appearance";
import { ArcMark } from "./ArcMark";

// The top bar (ds.css .bc-topbar): the brand, the search box (an icon on phones) and the appearance menu. The sections
// are in the rail and the tab bar (src/components/shell/NavLinks.tsx).
export function SiteHeader() {
  return (
    <header className="bc-topbar site-topbar">
      <Link href="/" className="bc-brand">
        <ArcMark />
        <span>Bíblia Conectada</span>
      </Link>
      <nav className="site-topbar__nav" aria-label="Descubra a Bíblia">
        <Link href="/#descobrir">Descobrir</Link>
        <Link href="/caminhos">Mapa de Jesus</Link>
        <Link href="/cronologia">Cronologia</Link>
        <Link href="/coracao" prefetch={false}>No seu coração</Link>
        <Link href="/#sua-jornada">Minha jornada <span aria-hidden="true">✦</span></Link>
      </nav>
      <SearchButton />
      <Appearance />
    </header>
  );
}
