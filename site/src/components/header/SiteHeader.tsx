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
      <SearchButton />
      <Appearance />
    </header>
  );
}
