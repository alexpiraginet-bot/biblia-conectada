import { adminSecurity } from "@/lib/audience/admin-security";
export const maxDuration = 15;
export const GET = (request: Request) => adminSecurity(request);
