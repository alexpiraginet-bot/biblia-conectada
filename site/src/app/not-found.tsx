import type { Metadata } from "next";
import { NotFoundBody } from "@/components/NotFoundBody";
import { NOT_FOUND_TITLE } from "@/lib/missing";

export const metadata: Metadata = { title: NOT_FOUND_TITLE };

// The 404 page for addresses that match no route ("/a/b/c/d/e"). It replaces Next.js's default, which is in English
// and ignores the theme. The shell (header, footer) comes from the root layout.
export default function NotFound() {
  return <NotFoundBody />;
}
