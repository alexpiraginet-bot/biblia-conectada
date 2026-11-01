import { adminPasskeyOptions } from "@/lib/audience/admin-passkeys";
export const maxDuration = 30;
export const POST = (request: Request) => adminPasskeyOptions(request);
