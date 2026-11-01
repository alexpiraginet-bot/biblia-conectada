import { audienceLogin, audienceLogout } from "@/lib/audience/server";
export const maxDuration = 30;
export function POST(request: Request) { return audienceLogin(request); }
export const DELETE = (request: Request) => audienceLogout(request);
