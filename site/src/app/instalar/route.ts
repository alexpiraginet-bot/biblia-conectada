import { installPageHtml } from "@/lib/install-page";

// Cache Components prerenders this pure GET: no request, network or runtime APIs.
// A Route Handler deliberately bypasses the React layout and its client bundles.
export function GET() {
  return new Response(installPageHtml(), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
