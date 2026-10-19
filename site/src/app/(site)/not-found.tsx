import { NotFoundBody } from "@/components/NotFoundBody";

// The 404 page for a reading route whose segments name no page ("/x", "/genesis/51"). Its title comes from the
// routes' generateMetadata (NOT_FOUND_TITLE); the shell comes from the root layout.
export default function NotFound() {
  return <NotFoundBody />;
}
