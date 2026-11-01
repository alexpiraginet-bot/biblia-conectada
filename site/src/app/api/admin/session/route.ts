import { audienceLogin, audienceLogout } from "@/lib/audience/server";
export const maxDuration = 10;
export function POST(request: Request) { return audienceLogin(request); }
export const DELETE = audienceLogout;
