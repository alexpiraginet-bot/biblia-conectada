import { cookies } from "next/headers";
import { journeyConfig } from "@/lib/rewards/config";
import { JOURNEY_TTL_SECONDS } from "@/lib/rewards/rules";
import { handleJourney } from "@/lib/rewards/service";

export const maxDuration = 15;

async function respond(request: Request) {
  const config = journeyConfig();
  const cookieStore = await cookies();
  const result = await handleJourney(request, config ? cookieStore.get(config.cookieName)?.value : undefined, { config });
  if (result.cookie) {
    cookieStore.set(result.cookie.name, "clear" in result.cookie ? "" : result.cookie.value, {
      httpOnly: true, secure: true, sameSite: "lax", path: "/",
      maxAge: "clear" in result.cookie ? 0 : JOURNEY_TTL_SECONDS,
    });
  }
  return Response.json(result.body, {
    status: result.status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0", "X-Content-Type-Options": "nosniff", "Vary": "Cookie",
      ...(result.body.retryAfterSeconds ? { "Retry-After": String(result.body.retryAfterSeconds) } : {}),
    },
  });
}

export const GET = respond;
export const POST = respond;
