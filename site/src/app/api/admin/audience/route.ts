import { cookies } from "next/headers";
import { audienceConfig, audienceReportResponse } from "@/lib/audience/server";
export const maxDuration = 10;
export async function GET(request: Request) {
  const config = audienceConfig();
  return audienceReportResponse(request, config ? (await cookies()).get(config.cookieName)?.value : undefined, { config });
}
