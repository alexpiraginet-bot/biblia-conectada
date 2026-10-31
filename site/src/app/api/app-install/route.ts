import { connection } from "next/server";
import { nativeAppLinks } from "@/lib/native-apps";

export async function GET() {
  await connection();
  return Response.json(nativeAppLinks(), {
    headers: { "Cache-Control": "no-store, max-age=0", "X-Content-Type-Options": "nosniff" },
  });
}
