import { connection } from "next/server";
import { getDailyLiturgy } from "@/lib/liturgy/service";

export const maxDuration = 15;

export async function GET(request: Request) {
  await connection();
  const query = new URL(request.url).searchParams;
  const dates = query.getAll("date"), editions = query.getAll("edition");
  const result = await getDailyLiturgy(dates.length > 1 ? "" : dates[0], editions.length > 1 ? editions : editions[0]);
  return Response.json(result, {
    status: result.ok ? 200 : result.code === "unavailable" ? 503 : 400,
    headers: { "Cache-Control": "no-store, max-age=0", "X-Content-Type-Options": "nosniff" },
  });
}
