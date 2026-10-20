import Link from "next/link";
import { Icon } from "@/components/icons";

export type Crumb = { label: React.ReactNode; href?: string };

/**
 * The trail to a page (design system .bc-crumbs): "Livros › Profetas › Isaías". Each step is a link; a step without
 * one is the page itself (aria-current). Between steps, the icon family's chevron, hidden from assistive technology,
 * never a typed "›".
 */
export function Crumbs({ items, label, className }: { items: Crumb[]; label: string; className?: string }) {
  return (
    <nav aria-label={label} className={className}>
      <ol className="bc-crumbs">
        {items.map((c, i) => (
          <li key={i} aria-current={c.href ? undefined : "page"}>
            {i > 0 && <Icon name="chev-r" className="bc-icon bc-crumbs__sep" />}
            {c.href ? <Link href={c.href}>{c.label}</Link> : c.label}
          </li>
        ))}
      </ol>
    </nav>
  );
}
