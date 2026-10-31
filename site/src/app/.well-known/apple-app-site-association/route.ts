import { connection } from "next/server";
import { appleAppAssociation, ASSOCIATION_HEADERS } from "@/lib/app-associations";

export async function GET() {
  await connection();
  return Response.json(appleAppAssociation(), { headers: ASSOCIATION_HEADERS });
}
