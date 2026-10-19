"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { currentItem, NAV } from "./nav";

// Links of the main navigation with aria-current on the section of the page (design §5).
export function NavLinks({ variant }: { variant: "top" | "bar" }) {
  const current = currentItem(usePathname());
  const items = variant === "bar" ? NAV.filter((n) => n.bar) : NAV;
  return (
    <ul className={`nav-list nav-list--${variant}`}>
      {items.map((n) => (
        <li key={n.href}>
          <Link href={n.href} aria-current={current === n.href ? "page" : undefined}>
            {variant === "bar" && <span className={`i ${n.icon}`} aria-hidden="true" />}
            <span>{n.label}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
