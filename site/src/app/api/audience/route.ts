import { collectAudience } from "@/lib/audience/server";
export const maxDuration = 10;
export function POST(request: Request) { return collectAudience(request); }
