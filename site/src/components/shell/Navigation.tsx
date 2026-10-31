import Link from "next/link";
import { Icon } from "@/components/icons";
import { MENU_GROUPS, NAV, type NavItem } from "./nav";
import { NavigationState } from "./NavLinks";

function Item({ item, rail = false }: { item: NavItem; rail?: boolean }) {
  if (item.href === "/qr" || item.href === "/instalar") return <a href={item.href} className="site-tabbar__menu-link" data-page-action={item.href}>
    <Icon name={item.icon} /><span>{item.label}<small>{item.description}</small></span>
  </a>;
  return <Link href={item.href} prefetch={false} className={rail ? "bc-rail__item" : "site-tabbar__menu-link"} data-nav-href={item.href}>
    <Icon name={item.icon} /><span>{item.label}{!rail && <small>{item.description}</small>}</span>
  </Link>;
}

export function SectionRail() {
  return <NavigationState>{NAV.filter((item) => item.rail).map((item) => <Item key={item.href} item={item} rail />)}</NavigationState>;
}

/** The native disclosure works before hydration and when JavaScript is disabled. */
export function TabBar() {
  return <NavigationState floating>
    <details className="site-tabbar__more">
      <summary className="site-tabbar__trigger" aria-label="Abrir menu de todas as áreas">
        <span className="site-tabbar__mark"><Icon name="menu" /></span><span>Menu</span><span className="site-tabbar__trigger-close" aria-hidden="true"><Icon name="close" /></span>
      </summary>
      <div className="site-tabbar__veil" aria-hidden="true" />
      <div className="site-tabbar__menu" aria-label="Todas as áreas da Bíblia Conectada" tabIndex={-1}>
        <div className="site-tabbar__menu-heading"><div><p>Bíblia Conectada</p><span>Explore as áreas. Deslize para ver mais.</span></div><button type="button" data-menu-close aria-label="Fechar menu"><Icon name="close" /></button></div>
        <div className="site-tabbar__menu-content">
          {MENU_GROUPS.map((group) => <section key={group} className="site-tabbar__group" aria-label={group}>
            <h2>{group}</h2><div className="site-tabbar__menu-grid">{NAV.filter((item) => item.group === group).map((item) => <Item key={item.href} item={item} />)}</div>
          </section>)}
        </div>
      </div>
    </details>
  </NavigationState>;
}
