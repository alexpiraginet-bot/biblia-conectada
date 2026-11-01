import { removeAdminPasskey } from "@/lib/audience/admin-security";
export const maxDuration = 30;
export const DELETE = (request: Request) => removeAdminPasskey(request);
