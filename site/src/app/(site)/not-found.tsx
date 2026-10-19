import { NotFoundBody } from "@/components/NotFoundBody";

// The 404 page for a reading route whose segments name no page ("/x", "/genesis/51"). It renders inside this group's
// layout, which already has the header. Its title comes from the routes' generateMetadata (NOT_FOUND_TITLE).
export default function NotFound() {
  return <NotFoundBody />;
}
