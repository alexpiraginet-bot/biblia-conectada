import { giftsAdminGet, giftsAdminPost } from "@/lib/support/gifts-server";
export const maxDuration = 30;
export async function GET(request: Request) { return giftsAdminGet(request); }
export async function POST(request: Request) { return giftsAdminPost(request); }
