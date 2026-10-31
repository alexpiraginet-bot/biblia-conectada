import { connection } from "next/server";
import { getDailyLiturgy } from "@/lib/liturgy/service";

export const maxDuration = 15;

export async function GET(request: Request) {
  await connection();
  const dates = new URL(request.url).searchParams.getAll("date");
  const result = await getDailyLiturgy(dates.length > 1 ? "" : dates[0]);
  return Response.json(result, {
    status: result.ok ? 200 : result.code === "invalid-date" ? 400 : 503,
    headers: { "Cache-Control": "no-store, max-age=0", "X-Content-Type-Options": "nosniff" },
  });
}
