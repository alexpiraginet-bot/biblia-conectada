import { connection } from "next/server";
import { androidAppAssociation, ASSOCIATION_HEADERS } from "@/lib/app-associations";

export async function GET() {
  await connection();
  return Response.json(androidAppAssociation(), { headers: ASSOCIATION_HEADERS });
}
