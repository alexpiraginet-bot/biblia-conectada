// What a reading route does when its segments name no page: a loose address (src/lib/canon/loose.ts) is sent to its
// canonical page, anything else gets the 404 page (src/app/not-found.tsx). Server components only.
import { notFound, redirect } from "next/navigation";
import { createLoosePathResolver } from "@/lib/canon/loose";
import { books } from "@/lib/data";

const loosePath = createLoosePathResolver(books);

/** Title of the 404 page; the reading routes' metadata uses it too when their segments name no page. */
export const NOT_FOUND_TITLE = "Página não encontrada";

export function missingPage(segments: readonly string[]): never {
  const to = loosePath(segments);
  if (to && to !== `/${segments.join("/")}`) redirect(to);
  notFound();
}
