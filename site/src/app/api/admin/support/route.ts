import { supportAdminGet, supportAdminPost } from "@/lib/support/server";
export const maxDuration = 30;
export async function GET(request: Request) { return supportAdminGet(request); }
export async function POST(request: Request) { return supportAdminPost(request); }
