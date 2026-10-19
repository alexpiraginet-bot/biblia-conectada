import type { Metadata } from "next";
import { SiteHeader } from "@/components/header/SiteHeader";
import { NOT_FOUND_TITLE, NotFoundBody } from "@/components/NotFoundBody";

export const metadata: Metadata = { title: NOT_FOUND_TITLE };

// The 404 page for addresses that match no route ("/a/b/c/d/e"). It replaces Next.js's default, which is in English
// and ignores the Noite/Dia theme. It renders in the root layout, without the route group's, so it brings the header.
export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <NotFoundBody />
    </>
  );
}
