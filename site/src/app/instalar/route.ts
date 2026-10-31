import { installPageHtml } from "@/lib/install-page";
import { nativeAppLinks } from "@/lib/native-apps";

// Request-specific return paths remain in a complete HTML document, without the React shell.
export function GET(request?: Request) {
  const next = request ? new URL(request.url).searchParams.get("next") : null;
  return new Response(installPageHtml(next, nativeAppLinks()), {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store, max-age=0", "X-Content-Type-Options": "nosniff" },
  });
}
